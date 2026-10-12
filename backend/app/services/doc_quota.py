# backend/app/services/doc_quota.py
import logging
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.doc_builder import DocBuilderQuota, DocBuilderConsumption, DocBuilderPayment

logger = logging.getLogger("perchrole.docs")

PACK_PRICE_USD = 3.99
PACK_DOWNLOADS_EACH = 5
REFERENCE_PREFIX = "DOC"             # the wallet's shared Paystack webhook routes on this prefix
REFUND_WINDOW = timedelta(minutes=5)

# kind -> (free_used column, paid_credits column)
_COLUMNS = {
    "cv": (DocBuilderQuota.cv_free_used, DocBuilderQuota.cv_paid_credits),
    "cover_letter": (DocBuilderQuota.cl_free_used, DocBuilderQuota.cl_paid_credits),
}


# ── quota ────────────────────────────────────────────────────────────────
def _ensure_row(db: Session, user_id: uuid.UUID) -> None:
    db.execute(
        pg_insert(DocBuilderQuota).values(user_id=user_id).on_conflict_do_nothing(index_elements=["user_id"])
    )


def _kind_status(free_used: bool, paid: int) -> dict:
    free_remaining = 0 if free_used else 1
    remaining = free_remaining + paid
    return {
        "free_remaining": free_remaining,
        "paid_remaining": paid,
        "remaining": remaining,
        "locked": remaining == 0,
    }


def get_status(db: Session, user_id: uuid.UUID) -> dict:
    row = db.get(DocBuilderQuota, user_id)
    return {
        "cv": _kind_status(bool(row and row.cv_free_used), row.cv_paid_credits if row else 0),
        "cover_letter": _kind_status(bool(row and row.cl_free_used), row.cl_paid_credits if row else 0),
        "pack_price_usd": PACK_PRICE_USD,
        "pack_price_kes": settings.docs_pack_price_kes,
        "pack_downloads_each": PACK_DOWNLOADS_EACH,
    }


def locked_detail(kind: str) -> dict:
    """402 body returned when a download is attempted with no credits left for that kind."""
    label = "CV" if kind == "cv" else "cover letter"
    return {
        "code": "docs_locked",
        "kind": kind,
        "message": (
            f"You've used your free {label} download. Unlock {PACK_DOWNLOADS_EACH} more CV and "
            f"{PACK_DOWNLOADS_EACH} more cover letter downloads for ${PACK_PRICE_USD}."
        ),
        "pack_price_usd": PACK_PRICE_USD,
        "pack_price_kes": settings.docs_pack_price_kes,
        "pack_downloads_each": PACK_DOWNLOADS_EACH,
    }


def consume(db: Session, user_id: uuid.UUID, kind: str) -> tuple[str, uuid.UUID] | None:
    """Atomically spend one download of `kind`. Returns (credit_type, consumption_id) or None if locked."""
    free_col, paid_col = _COLUMNS[kind]
    _ensure_row(db, user_id)

    credit: str | None = None
    if db.execute(
        update(DocBuilderQuota)
        .where(DocBuilderQuota.user_id == user_id, free_col.is_(False))
        .values({free_col: True})
        .returning(DocBuilderQuota.user_id)
    ).first():
        credit = "free"
    elif db.execute(
        update(DocBuilderQuota)
        .where(DocBuilderQuota.user_id == user_id, paid_col > 0)
        .values({paid_col: paid_col - 1})
        .returning(DocBuilderQuota.user_id)
    ).first():
        credit = "paid"

    if credit is None:
        db.rollback()
        return None

    consumption_id = uuid.uuid4()
    db.add(DocBuilderConsumption(id=consumption_id, user_id=user_id, kind=kind, credit=credit))
    db.commit()  # the spend and its refund handle land in one transaction
    return credit, consumption_id


def refund(db: Session, user_id: uuid.UUID, consumption_id: uuid.UUID) -> bool:
    """Give back the exact credit a failed download spent. One-shot, owner-only, 5-minute window."""
    cutoff = datetime.now(timezone.utc) - REFUND_WINDOW
    row = db.execute(
        update(DocBuilderConsumption)
        .where(
            DocBuilderConsumption.id == consumption_id,
            DocBuilderConsumption.user_id == user_id,
            DocBuilderConsumption.refunded.is_(False),
            DocBuilderConsumption.created_at >= cutoff,
        )
        .values(refunded=True)
        .returning(DocBuilderConsumption.kind, DocBuilderConsumption.credit)
    ).first()
    if not row:
        db.rollback()
        return False

    kind, credit = row
    free_col, paid_col = _COLUMNS[kind]
    values = {free_col: False} if credit == "free" else {paid_col: paid_col + 1}
    db.execute(update(DocBuilderQuota).where(DocBuilderQuota.user_id == user_id).values(values))
    db.commit()
    return True


# ── purchases ────────────────────────────────────────────────────────────
def create_pending_purchase(db: Session, user_id: uuid.UUID) -> str:
    reference = f"{REFERENCE_PREFIX}{uuid.uuid4().hex}"
    db.add(
        DocBuilderPayment(
            reference=reference,
            user_id=user_id,
            credits_each=PACK_DOWNLOADS_EACH,
            amount_kes=settings.docs_pack_price_kes,
            status="pending",
        )
    )
    db.commit()
    return reference


def mark_purchase_failed(db: Session, reference: str) -> None:
    db.execute(
        update(DocBuilderPayment)
        .where(DocBuilderPayment.reference == reference, DocBuilderPayment.status == "pending")
        .values(status="failed")
    )
    db.commit()


def get_purchase(db: Session, reference: str) -> DocBuilderPayment | None:
    return db.get(DocBuilderPayment, reference)


def settle_pack(db: Session, reference: str, data: dict) -> str:
    """Idempotent. The wallet's Paystack webhook and GET /api/documents/verify both call this;
    the row lock + status check guarantee a reference grants its credits at most once.
    `data` is Paystack's transaction object."""
    purchase = db.execute(
        select(DocBuilderPayment).where(DocBuilderPayment.reference == reference).with_for_update()
    ).scalar_one_or_none()
    if not purchase:
        logger.warning("Docs reference %s has no matching purchase", reference)
        return "unknown"
    if purchase.status == "completed":
        return "completed"

    status = data.get("status")
    if status == "success":
        # Paystack amounts are in the smallest unit (cents).
        if data.get("amount") != purchase.amount_kes * 100 or data.get("currency") != "KES":
            logger.error("Docs amount/currency mismatch on %s: %s", reference, data)
            return "pending"  # never grant on an unverified amount; left for manual review
        _ensure_row(db, purchase.user_id)
        db.execute(
            update(DocBuilderQuota)
            .where(DocBuilderQuota.user_id == purchase.user_id)
            .values(
                cv_paid_credits=DocBuilderQuota.cv_paid_credits + purchase.credits_each,
                cl_paid_credits=DocBuilderQuota.cl_paid_credits + purchase.credits_each,
            )
        )
        purchase.status = "completed"
        db.commit()  # both credit buckets + ledger status land in one transaction
        return "completed"

    if status in ("failed", "reversed"):
        if purchase.status == "pending":
            purchase.status = "failed"
            db.commit()
        return "failed"
    return "pending"  # abandoned / ongoing