# backend/app/api/routes/wallet.py  (M-Pesa + Paystack + PayPal + Bachs)
import hmac
import json
import logging
import uuid
from decimal import Decimal, InvalidOperation
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.concurrency import run_in_threadpool
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import get_current_user
from app.db.session import get_db
from app.models.wallet import Wallet, WalletTransaction
from app.schemas.wallet import DepositIn, BachsDepositIn, PaypalDepositIn, PaystackDepositIn, WithdrawIn
from app.services import mpesa, bachs, paypal, paystack, ats_quota, doc_quota

logger = logging.getLogger("perchrole.wallet")
router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

ACK = {"ResultCode": 0, "ResultDesc": "Accepted"}

PAYPAL_PREFIX = "PP-"
BACHS_PREFIX = "BCH-"


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


def _settle_paystack(db: Session, reference: str, data: dict) -> str:
    """Idempotent. Webhook and /verify both call this; the row lock + status check
    guarantee a reference credits the wallet at most once."""
    tx = db.execute(
        select(WalletTransaction)
        .where(WalletTransaction.checkout_request_id == reference, WalletTransaction.type == "deposit")
        .with_for_update()
    ).scalar_one_or_none()
    if not tx:
        logger.warning("Paystack reference %s has no matching transaction", reference)
        return "unknown"
    if tx.status == "completed":
        return "completed"

    status = data.get("status")
    if status == "success":
        # Paystack amounts are in the smallest unit (cents).
        if data.get("amount") != tx.amount * 100 or data.get("currency") != "KES":
            logger.error("Paystack amount/currency mismatch on tx %s: %s", tx.id, data)
            return "pending"  # never credit an unverified amount; left for manual review
        wallet = db.execute(select(Wallet).where(Wallet.id == tx.wallet_id).with_for_update()).scalar_one()
        wallet.balance += tx.amount
        tx.status = "completed"
        tx.mpesa_receipt = reference  # surfaces as the receipt in the transaction list
        db.commit()
        return "completed"

    if status in ("failed", "reversed"):
        if tx.status == "pending":
            tx.status = "failed"
            db.commit()
        return "failed"
    return "pending"  # abandoned / ongoing


def _paypal_tx(db: Session, order_id: str, lock: bool = False):
    q = select(WalletTransaction).where(
        WalletTransaction.checkout_request_id == f"{PAYPAL_PREFIX}{order_id}",
        WalletTransaction.type == "deposit",
    )
    if lock:
        q = q.with_for_update()
    return db.execute(q).scalar_one_or_none()


def _owned_paypal_tx(db: Session, user_id: str, order_id: str):
    wallet = _get_or_create_wallet(db, UUID(user_id))
    db.commit()
    tx = _paypal_tx(db, order_id)
    if not tx or tx.wallet_id != wallet.id:
        raise HTTPException(404, "Transaction not found")
    return tx


def _settle_paypal(db: Session, order_id: str, order: dict) -> str:
    """Idempotent. Capture endpoint and webhook both call this; the row lock + status
    check guarantee an order credits the wallet at most once."""
    tx = _paypal_tx(db, order_id, lock=True)
    if not tx:
        logger.warning("PayPal order %s has no matching transaction", order_id)
        return "unknown"
    if tx.status == "completed":
        return "completed"

    unit = (order.get("purchase_units") or [{}])[0]
    captures = (unit.get("payments") or {}).get("captures") or []
    cap = captures[0] if captures else {}
    cap_status = cap.get("status")

    if cap_status == "COMPLETED":
        # custom_id was set server-side at order creation as "<tx_id>:<usd_cents>".
        custom = cap.get("custom_id") or unit.get("custom_id") or ""
        try:
            tx_part, cents_part = custom.split(":")
            expected = Decimal(int(cents_part)) / 100
        except ValueError:
            logger.error("PayPal order %s has malformed custom_id %r", order_id, custom)
            return "pending"
        amount = cap.get("amount") or {}
        try:
            paid = Decimal(str(amount.get("value")))
        except InvalidOperation:
            paid = Decimal(-1)
        if tx_part != str(tx.id) or amount.get("currency_code") != "USD" or paid != expected:
            logger.error("PayPal amount/currency/tx mismatch on tx %s: %s", tx.id, cap)
            return "pending"  # never credit an unverified amount; left for manual review
        wallet = db.execute(select(Wallet).where(Wallet.id == tx.wallet_id).with_for_update()).scalar_one()
        wallet.balance += tx.amount
        tx.status = "completed"
        tx.mpesa_receipt = cap.get("id")  # PayPal capture ID shows as the receipt
        db.commit()
        return "completed"

    if cap_status in ("DECLINED", "FAILED") or order.get("status") == "VOIDED":
        if tx.status == "pending":
            tx.status = "failed"
            db.commit()
        return "failed"
    return "pending"


