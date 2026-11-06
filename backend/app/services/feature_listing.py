# backend/app/services/feature_listing.py
"""Paid featured-listing purchases made through Paystack.

Stateless by design: everything needed to settle a payment travels in the Paystack
transaction (reference prefix + server-set metadata) and is re-checked against
Paystack's own response. Settling is idempotent because featured_until is derived
from Paystack's paid_at timestamp, so replaying the same webhook/verify call
always yields the same value.
"""
import logging
import uuid
from datetime import datetime, timedelta, timezone

from dateutil import parser as date_parser
from sqlalchemy.orm import Session

from app.models.job import Job

logger = logging.getLogger("perchrole.feature_listing")

REFERENCE_PREFIX = "FTR"
PURPOSE = "feature_listing"
FEATURE_PRICE_KES = 6500  # shown to employers as $49
FEATURE_DAYS = 14


def new_reference(job_id: uuid.UUID) -> str:
    return f"{REFERENCE_PREFIX}{job_id.hex}{uuid.uuid4().hex[:8]}"


def job_id_from(data: dict) -> uuid.UUID | None:
    """Job id from the metadata we set server-side when the transaction was created."""
    meta = data.get("metadata")
    if not isinstance(meta, dict) or meta.get("purpose") != PURPOSE:
        return None
    try:
        return uuid.UUID(str(meta.get("job_id")))
    except ValueError:
        return None


def _parse_paid_at(raw) -> datetime | None:
    if not raw:
        return None
    try:
        dt = date_parser.isoparse(str(raw))
    except (ValueError, TypeError):
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def settle(db: Session, reference: str, data: dict) -> str:
    """Idempotent. The webhook and /paystack/verify both call this.
    Returns 'completed', 'pending', 'failed' or 'unknown'."""
    if data.get("reference") != reference:
        logger.error("Reference mismatch for %s: %s", reference, data.get("reference"))
        return "unknown"

    job_id = job_id_from(data)
    if not job_id:
        logger.warning("Paystack reference %s has no featured-listing metadata", reference)
        return "unknown"

    status = data.get("status")
    if status in ("failed", "reversed"):
        return "failed"
    if status != "success":
        return "pending"  # abandoned / ongoing

    # Never feature a listing on an unverified amount; left for manual review.
    if data.get("amount") != FEATURE_PRICE_KES * 100 or data.get("currency") != "KES":
        logger.error("Featured-listing amount/currency mismatch on %s: %s", reference, data)
        return "pending"

    job = db.query(Job).filter_by(id=job_id).with_for_update().first()
    if not job:
        db.rollback()
        return "unknown"

    now = datetime.now(timezone.utc)
    paid_at = _parse_paid_at(data.get("paid_at"))

    if paid_at is None and job.featured_until and job.featured_until > now:
        db.rollback()
        return "completed"  # can't date this payment; listing is already featured

    until = (paid_at or now) + timedelta(days=FEATURE_DAYS)
    if until <= now or (job.featured_until and job.featured_until >= until):
        db.rollback()
        return "completed"  # already applied (or an old replayed payment)

    job.featured_until = until
    db.commit()
    return "completed"