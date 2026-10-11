# backend/app/services/ats_quota.py
import logging
import uuid
from sqlalchemy import select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.ats_scan import ATSScanQuota, ATSScanPayment

logger = logging.getLogger("perchrole.ats")

PACK_PRICE_USD = 3.99
PACK_SCANS = 3
REFERENCE_PREFIX = "ATS"  # the wallet's shared Paystack webhook routes on this prefix


# ── quota ────────────────────────────────────────────────────────────────
def _ensure_row(db: Session, user_id: uuid.UUID) -> None:
    db.execute(
        pg_insert(ATSScanQuota).values(user_id=user_id).on_conflict_do_nothing(index_elements=["user_id"])
    )


def get_status(db: Session, user_id: uuid.UUID) -> dict:
    row = db.get(ATSScanQuota, user_id)
    free_remaining = 0 if (row and row.free_used) else 1
    paid_remaining = row.paid_credits if row else 0
    remaining = free_remaining + paid_remaining
    return {
        "free_remaining": free_remaining,
        "paid_remaining": paid_remaining,
        "remaining": remaining,
        "locked": remaining == 0,
        "pack_price_usd": PACK_PRICE_USD,
        "pack_price_kes": settings.ats_pack_price_kes,
        "pack_scans": PACK_SCANS,
    }


def locked_detail() -> dict:
    """402 body returned by every gated scan route (paste-text and stored-CV)."""
    return {
        "code": "ats_locked",
        "message": f"You've used your free ATS scan. Buy {PACK_SCANS} more scans for ${PACK_PRICE_USD}.",
        "pack_price_usd": PACK_PRICE_USD,
        "pack_price_kes": settings.ats_pack_price_kes,
        "pack_scans": PACK_SCANS,
    }


def consume_scan(db: Session, user_id: uuid.UUID) -> str | None:
    """Atomically spend one scan. Returns 'free', 'paid', or None if locked."""
    _ensure_row(db, user_id)

    free = db.execute(
        update(ATSScanQuota)
        .where(ATSScanQuota.user_id == user_id, ATSScanQuota.free_used.is_(False))
        .values(free_used=True)
        .returning(ATSScanQuota.user_id)
    ).first()
    if free:
        db.commit()
        return "free"

    paid = db.execute(
        update(ATSScanQuota)
        .where(ATSScanQuota.user_id == user_id, ATSScanQuota.paid_credits > 0)
        .values(paid_credits=ATSScanQuota.paid_credits - 1)
        .returning(ATSScanQuota.user_id)
    ).first()
    if paid:
        db.commit()
        return "paid"

    db.rollback()
    return None


def refund_scan(db: Session, user_id: uuid.UUID, kind: str) -> None:
    """Give back the exact credit type that was spent (called when a scan fails)."""
    values = {"free_used": False} if kind == "free" else {"paid_credits": ATSScanQuota.paid_credits + 1}
    db.execute(update(ATSScanQuota).where(ATSScanQuota.user_id == user_id).values(**values))
    db.commit()


# ── purchases ────────────────────────────────────────────────────────────
def create_pending_purchase(db: Session, user_id: uuid.UUID) -> str:
    reference = f"{REFERENCE_PREFIX}{uuid.uuid4().hex}"
    db.add(
        ATSScanPayment(
            reference=reference,
            user_id=user_id,
            credits=PACK_SCANS,
            amount_kes=settings.ats_pack_price_kes,
            status="pending",
        )
    )
    db.commit()
    return reference


def mark_purchase_failed(db: Session, reference: str) -> None:
    db.execute(
        update(ATSScanPayment)
        .where(ATSScanPayment.reference == reference, ATSScanPayment.status == "pending")
        .values(status="failed")
    )
    db.commit()


def get_purchase(db: Session, reference: str) -> ATSScanPayment | None:
    return db.get(ATSScanPayment, reference)


def settle_pack(db: Session, reference: str, data: dict) -> str:
    """Idempotent. The wallet's Paystack webhook and GET /api/ats/verify both call this;
    the row lock + status check guarantee a reference grants its credits at most once.
    `data` is Paystack's transaction object."""
    purchase = db.execute(
        select(ATSScanPayment).where(ATSScanPayment.reference == reference).with_for_update()
    ).scalar_one_or_none()
    if not purchase:
        logger.warning("ATS reference %s has no matching purchase", reference)
        return "unknown"
    if purchase.status == "completed":
        return "completed"

    status = data.get("status")
    if status == "success":
        # Paystack amounts are in the smallest unit (cents).
        if data.get("amount") != purchase.amount_kes * 100 or data.get("currency") != "KES":
            logger.error("ATS amount/currency mismatch on %s: %s", reference, data)
            return "pending"  # never grant on an unverified amount; left for manual review
        _ensure_row(db, purchase.user_id)
        db.execute(
            update(ATSScanQuota)
            .where(ATSScanQuota.user_id == purchase.user_id)
            .values(paid_credits=ATSScanQuota.paid_credits + purchase.credits)
        )
        purchase.status = "completed"
        db.commit()  # credits + ledger status land in one transaction
        return "completed"

    if status in ("failed", "reversed"):
        if purchase.status == "pending":
            purchase.status = "failed"
            db.commit()
        return "failed"
    return "pending"  # abandoned / ongoing