def _settle_bachs(db: Session, checkout_id: str, event_type: str, data: dict) -> str:
    """Idempotent: Bachs delivers at-least-once, and a customer may retry after a failed
    attempt on the same checkout — so the row lock + status check guarantee a checkout
    credits the wallet at most once, and a later success still credits a 'failed' row."""
    tx = db.execute(
        select(WalletTransaction)
        .where(
            WalletTransaction.checkout_request_id == f"{BACHS_PREFIX}{checkout_id}",
            WalletTransaction.type == "deposit",
        )
        .with_for_update()
    ).scalar_one_or_none()
    if not tx:
        logger.warning("Bachs checkout %s has no matching transaction", checkout_id)
        return "unknown"
    if tx.status == "completed":
        return "completed"

    if event_type == "collection.succeeded" and str(data.get("status") or "SUCCEEDED").upper() == "SUCCEEDED":
        wallet = db.execute(select(Wallet).where(Wallet.id == tx.wallet_id).with_for_update()).scalar_one()
        wallet.balance += tx.amount
        tx.status = "completed"
        tx.mpesa_receipt = data.get("charge_id")  # Bachs charge ID shows as the receipt
        db.commit()
        return "completed"

    if event_type in ("collection.failed", "checkout.expired"):
        if tx.status == "pending":
            tx.status = "failed"
            db.commit()
        return "failed"

    if event_type == "collection.underpaid":
        logger.error("Bachs underpayment on tx %s: %s", tx.id, data)  # never credited; manual review
    return "pending"


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


