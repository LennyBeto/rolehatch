# backend/app/api/routes/wallet.py  (replaces the Stripe version)
import hmac
import logging
import uuid
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import get_current_user
from app.db.session import get_db
from app.models.wallet import Wallet, WalletTransaction
from app.schemas.wallet import DepositIn, WithdrawIn
from app.services import mpesa

logger = logging.getLogger("perchrole.wallet")
router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

ACK = {"ResultCode": 0, "ResultDesc": "Accepted"}


# ── helpers ──────────────────────────────────────────────
def _get_or_create_wallet(db: Session, user_id: UUID, lock: bool = False) -> Wallet:
    db.execute(
        pg_insert(Wallet)
        .values(id=uuid.uuid4(), user_id=user_id)
        .on_conflict_do_nothing(index_elements=["user_id"])
    )
    q = select(Wallet).where(Wallet.user_id == user_id)
    if lock:
        q = q.with_for_update()
    return db.execute(q).scalar_one()


def _verify_callback_token(token: str) -> None:
    # Daraja callbacks are unsigned, so a secret in the URL is the gate.
    if not settings.mpesa_callback_secret or not hmac.compare_digest(token, settings.mpesa_callback_secret):
        raise HTTPException(403, "Forbidden")


def _restore_withdrawal(db: Session, tx_id: UUID) -> None:
    """Return a still-pending withdrawal's amount to the wallet (idempotent)."""
    tx = db.execute(
        select(WalletTransaction).where(WalletTransaction.id == tx_id).with_for_update()
    ).scalar_one_or_none()
    if not tx or tx.type != "withdrawal" or tx.status != "pending":
        return
    wallet = db.execute(select(Wallet).where(Wallet.id == tx.wallet_id).with_for_update()).scalar_one()
    wallet.balance += tx.amount
    tx.status = "failed"
    db.commit()


def _mask(phone: str | None) -> str | None:
    return f"{phone[:5]}•••{phone[-3:]}" if phone else None


# ── user endpoints ───────────────────────────────────────
@router.get("")
def get_wallet(user=Depends(get_current_user), db: Session = Depends(get_db)):
    wallet = _get_or_create_wallet(db, UUID(user["sub"]))
    db.commit()
    txs = (
        db.query(WalletTransaction)
        .filter_by(wallet_id=wallet.id)
        .order_by(WalletTransaction.created_at.desc())
        .limit(50)
        .all()
    )
    return {
        "balance": wallet.balance,
        "currency": wallet.currency,
        "phone_masked": _mask(wallet.phone),
        "transactions": [
            {
                "id": str(t.id), "type": t.type, "amount": t.amount, "status": t.status,
                "receipt": t.mpesa_receipt, "created_at": t.created_at.isoformat(),
            }
            for t in txs
        ],
    }


