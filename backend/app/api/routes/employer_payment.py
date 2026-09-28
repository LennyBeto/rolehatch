# backend/app/api/routes/employer_payment.py
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel, field_validator

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.job import Company, Job
from app.models.mpesa_transaction import MpesaTransaction
from app.services import mpesa

router = APIRouter()

FEATURE_PRICE_KES = 6500
FEATURE_DAYS = 14


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
async def mpesa_callback(request: Request, db: Session = Depends(get_db)):
    """Daraja posts the STK result here — no auth header, Daraja doesn't support one.
    Validate by matching CheckoutRequestID against a transaction we created."""
    body = await request.json()
    stk_callback = body.get("Body", {}).get("stkCallback", {})
    checkout_request_id = stk_callback.get("CheckoutRequestID")

    if not checkout_request_id:
        return {"ResultCode": 0, "ResultDesc": "Ignored — no CheckoutRequestID"}

    txn = db.query(MpesaTransaction).filter_by(checkout_request_id=checkout_request_id).first()
    if not txn:
        return {"ResultCode": 0, "ResultDesc": "Ignored — unknown transaction"}

    result_code = stk_callback.get("ResultCode")
    txn.result_desc = stk_callback.get("ResultDesc")

    if result_code == 0:
        items = {i["Name"]: i.get("Value") for i in stk_callback.get("CallbackMetadata", {}).get("Item", [])}
        txn.status = "completed"
        txn.mpesa_receipt_number = items.get("MpesaReceiptNumber")

        if txn.job_id:
            job = db.query(Job).filter_by(id=txn.job_id).first()
            if job:
                job.featured_until = datetime.now(timezone.utc) + timedelta(days=FEATURE_DAYS)
    else:
        txn.status = "failed" if result_code != 1032 else "cancelled"  # 1032 = user cancelled on phone

    db.commit()
    return {"ResultCode": 0, "ResultDesc": "Accepted"}


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