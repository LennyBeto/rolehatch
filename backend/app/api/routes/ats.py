# backend/app/api/routes/ats.py
import logging
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import get_current_user
from app.db.session import get_db
from app.schemas.ats import ATSScanRequest
from app.services import ats_quota, paystack
from app.services.ats_scoring import compute_ats_score

logger = logging.getLogger("perchrole.ats")
router = APIRouter()


@router.get("/quota")
def quota(user=Depends(get_current_user), db: Session = Depends(get_db)):
    return ats_quota.get_status(db, uuid.UUID(user["sub"]))


@router.post("/scan")
def run_scan(payload: ATSScanRequest, user=Depends(get_current_user), db: Session = Depends(get_db)):
    uid = uuid.UUID(user["sub"])
    kind = ats_quota.consume_scan(db, uid)
    if kind is None:
        raise HTTPException(402, ats_quota.locked_detail())
    try:
        result = compute_ats_score(payload.cv_text)
    except Exception:
        logger.exception("ATS scan failed for user %s", uid)
        ats_quota.refund_scan(db, uid, kind)  # failed scan never costs a credit
        raise HTTPException(500, "Scan failed. Your credit was not used.")
    return {"result": result, "quota": ats_quota.get_status(db, uid)}


@router.post("/checkout")
def checkout(user=Depends(get_current_user), db: Session = Depends(get_db)):
    if not settings.paystack_secret_key:
        raise HTTPException(503, "Paystack is not configured")
    email = user.get("email")
    if not email:
        raise HTTPException(400, "Your account has no email address")

    uid = uuid.UUID(user["sub"])
    reference = ats_quota.create_pending_purchase(db, uid)
    try:
        data = paystack.initialize_transaction(
            email=email,
            amount_kes=settings.ats_pack_price_kes,
            reference=reference,
            callback_url=f"{settings.frontend_url}/applicant/dashboard",
            user_id=user["sub"],
        )
    except paystack.PaystackError:
        logger.exception("Paystack initialize failed for ATS purchase %s", reference)
        ats_quota.mark_purchase_failed(db, reference)
        raise HTTPException(502, "Couldn't start checkout. Please try again.")
    return {"authorization_url": data["authorization_url"], "reference": reference}


@router.get("/verify/{reference}")
def verify(reference: str, user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Called after the Paystack redirect so credits appear before the webhook lands.
    Idempotent: shares settle_pack with the wallet's Paystack webhook."""
    uid = uuid.UUID(user["sub"])
    purchase = ats_quota.get_purchase(db, reference)
    if not reference.startswith(ats_quota.REFERENCE_PREFIX) or not purchase or purchase.user_id != uid:
        raise HTTPException(404, "Purchase not found")
    try:
        data = paystack.verify_transaction(reference)
    except paystack.PaystackError:
        logger.exception("Paystack verify failed for %s", reference)
        raise HTTPException(502, "Couldn't verify payment — please try again")
    ats_quota.settle_pack(db, reference, data)
    return ats_quota.get_status(db, uid)