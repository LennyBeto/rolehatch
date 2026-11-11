# backend/app/api/routes/newsletter.py
import time
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import case, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.routes.internal import verify_scheduler_secret
from app.core.security import get_current_user
from app.db.session import get_db
from app.models.job import Company, Job
from app.models.newsletter import NewsletterIssue, NewsletterSlot, NewsletterSubscriber
from app.schemas.newsletter import SlotCreate, SubscribeRequest
from app.services import billing
from app.services import newsletter as nl

router = APIRouter()
admin_router = APIRouter(dependencies=[Depends(verify_scheduler_secret)])
limiter = Limiter(key_func=get_remote_address)

INVALID_LINK = "This link is invalid"


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ── Public: subscribe / confirm / unsubscribe ────────────────

@router.post("/subscribe", status_code=202)
@limiter.limit("5/hour")
def subscribe(request: Request, payload: SubscribeRequest, db: Session = Depends(get_db)):
    email = nl.normalize_email(payload.email)
    message = {"ok": True, "message": "Check your inbox to confirm your subscription."}

    sub = db.query(NewsletterSubscriber).filter_by(email=email).first()
    if sub and sub.is_active:
        return message  # same response either way, so the list can't be probed

    if not sub:
        db.add(NewsletterSubscriber(email=email, is_active=False))
        try:
            db.commit()
        except IntegrityError:
            db.rollback()  # a concurrent request created it first; fine
    nl.send_confirmation(email)
    return message


@router.post("/confirm")
def confirm(e: str = Query(...), t: str = Query(...), db: Session = Depends(get_db)):
    email = nl.normalize_email(e)
    if not nl.verify_token("confirm", email, t):
        raise HTTPException(400, INVALID_LINK)
    sub = db.query(NewsletterSubscriber).filter_by(email=email).first()
    if not sub:
        raise HTTPException(400, INVALID_LINK)
    if not sub.is_active:
        sub.is_active = True
        sub.confirmed_at = _now()
        db.commit()
    return {"ok": True}


@router.post("/unsubscribe")
def unsubscribe(e: str = Query(...), t: str = Query(...), db: Session = Depends(get_db)):
    # Also the target of the List-Unsubscribe one-click header (mail clients POST here).
    email = nl.normalize_email(e)
    if not nl.verify_token("unsubscribe", email, t):
        raise HTTPException(400, INVALID_LINK)
    sub = db.query(NewsletterSubscriber).filter_by(email=email).first()
    if sub and sub.is_active:
        sub.is_active = False
        db.commit()
    return {"ok": True}


# ── Employer: submit and track sponsor slots ─────────────────

def _month_start() -> datetime:
    return _now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def _used_this_month(db: Session, domain: str) -> int:
    return (
        db.query(func.count(NewsletterSlot.id))
        .filter(
            NewsletterSlot.email_domain == domain,
            NewsletterSlot.status != "rejected",
            NewsletterSlot.created_at >= _month_start(),
        )
        .scalar()
        or 0
    )


def _has_newsletter(db: Session, domain: str, lock: bool = False) -> bool:
    sub = billing.live_subscription(db, domain, lock=lock)
    return bool(sub and billing.PLANS[sub.plan_id]["newsletter"])


def _slot_dict(s: NewsletterSlot) -> dict:
    return {
        "id": str(s.id),
        "email_domain": s.email_domain,
        "company_name": s.company_name,
        "headline": s.headline,
        "blurb": s.blurb,
        "link_url": s.link_url,
        "status": s.status,
        "created_at": s.created_at.isoformat() if s.created_at else None,
        "sent_at": s.sent_at.isoformat() if s.sent_at else None,
    }


@router.get("/slots/mine")
def my_slots(user=Depends(get_current_user), db: Session = Depends(get_db)):
    domain = billing.email_domain(user.get("email"))
    slots = []
    if domain:
        slots = (
            db.query(NewsletterSlot)
            .filter_by(email_domain=domain)
            .order_by(NewsletterSlot.created_at.desc())
            .limit(20)
            .all()
        )
    return {
        "has_access": bool(domain) and _has_newsletter(db, domain),
        "limit": nl.SLOTS_PER_COMPANY_PER_MONTH,
        "used": _used_this_month(db, domain) if domain else 0,
        "slots": [_slot_dict(s) for s in slots],
    }


@router.post("/slots", status_code=201)
def create_slot(payload: SlotCreate, user=Depends(get_current_user), db: Session = Depends(get_db)):
    domain = billing.require_business_domain(user.get("email"))
    # Row-locks the subscription so two quick submissions can't both pass the monthly cap.
    if not _has_newsletter(db, domain, lock=True):
        raise HTTPException(402, "Newsletter features are included with the Enterprise plan")

    company = (
        db.query(Company)
        .filter(func.lower(Company.domain) == domain, Company.is_active.is_(True))
        .first()
    )
    if not company:
        raise HTTPException(404, "Post a job first so PerchRole can create your company profile")

    if _used_this_month(db, domain) >= nl.SLOTS_PER_COMPANY_PER_MONTH:
        raise HTTPException(409, "You've used this month's newsletter feature. It resets next month.")

    slot = NewsletterSlot(
        email_domain=domain,
        company_name=company.name,
        headline=payload.headline,
        blurb=payload.blurb,
        link_url=str(payload.link_url),
        status="pending",
    )
    db.add(slot)
    db.commit()
    return {"ok": True, "id": str(slot.id)}


