# backend/app/services/cv_credits.py
import uuid
from sqlalchemy import update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.models.cv_build import CvBuild, CvBuildCredit, CvCreditPurchase

PACK_CREDITS = 3


class NoCreditsError(Exception):
    pass


def _ensure_row(db: Session, user_id: uuid.UUID) -> None:
    db.execute(
        pg_insert(CvBuildCredit).values(user_id=user_id).on_conflict_do_nothing(index_elements=["user_id"])
    )


def get_status(db: Session, user_id: uuid.UUID) -> dict:
    row = db.get(CvBuildCredit, user_id)
    free_available = row is None or not row.free_used
    paid = row.paid_credits if row else 0
    return {"free_available": free_available, "paid_credits": paid, "can_build": free_available or paid > 0}


def consume_build(db: Session, user_id: uuid.UUID) -> CvBuild:
    """Atomically spend one credit (free first, then paid). Raises NoCreditsError if locked."""
    _ensure_row(db, user_id)

    source = None
    claimed_free = db.execute(
        update(CvBuildCredit)
        .where(CvBuildCredit.user_id == user_id, CvBuildCredit.free_used.is_(False))
        .values(free_used=True)
        .returning(CvBuildCredit.user_id)
    ).first()
    if claimed_free:
        source = "free"
    else:
        claimed_paid = db.execute(
            update(CvBuildCredit)
            .where(CvBuildCredit.user_id == user_id, CvBuildCredit.paid_credits > 0)
            .values(paid_credits=CvBuildCredit.paid_credits - 1)
            .returning(CvBuildCredit.user_id)
        ).first()
        if claimed_paid:
            source = "paid"

    if source is None:
        db.commit()  # persist the ensured row
        raise NoCreditsError()

    build = CvBuild(user_id=user_id, source=source, status="pending")
    db.add(build)
    db.commit()  # credit spend + ledger row commit together
    db.refresh(build)
    return build


def complete_build(db: Session, build_id: uuid.UUID) -> None:
    db.execute(
        update(CvBuild).where(CvBuild.id == build_id, CvBuild.status == "pending").values(status="completed")
    )
    db.commit()


def refund_build(db: Session, build_id: uuid.UUID) -> bool:
    """Idempotent: only a still-pending build can be refunded, and only once."""
    row = db.execute(
        update(CvBuild)
        .where(CvBuild.id == build_id, CvBuild.status == "pending")
        .values(status="refunded")
        .returning(CvBuild.user_id, CvBuild.source)
    ).first()
    if row is None:
        db.rollback()
        return False

    user_id, source = row
    if source == "free":
        db.execute(update(CvBuildCredit).where(CvBuildCredit.user_id == user_id).values(free_used=False))
    else:
        db.execute(
            update(CvBuildCredit)
            .where(CvBuildCredit.user_id == user_id)
            .values(paid_credits=CvBuildCredit.paid_credits + 1)
        )
    db.commit()
    return True


def grant_pack(db: Session, reference: str, user_id: uuid.UUID, amount: int, currency: str) -> bool:
    """Idempotent on the Paystack reference. Returns True only the first time it's seen."""
    inserted = db.execute(
        pg_insert(CvCreditPurchase)
        .values(reference=reference, user_id=user_id, credits=PACK_CREDITS, amount=amount, currency=currency)
        .on_conflict_do_nothing(index_elements=["reference"])
        .returning(CvCreditPurchase.reference)
    ).first()
    if inserted is None:
        db.rollback()
        return False

    _ensure_row(db, user_id)
    db.execute(
        update(CvBuildCredit)
        .where(CvBuildCredit.user_id == user_id)
        .values(paid_credits=CvBuildCredit.paid_credits + PACK_CREDITS)
    )
    db.commit()  # purchase record + credits land together
    return True