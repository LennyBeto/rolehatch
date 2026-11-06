# backend/app/services/employer_mpesa.py
"""Settling employer featured-listing M-Pesa (STK push) payments.

Daraja posts every STK result to the single callback URL configured for the wallet
(`/api/wallet/callbacks/stk`). That route hands any CheckoutRequestID it doesn't own to
apply_stk_result(), so a featured-listing payment is applied even if the employer closed
the tab. The status-poll endpoint uses feature_job() too; both paths are idempotent.
"""
import hmac
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.job import Job
from app.models.mpesa_transaction import MpesaTransaction
from app.services.feature_listing import FEATURE_DAYS

logger = logging.getLogger("perchrole.employer_mpesa")


def token_ok(token: str) -> bool:
    """Daraja callbacks are unsigned, so a shared secret in the URL is the gate."""
    secret = settings.mpesa_callback_secret
    return bool(secret) and hmac.compare_digest((token or "").encode(), secret.encode())


def feature_job(job: Job, now: datetime) -> None:
    """Feature for FEATURE_DAYS from now, never shortening an existing, longer feature window."""
    until = now + timedelta(days=FEATURE_DAYS)
    if not job.featured_until or job.featured_until < until:
        job.featured_until = until


def apply_stk_result(db: Session, checkout_request_id: str, stk_callback: dict) -> bool:
    """Apply a Daraja STK result to an employer featured-listing payment.
    Returns True if the CheckoutRequestID belongs to one (handled or already settled),
    False if it is not an employer payment. Idempotent."""
    txn = (
        db.query(MpesaTransaction)
        .filter_by(checkout_request_id=checkout_request_id)
        .with_for_update()
        .first()
    )
    if not txn:
        db.rollback()
        return False
    if txn.status != "pending":
        db.rollback()
        return True  # replay, or the status poll got there first

    try:
        result_code = int(stk_callback.get("ResultCode"))
    except (TypeError, ValueError):
        db.rollback()
        return True

    txn.result_desc = stk_callback.get("ResultDesc")

    if result_code == 0:
        items = {
            i.get("Name"): i.get("Value")
            for i in (stk_callback.get("CallbackMetadata") or {}).get("Item", [])
        }
        try:
            paid = int(float(items.get("Amount", 0)))
        except (TypeError, ValueError):
            paid = 0
        if paid != txn.amount:
            # Never feature on an unverified amount. Left pending; the status endpoint
            # confirms with Daraja server-to-server.
            logger.error("M-Pesa amount mismatch on txn %s: expected %s, got %s", txn.id, txn.amount, paid)
            db.rollback()
            return True

        txn.status = "completed"
        txn.mpesa_receipt_number = items.get("MpesaReceiptNumber")
        if txn.job_id:
            job = db.query(Job).filter_by(id=txn.job_id).first()
            if job:
                feature_job(job, datetime.now(timezone.utc))
    else:
        txn.status = "cancelled" if result_code == 1032 else "failed"  # 1032 = cancelled on phone

    db.commit()
    return True