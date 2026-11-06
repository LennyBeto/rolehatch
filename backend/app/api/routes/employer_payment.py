# backend/app/api/routes/employer_payment.py
import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel, field_validator

from app.core.config import settings
from app.core.limiter import limiter
from app.core.security import get_current_user
from app.db.session import get_db
from app.models.job import Company, Job
from app.models.mpesa_transaction import MpesaTransaction
from app.services import mpesa, paystack, feature_listing, employer_mpesa

logger = logging.getLogger("perchrole.employer_payment")
router = APIRouter()

FEATURE_PRICE_KES = feature_listing.FEATURE_PRICE_KES
FEATURE_DAYS = feature_listing.FEATURE_DAYS
ACK = {"ResultCode": 0, "ResultDesc": "Accepted"}


def get_company_for_user(db: Session, user: dict) -> Company:
    user_email = user.get("email", "")
    domain = user_email.split("@")[-1].lower() if "@" in user_email else None
    if not domain:
        raise HTTPException(400, "Could not determine your company domain from your account email")

    company = db.query(Company).filter(func.lower(Company.domain) == domain).first()
    if not company:
        raise HTTPException(404, "No company found for your account — post a job first")
    return company


class MpesaStkRequest(BaseModel):
    job_id: str
    phone_number: str

    @field_validator("phone_number")
    @classmethod
    def validate_phone(cls, v):
        try:
            return mpesa.normalize_phone(v)
        except ValueError as e:
            raise ValueError(str(e))


class PaystackFeatureRequest(BaseModel):
    job_id: str


# ── Paystack (card / bank / mobile money via hosted checkout) ──
@router.post("/paystack/checkout")
@limiter.limit("5/minute")
def start_paystack_checkout(
    request: Request,
    payload: PaystackFeatureRequest,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not settings.paystack_secret_key:
        raise HTTPException(503, "Paystack is not configured")
    email = user.get("email")
    if not email:
        raise HTTPException(400, "Your account has no email address")

    company = get_company_for_user(db, user)
    try:
        job_uuid = uuid.UUID(payload.job_id)
    except ValueError:
        raise HTTPException(404, "Job not found for your company")

    job = db.query(Job).filter_by(id=job_uuid, company_id=company.id, is_active=True).first()
    if not job:
        raise HTTPException(404, "Job not found for your company")

    now = datetime.now(timezone.utc)
    if job.featured_until and job.featured_until > now:
        raise HTTPException(409, "This listing is already featured")

    reference = feature_listing.new_reference(job.id)
    try:
        data = paystack.initialize_transaction(
            email=email,
            amount_kes=feature_listing.FEATURE_PRICE_KES,
            reference=reference,
            callback_url=f"{settings.frontend_url}/promote/paystack-return",
            user_id=user["sub"],
            extra_metadata={"purpose": feature_listing.PURPOSE, "job_id": str(job.id)},
        )
    except paystack.PaystackError:
        logger.exception("Paystack initialize failed for featured listing %s", job.id)
        raise HTTPException(502, "Couldn't start Paystack checkout — please try again")
    return {"authorization_url": data["authorization_url"], "reference": reference}


@router.get("/paystack/verify/{reference}")
def verify_paystack(reference: str, user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Called when the employer returns from Paystack so the listing is featured before the
    webhook lands. Shares settle() with the webhook, so it is safe to call repeatedly."""
    if not reference.startswith(feature_listing.REFERENCE_PREFIX):
        raise HTTPException(404, "Payment not found")
    company = get_company_for_user(db, user)

    try:
        data = paystack.verify_transaction(reference)
    except paystack.PaystackError:
        logger.exception("Paystack verify failed for %s", reference)
        raise HTTPException(502, "Couldn't verify payment — please try again")

    job_id = feature_listing.job_id_from(data)
    owned = (
        db.query(Job.id).filter(Job.id == job_id, Job.company_id == company.id).first()
        if job_id
        else None
    )
    if not owned:
        raise HTTPException(404, "Payment not found")

    return {"status": feature_listing.settle(db, reference, data)}


# ── M-Pesa (STK push) ────────────────────────────────────
@router.post("/mpesa/stk-push")
async def start_mpesa_stk_push(payload: MpesaStkRequest, user=Depends(get_current_user), db: Session = Depends(get_db)):
    company = get_company_for_user(db, user)

    job = db.query(Job).filter_by(id=payload.job_id, company_id=company.id).first()
    if not job:
        raise HTTPException(404, "Job not found for your company")

    try:
        result = await mpesa.initiate_stk_push(
            phone_number=payload.phone_number,
            amount=FEATURE_PRICE_KES,
            account_reference=f"PR-{str(job.id)[:8]}",
            description="Feature listing",
        )
    except Exception:
        raise HTTPException(502, "Could not reach M-Pesa — please try again shortly")

    if result.get("ResponseCode") != "0":
        raise HTTPException(400, result.get("ResponseDescription", "M-Pesa request was rejected"))

    txn = MpesaTransaction(
        id=uuid.uuid4(),
        company_id=company.id,
        job_id=job.id,
        checkout_request_id=result["CheckoutRequestID"],
        merchant_request_id=result["MerchantRequestID"],
        phone_number=payload.phone_number,
        amount=FEATURE_PRICE_KES,
        status="pending",
    )
    db.add(txn)
    db.commit()

    return {
        "checkout_request_id": txn.checkout_request_id,
        "message": "Check your phone to complete the M-Pesa payment.",
    }


@router.post("/mpesa/callback")
async def mpesa_callback(request: Request, token: str = Query(""), db: Session = Depends(get_db)):
    """Secret-gated like the wallet callbacks. Daraja's STK results actually arrive at the
    wallet's /callbacks/stk (the single configured CallBackURL), which forwards employer
    payments to the same employer_mpesa.apply_stk_result() used here."""
    if not employer_mpesa.token_ok(token):
        raise HTTPException(403, "Forbidden")
    try:
        stk_callback = (await request.json())["Body"]["stkCallback"]
        checkout_request_id = stk_callback["CheckoutRequestID"]
    except (ValueError, KeyError, TypeError):
        return ACK

    employer_mpesa.apply_stk_result(db, checkout_request_id, stk_callback)
    return ACK


@router.get("/mpesa/status/{checkout_request_id}")
async def get_mpesa_status(checkout_request_id: str, user=Depends(get_current_user), db: Session = Depends(get_db)):
    company = get_company_for_user(db, user)
    txn = db.query(MpesaTransaction).filter_by(
        checkout_request_id=checkout_request_id, company_id=company.id
    ).first()
    if not txn:
        raise HTTPException(404, "Transaction not found")

    if txn.status == "pending":
        try:
            result = await mpesa.query_stk_status(checkout_request_id)
            if result.get("ResultCode") == "0":
                txn.status = "completed"
                # Feature the listing here too, in case the callback hasn't arrived yet.
                if txn.job_id:
                    job = db.query(Job).filter_by(id=txn.job_id).first()
                    if job:
                        employer_mpesa.feature_job(job, datetime.now(timezone.utc))
                db.commit()
            elif result.get("ResultCode") not in (None, "1037", "1032"):
                txn.status = "failed"
                db.commit()
        except Exception:
            pass

    return {
        "status": txn.status,
        "mpesa_receipt_number": txn.mpesa_receipt_number,
        "result_desc": txn.result_desc,
    }