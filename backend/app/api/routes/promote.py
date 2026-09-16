# backend/app/api/routes/promote.py
import stripe
from fastapi import APIRouter, HTTPException, Request
from sqlalchemy.orm import Session
from fastapi import Depends
from datetime import datetime, timedelta, timezone
from app.core.config import settings
from app.db.session import get_db
from app.models.job import Job

stripe.api_key = settings.stripe_secret_key
router = APIRouter()

FEATURE_PRICE_CENTS = 4900  # $49 for 14 days — adjust to your pricing
FEATURE_DAYS = 14

@router.post("/checkout/{job_id}")
def create_checkout(job_id: str, db: Session = Depends(get_db)):
    job = db.query(Job).filter_by(id=job_id).first()
    if not job:
        raise HTTPException(404, "Job not found")

    session = stripe.checkout.Session.create(
        mode="payment",
        line_items=[{
            "price_data": {
                "currency": "usd",
                "product_data": {"name": f"Feature listing: {job.title}"},
                "unit_amount": FEATURE_PRICE_CENTS,
            },
            "quantity": 1,
        }],
        metadata={"job_id": str(job.id)},  # used by the webhook to know what to update
        success_url=f"{settings.frontend_url}/promote/success",
        cancel_url=f"{settings.frontend_url}/promote/cancel",
    )
    return {"checkout_url": session.url}


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, settings.stripe_webhook_secret)
    except (ValueError, stripe.error.SignatureVerificationError):
        raise HTTPException(400, "Invalid webhook signature")

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        job_id = session["metadata"]["job_id"]
        job = db.query(Job).filter_by(id=job_id).first()
        if job:
            job.featured_until = datetime.now(timezone.utc) + timedelta(days=FEATURE_DAYS)
            db.commit()

    return {"received": True}

@router.get("/my-jobs")
def my_jobs(user=Depends(get_current_user), db: Session = Depends(get_db)):
    user_domain = user.get("email", "").split("@")[-1].lower()
    company = db.query(Company).filter(func.lower(Company.domain) == user_domain).first()
    if not company:
        return []

    jobs = db.query(Job).filter_by(company_id=company.id, is_active=True).all()
    now = datetime.now(timezone.utc)
    return [
        {
            "id": str(j.id),
            "title": j.title,
            "is_featured": bool(j.featured_until and j.featured_until > now),
            "featured_until": j.featured_until.isoformat() if j.featured_until else None,
        }
        for j in jobs
    ]