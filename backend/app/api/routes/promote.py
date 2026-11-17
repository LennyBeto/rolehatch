# backend/app/api/routes/promote.py
import hashlib
import hmac
import json
import uuid
from datetime import datetime, timedelta, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
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

PAYSTACK_API = "https://api.paystack.co"
FEATURE_KES = 6500  # keep in step with the "$49 = KES 6,500" shown at checkout
FEATURE_REF_PREFIX = "feat-"


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


# ── Pay-per-listing (Paystack) ───────────────────────────────

def _paystack_headers() -> dict:
    return {"Authorization": f"Bearer {settings.paystack_secret_key}"}


def _activate_feature(db: Session, data: dict) -> bool:
    """Apply a successful pay-per-listing transaction. Safe to call repeatedly
    (verify-on-return and the webhook can both fire): each reference counts once."""
    if data.get("status") != "success" or data.get("currency") != "KES":
        return False
    if int(data.get("amount") or 0) < FEATURE_KES * 100:
        return False

    reference = data.get("reference", "")
    if not reference.startswith(FEATURE_REF_PREFIX):
        return False

    meta = data.get("metadata") or {}
    if meta.get("kind") != "feature":
        return False
    try:
        job = db.query(Job).filter_by(id=uuid.UUID(str(meta.get("job_id")))).first()
    except ValueError:
        return False
    if not job:
        return False

    # First caller for this reference wins; repeats just report success.
    if not redis.set(f"feature_paid:{reference}", "1", ex=60 * 60 * 24 * 30, nx=True):
        return True

    now = datetime.now(timezone.utc)
    start = job.featured_until if job.featured_until and job.featured_until > now else now
    job.featured_until = start + timedelta(days=billing.FEATURE_DAYS)
    db.commit()
    _bust_job_cache(job.id)
    return True


@router.post("/checkout/{job_id}")
def create_checkout(job_id: uuid.UUID, user=Depends(get_current_user), db: Session = Depends(get_db)):
    if not settings.paystack_secret_key:
        raise HTTPException(503, "Payments aren't available right now")
    billing.require_business_domain(user.get("email"))  # blocks free-mail accounts
    job = _owned_job(db, user, job_id)

    now = datetime.now(timezone.utc)
    if job.featured_until and job.featured_until > now:
        raise HTTPException(409, "This listing is already featured")

    reference = f"{FEATURE_REF_PREFIX}{uuid.uuid4().hex}"
    try:
        with httpx.Client(timeout=20) as client:
            r = client.post(
                f"{PAYSTACK_API}/transaction/initialize",
                headers=_paystack_headers(),
                json={
                    "email": user["email"],
                    "amount": FEATURE_KES * 100,  # subunits
                    "currency": "KES",
                    "reference": reference,
                    "callback_url": f"{settings.frontend_url}/dashboard",
                    "metadata": {"kind": "feature", "job_id": str(job.id), "verified_by": user["sub"]},
                },
            )
        body = r.json() if r.content else {}
    except (httpx.HTTPError, ValueError):
        raise HTTPException(502, "Couldn't reach Paystack. Please try again.")

    if r.status_code != 200 or not body.get("status"):
        raise HTTPException(502, body.get("message") or "Paystack couldn't start checkout")
    return {"checkout_url": body["data"]["authorization_url"], "reference": reference}


@router.get("/verify/{reference}")
def verify_checkout(reference: str, user=Depends(get_current_user), db: Session = Depends(get_db)):
    if not reference.startswith(FEATURE_REF_PREFIX):
        raise HTTPException(400, "Not a listing payment reference")
    try:
        with httpx.Client(timeout=20) as client:
            r = client.get(f"{PAYSTACK_API}/transaction/verify/{reference}", headers=_paystack_headers())
        body = r.json() if r.content else {}
    except (httpx.HTTPError, ValueError):
        raise HTTPException(502, "Couldn't verify the payment. Please try again.")

    if r.status_code != 200 or not body.get("status"):
        raise HTTPException(502, "Couldn't verify the payment. Please try again.")

    data = body["data"]
    if (data.get("metadata") or {}).get("verified_by") != user["sub"]:
        raise HTTPException(403, "This payment belongs to another account")
    return {"featured": _activate_feature(db, data), "status": data.get("status")}


@router.post("/webhook")
async def paystack_feature_webhook(request: Request, db: Session = Depends(get_db)):
    """Backup activation. Paystack only allows one webhook URL per account, so if yours
    points elsewhere, verify-on-return above still activates the listing."""
    raw = await request.body()
    sent = request.headers.get("x-paystack-signature", "")
    expected = hmac.new(settings.paystack_secret_key.encode(), raw, hashlib.sha512).hexdigest()
    if not hmac.compare_digest(sent, expected):
        raise HTTPException(400, "Invalid signature")

    event = json.loads(raw)
    data = event.get("data") or {}
    if event.get("event") == "charge.success" and str(data.get("reference", "")).startswith(FEATURE_REF_PREFIX):
        _activate_feature(db, data)
    return {"received": True}