@router.post("/deposit")
@limiter.limit("5/minute")
def create_deposit(
    request: Request,
    payload: DepositIn,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        phone = mpesa.normalize_phone(payload.phone)
    except ValueError as e:
        raise HTTPException(400, str(e))

    wallet = _get_or_create_wallet(db, UUID(user["sub"]))
    tx = WalletTransaction(wallet_id=wallet.id, type="deposit", amount=payload.amount, status="pending", phone=phone)
    db.add(tx)
    db.commit()
    db.refresh(tx)

    try:
        tx.checkout_request_id = mpesa.stk_push(phone, payload.amount, reference=f"WLT{str(tx.id)[:8]}")
        db.commit()
    except mpesa.MpesaError as e:
        logger.exception("STK push failed for tx %s", tx.id)
        tx.status = "failed"
        db.commit()
        raise HTTPException(502, f"Couldn't start M-Pesa payment: {e}")
    return {"ok": True, "message": "Check your phone and enter your M-Pesa PIN"}


@router.post("/withdraw")
@limiter.limit("5/minute")
def create_withdrawal(
    request: Request,
    payload: WithdrawIn,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    wallet = _get_or_create_wallet(db, UUID(user["sub"]), lock=True)
    if not wallet.phone:
        raise HTTPException(400, "Make a deposit first — withdrawals go to the M-Pesa number you deposit from")
    if wallet.balance < payload.amount:
        raise HTTPException(400, "Insufficient balance")

    # Debit first, under the row lock, so concurrent requests can't double-spend.
    wallet.balance -= payload.amount
    tx = WalletTransaction(
        wallet_id=wallet.id, type="withdrawal", amount=payload.amount,
        status="pending", phone=wallet.phone,
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)

    try:
        mpesa.b2c_payout(str(tx.id), wallet.phone, payload.amount)
    except mpesa.MpesaError:
        logger.exception("B2C request failed for tx %s", tx.id)
        _restore_withdrawal(db, tx.id)
        raise HTTPException(502, "Withdrawal failed — your balance was restored")

    # Stays "pending" until Daraja posts the result callback.
    return {"ok": True, "message": "Withdrawal is being processed"}


# ── Daraja callbacks ─────────────────────────────────────
@router.post("/callbacks/stk")
async def stk_callback(request: Request, token: str = Query(""), db: Session = Depends(get_db)):
    _verify_callback_token(token)
    try:
        cb = (await request.json())["Body"]["stkCallback"]
        checkout_id = cb["CheckoutRequestID"]
        result_code = int(cb["ResultCode"])
    except (ValueError, KeyError, TypeError):
        return ACK

    tx = db.execute(
        select(WalletTransaction).where(WalletTransaction.checkout_request_id == checkout_id).with_for_update()
    ).scalar_one_or_none()
    if not tx or tx.type != "deposit" or tx.status != "pending":
        return ACK  # unknown or already processed — idempotent

    if result_code != 0:
        tx.status = "failed"
        db.commit()
        return ACK

    items = {i.get("Name"): i.get("Value") for i in (cb.get("CallbackMetadata") or {}).get("Item", [])}
    try:
        paid = int(float(items.get("Amount", 0)))
    except (TypeError, ValueError):
        paid = 0
    if paid != tx.amount:
        logger.error("Amount mismatch on tx %s: expected %s, got %s", tx.id, tx.amount, paid)
        return ACK  # left pending for manual review; never credit an unverified amount

    wallet = db.execute(select(Wallet).where(Wallet.id == tx.wallet_id).with_for_update()).scalar_one()
    wallet.balance += tx.amount
    if not wallet.phone:
        wallet.phone = tx.phone  # proven by a successful PIN-confirmed payment
    tx.status = "completed"
    tx.mpesa_receipt = items.get("MpesaReceiptNumber")
    db.commit()
    return ACK


@router.post("/callbacks/b2c-result")
async def b2c_result(request: Request, token: str = Query(""), db: Session = Depends(get_db)):
    _verify_callback_token(token)
    try:
        result = (await request.json())["Result"]
        tx_id = UUID(result["OriginatorConversationID"])
        result_code = int(result["ResultCode"])
    except (ValueError, KeyError, TypeError):
        return ACK

    if result_code != 0:
        _restore_withdrawal(db, tx_id)
        return ACK

    tx = db.execute(
        select(WalletTransaction).where(WalletTransaction.id == tx_id).with_for_update()
    ).scalar_one_or_none()
    if tx and tx.type == "withdrawal" and tx.status == "pending":
        tx.status = "completed"
        tx.mpesa_receipt = result.get("TransactionID")
        db.commit()
    return ACK


@router.post("/callbacks/b2c-timeout")
async def b2c_timeout(request: Request, token: str = Query("")):
    _verify_callback_token(token)
    # Outcome unknown: leave the withdrawal pending and reconcile manually.
    # Auto-restoring here could pay out twice if the money was in fact sent.
    logger.warning("B2C queue timeout: %s", await request.body())
    return ACK