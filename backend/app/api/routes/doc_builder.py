# backend/app/api/routes/doc_builder.py
import logging
import uuid
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import get_current_user
from app.db.session import get_db
from app.services import doc_quota, paystack

logger = logging.getLogger("perchrole.docs")
router = APIRouter()


class ConsumeIn(BaseModel):
    kind: Literal["cv", "cover_letter"]


@router.get("/quota")
def quota(user=Depends(get_current_user), db: Session = Depends(get_db)):
    return doc_quota.get_status(db, uuid.UUID(user["sub"]))


@router.post("/consume")
def consume(payload: ConsumeIn, user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Spend one download. The browser calls this BEFORE print / copy / .txt download."""
    uid = uuid.UUID(user["sub"])
    result = doc_quota.consume(db, uid, payload.kind)
    if result is None:
        raise HTTPException(402, doc_quota.locked_detail(payload.kind))
    credit, consumption_id = result
    return {
        "ok": True,
        "credit": credit,
        "consumption_id": str(consumption_id),
        "quota": doc_quota.get_status(db, uid),
    }


@router.post("/refund/{consumption_id}")
def refund(consumption_id: uuid.UUID, user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Called only when the browser action itself failed (e.g. clipboard blocked)."""
    uid = uuid.UUID(user["sub"])
    refunded = doc_quota.refund(db, uid, consumption_id)
    return {"refunded": refunded, "quota": doc_quota.get_status(db, uid)}


@router.post("/checkout")
def checkout(user=Depends(get_current_user), db: Session = Depends(get_db)):
    if not settings.paystack_secret_key:
        raise HTTPException(503, "Paystack is not configured")
    email = user.get("email")
    if not email:
        raise HTTPException(400, "Your account has no email address")

    uid = uuid.UUID(user["sub"])
    reference = doc_quota.create_pending_purchase(db, uid)
    try:
        data = paystack.initialize_transaction(
            email=email,
            amount_kes=settings.docs_pack_price_kes,
            reference=reference,
            callback_url=f"{settings.frontend_url}/applicant/docs-payment",
            user_id=user["sub"],
        )
    except paystack.PaystackError:
        logger.exception("Paystack initialize failed for docs purchase %s", reference)
        doc_quota.mark_purchase_failed(db, reference)
        raise HTTPException(502, "Couldn't start checkout. Please try again.")
    return {"authorization_url": data["authorization_url"], "reference": reference}


@router.get("/verify/{reference}")
def verify(reference: str, user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Called from the post-payment page so credits appear even before the webhook lands
    (the webhook can't reach localhost in dev). Idempotent: shares settle_pack with the webhook."""
    uid = uuid.UUID(user["sub"])
    purchase = doc_quota.get_purchase(db, reference)
    if not reference.startswith(doc_quota.REFERENCE_PREFIX) or not purchase or purchase.user_id != uid:
        raise HTTPException(404, "Purchase not found")
    try:
        data = paystack.verify_transaction(reference)
    except paystack.PaystackError:
        logger.exception("Paystack verify failed for %s", reference)
        raise HTTPException(502, "Couldn't verify payment — please try again")
    status = doc_quota.settle_pack(db, reference, data)
    return {"status": status, "quota": doc_quota.get_status(db, uid)}