# ── Admin (X-Scheduler-Secret): review queue and sending ─────

@admin_router.get("/slots")
def admin_list_slots(status: str = "pending", db: Session = Depends(get_db)):
    rows = (
        db.query(NewsletterSlot)
        .filter_by(status=status)
        .order_by(NewsletterSlot.created_at)
        .limit(100)
        .all()
    )
    return [_slot_dict(s) for s in rows]


def _review(db: Session, slot_id: uuid.UUID, new_status: str) -> dict:
    slot = db.query(NewsletterSlot).filter_by(id=slot_id).first()
    if not slot:
        raise HTTPException(404, "Slot not found")
    if slot.status != "pending":
        raise HTTPException(409, f"Slot is already {slot.status}")
    slot.status = new_status
    if new_status == "approved":
        slot.approved_at = _now()
    db.commit()
    return {"ok": True, "status": new_status}


@admin_router.post("/slots/{slot_id}/approve")
def admin_approve_slot(slot_id: uuid.UUID, db: Session = Depends(get_db)):
    return _review(db, slot_id, "approved")


@admin_router.post("/slots/{slot_id}/reject")
def admin_reject_slot(slot_id: uuid.UUID, db: Session = Depends(get_db)):
    return _review(db, slot_id, "rejected")


def _issue_jobs(db: Session, since: datetime) -> list[dict]:
    now = _now()
    featured_first = case((Job.featured_until.isnot(None) & (Job.featured_until > now), 0), else_=1)
    rows = (
        db.query(Job, Company)
        .join(Company, Job.company_id == Company.id)
        .filter(Job.is_active.is_(True), Job.posted_at >= since)
        .order_by(featured_first, Job.posted_at.desc())
        .limit(nl.MAX_JOBS_PER_ISSUE)
        .all()
    )
    return [
        {"title": j.title, "company_name": c.name, "domain": c.domain, "location": j.location}
        for j, c in rows
    ]


def _issue_slots(db: Session) -> list[NewsletterSlot]:
    """Approved slots whose company still has a live newsletter entitlement."""
    approved = (
        db.query(NewsletterSlot)
        .filter_by(status="approved")
        .order_by(NewsletterSlot.approved_at)
        .all()
    )
    eligible = [s for s in approved if _has_newsletter(db, s.email_domain)]
    return eligible[: nl.MAX_SLOTS_PER_ISSUE]


@admin_router.post("/send")
def send_issue(
    dry_run: bool = True,
    test_to: str | None = None,
    force: bool = False,
    db: Session = Depends(get_db),
):
    """dry_run=true (default) only counts. test_to=addr sends one test email.
    dry_run=false sends to every confirmed subscriber."""
    now = _now()
    jobs = _issue_jobs(db, now - timedelta(days=7))
    slots = _issue_slots(db)
    slot_dicts = [_slot_dict(s) for s in slots]

    if test_to:
        email = nl.normalize_email(test_to)
        html_body, text_body = nl.render_issue(email, jobs, slot_dicts)
        nl.send_one(nl.build_message(email, f"[TEST] {nl.SUBJECT}", html_body, text_body))
        return {"test_sent_to": email, "jobs": len(jobs), "slots": len(slot_dicts)}

    recipients = [
        r.email
        for r in db.query(NewsletterSubscriber)
        .filter_by(is_active=True)
        .order_by(NewsletterSubscriber.created_at)
        .limit(nl.MAX_RECIPIENTS_PER_RUN)
        .all()
    ]
    summary = {
        "recipients": len(recipients),
        "jobs": len(jobs),
        "slots": len(slot_dicts),
        "subject": nl.SUBJECT,
    }
    if dry_run:
        return {"dry_run": True, **summary}

    last_sent = db.query(func.max(NewsletterIssue.sent_at)).scalar()
    if last_sent and not force and now - last_sent < timedelta(days=nl.MIN_DAYS_BETWEEN_ISSUES):
        raise HTTPException(409, "An issue went out recently. Pass force=true to send anyway.")
    if not recipients:
        raise HTTPException(400, "No confirmed subscribers yet")
    if not jobs and not slots:
        raise HTTPException(400, "Nothing to send: no new roles and no approved slots")

    sent = 0
    failure: HTTPException | None = None
    for start in range(0, len(recipients), nl.BATCH_SIZE):
        chunk = recipients[start:start + nl.BATCH_SIZE]
        messages = [
            nl.build_message(e, nl.SUBJECT, *nl.render_issue(e, jobs, slot_dicts)) for e in chunk
        ]
        try:
            nl.send_batch(messages)
        except HTTPException as exc:
            failure = exc
            break
        sent += len(chunk)
        if start + nl.BATCH_SIZE < len(recipients):
            time.sleep(nl.BATCH_PAUSE_SECONDS)

    if sent:
        for s in slots:
            s.status = "sent"
            s.sent_at = now
        db.add(NewsletterIssue(recipients=sent, slot_count=len(slots)))
        db.commit()

    if failure:
        raise HTTPException(
            502,
            f"Sent to {sent} of {len(recipients)} subscribers before the email provider failed.",
        )
    return {"sent": sent, "slots_sent": len(slots), **summary}