# ── Paystack (card / bank deposits + ATS scan packs) ─────
@router.post("/paystack/initialize")
@limiter.limit("5/minute")
def paystack_initialize(
    request: Request,
    payload: PaystackDepositIn,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not settings.paystack_secret_key:
        raise HTTPException(503, "Paystack is not configured")
    email = user.get("email")
    if not email:
        raise HTTPException(400, "Your account has no email address")

    wallet = _get_or_create_wallet(db, UUID(user["sub"]))
    tx = WalletTransaction(
        wallet_id=wallet.id, type="deposit", amount=payload.amount,
        status="pending", phone=wallet.phone,  # no phone for card payments; reuses the wallet's if set
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)

    reference = f"PSK{tx.id.hex}"
    tx.checkout_request_id = reference
    db.commit()

    try:
        data = paystack.initialize_transaction(
            email=email, amount_kes=payload.amount, reference=reference,
            callback_url=f"{settings.frontend_url}/wallet", user_id=user["sub"],
        )
    except paystack.PaystackError:
        logger.exception("Paystack initialize failed for tx %s", tx.id)
        tx.status = "failed"
        db.commit()
        raise HTTPException(502, "Couldn't start Paystack checkout — please try again")
    return {"authorization_url": data["authorization_url"], "reference": reference}


@router.get("/paystack/verify/{reference}")
def paystack_verify(reference: str, user=Depends(get_current_user), db: Session = Depends(get_db)):
    wallet = _get_or_create_wallet(db, UUID(user["sub"]))
    db.commit()
    owned = db.execute(
        select(WalletTransaction.id).where(
            WalletTransaction.wallet_id == wallet.id,
            WalletTransaction.checkout_request_id == reference,
            WalletTransaction.type == "deposit",
        )
    ).first()
    if not reference.startswith("PSK") or not owned:
        raise HTTPException(404, "Transaction not found")
    try:
        data = paystack.verify_transaction(reference)
    except paystack.PaystackError:
        logger.exception("Paystack verify failed for %s", reference)
        raise HTTPException(502, "Couldn't verify payment — please try again")
    return {"status": _settle_paystack(db, reference, data)}


@router.post("/paystack/webhook")
async def paystack_webhook(request: Request, db: Session = Depends(get_db)):
    raw = await request.body()
    if not paystack.valid_signature(raw, request.headers.get("x-paystack-signature")):
        raise HTTPException(400, "Invalid webhook signature")
    try:
        event = json.loads(raw)
    except ValueError:
        return {"received": True}
    if event.get("event") == "charge.success":
        data = event.get("data") or {}
        reference = str(data.get("reference") or "")
        if reference.startswith("PSK"):
            _settle_paystack(db, reference, data)  # wallet deposit
        elif reference.startswith(ats_quota.REFERENCE_PREFIX):
            ats_quota.settle_pack(db, reference, data)  # ATS scan pack purchase
        elif reference.startswith(doc_quota.REFERENCE_PREFIX):
            doc_quota.settle_pack(db, reference, data)  # CV template + cover letter download pack
    return {"received": True}


# ── PayPal (USD-converted deposits) ──────────────────────
@router.get("/paypal/rate")
def paypal_rate(user=Depends(get_current_user)):
    return {"kes_per_usd": settings.paypal_kes_per_usd}


@router.post("/paypal/initialize")
@limiter.limit("5/minute")
def paypal_initialize(
    request: Request,
    payload: PaypalDepositIn,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not settings.paypal_client_id or not settings.paypal_client_secret:
        raise HTTPException(503, "PayPal is not configured")
    try:
        usd_cents = paypal.kes_to_usd_cents(payload.amount)
    except paypal.PaypalError as e:
        raise HTTPException(503, str(e))

    wallet = _get_or_create_wallet(db, UUID(user["sub"]))
    tx = WalletTransaction(wallet_id=wallet.id, type="deposit", amount=payload.amount, status="pending")
    db.add(tx)
    db.commit()
    db.refresh(tx)

    try:
        order = paypal.create_order(
            usd_cents=usd_cents,
            custom_id=f"{tx.id}:{usd_cents}",
            return_url=f"{settings.frontend_url}/wallet?paypal=return",
            cancel_url=f"{settings.frontend_url}/wallet?paypal=cancel",
        )
    except paypal.PaypalError:
        logger.exception("PayPal create order failed for tx %s", tx.id)
        tx.status = "failed"
        db.commit()
        raise HTTPException(502, "Couldn't start PayPal checkout — please try again")

    tx.checkout_request_id = f"{PAYPAL_PREFIX}{order['id']}"
    db.commit()
    return {"approval_url": order["approval_url"], "usd_amount": f"{usd_cents / 100:.2f}"}


@router.post("/paypal/capture/{order_id}")
@limiter.limit("10/minute")
def paypal_capture(request: Request, order_id: str, user=Depends(get_current_user), db: Session = Depends(get_db)):
    _owned_paypal_tx(db, user["sub"], order_id)
    try:
        order = paypal.capture_order(order_id)
    except paypal.PaypalError:
        logger.exception("PayPal capture failed for order %s", order_id)
        raise HTTPException(502, "Couldn't complete PayPal payment — please try again")
    return {"status": _settle_paypal(db, order_id, order)}


@router.post("/paypal/cancel/{order_id}")
def paypal_cancel(order_id: str, user=Depends(get_current_user), db: Session = Depends(get_db)):
    _owned_paypal_tx(db, user["sub"], order_id)
    tx = _paypal_tx(db, order_id, lock=True)
    if tx and tx.status == "pending":
        tx.status = "failed"  # a later capture (if any) still credits via _settle_paypal
        db.commit()
    return {"ok": True}


@router.post("/paypal/webhook")
async def paypal_webhook(request: Request, db: Session = Depends(get_db)):
    raw = await request.body()
    try:
        event = json.loads(raw)
    except ValueError:
        raise HTTPException(400, "Invalid payload")
    try:
        if not await run_in_threadpool(paypal.verify_webhook, request.headers, event):
            raise HTTPException(400, "Invalid webhook signature")
    except paypal.PaypalError:
        logger.exception("PayPal webhook verification call failed")
        raise HTTPException(502, "Couldn't verify webhook")

    etype = event.get("event_type")
    resource = event.get("resource") or {}
    if etype == "CHECKOUT.ORDER.APPROVED":
        order_id = resource.get("id")
    elif etype == "PAYMENT.CAPTURE.COMPLETED":
        order_id = ((resource.get("supplementary_data") or {}).get("related_ids") or {}).get("order_id")
    else:
        return {"received": True}

    # Only act on orders we created — never capture someone else's order.
    if not order_id or not _paypal_tx(db, order_id):
        return {"received": True}
    try:
        fetch = paypal.capture_order if etype == "CHECKOUT.ORDER.APPROVED" else paypal.get_order
        order = await run_in_threadpool(fetch, order_id)
    except paypal.PaypalError:
        logger.exception("PayPal webhook handling failed for order %s", order_id)
        raise HTTPException(502, "Couldn't process webhook")  # PayPal retries
    _settle_paypal(db, order_id, order)
    return {"received": True}


# ── Bachs (USD-priced hosted checkout) ───────────────────
@router.get("/bachs/rate")
def bachs_rate(user=Depends(get_current_user)):
    return {"kes_per_usd": settings.bachs_kes_per_usd}


@router.post("/bachs/initialize")
@limiter.limit("5/minute")
def bachs_initialize(
    request: Request,
    payload: BachsDepositIn,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not settings.bachs_api_key:
        raise HTTPException(503, "Bachs is not configured")
    try:
        usd_amount = bachs.kes_to_usd_amount(payload.amount)
    except bachs.BachsError as e:
        raise HTTPException(503, str(e))

    wallet = _get_or_create_wallet(db, UUID(user["sub"]))
    tx = WalletTransaction(wallet_id=wallet.id, type="deposit", amount=payload.amount, status="pending")
    db.add(tx)
    db.commit()
    db.refresh(tx)

    try:
        session = bachs.create_checkout_session(
            usd_amount=usd_amount,
            reference=f"WLT-{tx.id}",
            email=user.get("email"),
            # Bachs appends ?checkout_id=... to success_url; cancel uses a fragment so the
            # wallet page can tell the two apart.
            success_url=f"{settings.frontend_url}/wallet",
            cancel_url=f"{settings.frontend_url}/wallet#bachs-cancelled",
            metadata={"tx_id": str(tx.id), "user_id": user["sub"]},
        )
    except bachs.BachsError:
        logger.exception("Bachs create checkout failed for tx %s", tx.id)
        tx.status = "failed"
        db.commit()
        raise HTTPException(502, "Couldn't start Bachs checkout — please try again")

    tx.checkout_request_id = f"{BACHS_PREFIX}{session['checkout_id']}"
    db.commit()
    return {"checkout_url": session["checkout_url"], "usd_amount": usd_amount}


@router.post("/bachs/cancel")
def bachs_cancel(user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Customer backed out of the hosted page: stop showing their open Bachs attempts as pending.
    A payment that still completes later is credited by the webhook regardless."""
    wallet = _get_or_create_wallet(db, UUID(user["sub"]))
    pending = db.execute(
        select(WalletTransaction)
        .where(
            WalletTransaction.wallet_id == wallet.id,
            WalletTransaction.type == "deposit",
            WalletTransaction.status == "pending",
            WalletTransaction.checkout_request_id.startswith(BACHS_PREFIX),
        )
        .with_for_update()
    ).scalars().all()
    for tx in pending:
        tx.status = "failed"
    db.commit()
    return {"ok": True}


@router.post("/bachs/webhook")
async def bachs_webhook(request: Request, db: Session = Depends(get_db)):
    raw = await request.body()
    if not bachs.verify_signature(raw, request.headers):
        raise HTTPException(400, "Invalid webhook signature")
    try:
        event = json.loads(raw)
    except ValueError:
        return {"received": True}

    data = event.get("data") or {}
    checkout_id = data.get("checkout_id")
    if checkout_id:
        _settle_bachs(db, str(checkout_id), event.get("type") or "", data)
    return {"received": True}  # always 200 for valid signatures so Bachs doesn't retry unknown events


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