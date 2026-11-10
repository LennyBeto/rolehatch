# backend/app/api/routes/promote.py
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.cache import redis
from app.core.config import settings
from app.core.security import get_current_user
from app.db.session import get_db
from app.models.job import Job, Company
from app.services import billing
from app.services.employer_access import serialize_employer_job, user_email_domain

router = APIRouter()


@router.get("/my-jobs")
def my_jobs(user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Return listings belonging to the signed-in user's verified company domain."""
    domain = user_email_domain(user)
    if not domain:
        return []

    company = db.query(Company).filter(func.lower(Company.domain) == domain).first()
    if not company:
        return []

    jobs = db.query(Job).filter_by(company_id=company.id, is_active=True).all()
    now = datetime.now(timezone.utc)

    def _is_featured(j: Job) -> bool:
        return bool(j.featured_until and j.featured_until > now)

    # Featured listings first, then by title, so employers see promoted
    # roles at the top of their own dashboard too — mirrors public search sort.
    jobs.sort(key=lambda j: (not _is_featured(j), j.title.lower()))

    return [serialize_employer_job(j, now) for j in jobs]


# ── Employer monthly plans ───────────────────────────────────

def _owned_job(db: Session, user: dict, job_id: uuid.UUID) -> Job:
    job = db.query(Job).filter_by(id=job_id).first()
    if not job:
        raise HTTPException(404, "Job not found")
    domain = billing.email_domain(user.get("email"))
    company = db.query(Company).filter_by(id=job.company_id).first()
    if not domain or not company or not company.domain or company.domain.lower() != domain:
        raise HTTPException(
            403,
            "You can only manage listings from a company where your sign-in email "
            "matches the company's verified domain.",
        )
    return job


def _bust_job_cache(job_id) -> None:
    # The single-job detail response is cached for an hour; never fail the request over it.
    try:
        redis.delete(f"job:{job_id}")
    except Exception:
        pass


@router.get("/entitlements")
def get_entitlements(user=Depends(get_current_user), db: Session = Depends(get_db)):
    domain = billing.email_domain(user.get("email"))
    sub = billing.live_subscription(db, domain) if domain else None
    return billing.entitlements(sub)


@router.post("/subscribe/{plan_id}")
def subscribe(plan_id: str, user=Depends(get_current_user), db: Session = Depends(get_db)):
    if plan_id not in billing.PLANS:
        raise HTTPException(404, "Unknown plan")
    if not settings.paystack_secret_key:
        raise HTTPException(503, "Payments aren't available right now")
    domain = billing.require_business_domain(user.get("email"))

    existing = billing.live_subscription(db, domain)
    if existing and existing.status == "active":
        raise HTTPException(409, "Your company already has an active plan. Cancel it before choosing another.")

    checkout_url = billing.initialize_transaction(
        email=user["email"],
        reference=f"sub-{uuid.uuid4().hex}",
        callback_path="/dashboard",
        metadata={"kind": "subscription", "plan_id": plan_id, "domain": domain},
        plan_code=billing.plan_code_for(plan_id),
    )
    return {"checkout_url": checkout_url}


@router.post("/subscription/cancel")
def cancel_subscription(user=Depends(get_current_user), db: Session = Depends(get_db)):
    domain = billing.email_domain(user.get("email"))
    sub = billing.live_subscription(db, domain) if domain else None
    if not sub or sub.status != "active" or not sub.paystack_subscription_code:
        raise HTTPException(404, "No active plan to cancel")

    billing.paystack_request(
        "POST",
        "/subscription/disable",
        {"code": sub.paystack_subscription_code, "token": sub.paystack_email_token},
    )
    sub.status = "cancelled"
    db.commit()
    return {"ok": True, "access_until": sub.current_period_end.isoformat()}


@router.post("/plan/feature/{job_id}")
def feature_with_plan(job_id: uuid.UUID, user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Feature a listing using a plan credit. Pay-per-listing checkout is unchanged."""
    job = _owned_job(db, user, job_id)
    now = datetime.now(timezone.utc)
    if job.featured_until and job.featured_until > now:
        raise HTTPException(409, "This listing is already featured")

    domain = billing.email_domain(user.get("email"))
    # Row-locked so two quick clicks can't spend the same credit twice.
    sub = billing.live_subscription(db, domain, lock=True)
    if not sub:
        raise HTTPException(402, "Featuring with a plan needs an active Starter, Growth or Enterprise plan")
    if not billing.has_credit(billing.entitlements(sub)["featured_remaining"]):
        raise HTTPException(402, "You've used this period's featured listings. You can still pay per listing.")

    sub.featured_used += 1
    job.featured_until = now + timedelta(days=billing.FEATURE_DAYS)
    db.commit()
    _bust_job_cache(job.id)
    return {
        "ok": True,
        "featured_until": job.featured_until.isoformat(),
        "featured_remaining": billing.entitlements(sub)["featured_remaining"],
    }


@router.post("/refresh/{job_id}")
def refresh_listing(job_id: uuid.UUID, user=Depends(get_current_user), db: Session = Depends(get_db)):
    job = _owned_job(db, user, job_id)
    if job.source != "direct":
        raise HTTPException(400, "Refresh works on listings posted directly on PerchRole")

    domain = billing.email_domain(user.get("email"))
    sub = billing.live_subscription(db, domain, lock=True)
    if not sub:
        raise HTTPException(402, "Refresh is included with the Starter, Growth and Enterprise plans")
    if not billing.has_credit(billing.entitlements(sub)["refresh_remaining"]):
        raise HTTPException(402, "You've used this period's refreshes. They reset at your next billing date.")

    sub.bumps_used += 1
    job.posted_at = datetime.now(timezone.utc)
    db.commit()
    _bust_job_cache(job.id)
    return {"ok": True, "refresh_remaining": billing.entitlements(sub)["refresh_remaining"]}