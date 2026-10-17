# backend/app/api/routes/job_alerts.py
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import func
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.core.limiter import limiter
from app.db.session import get_db
from app.models.job_alert import JobAlert
from app.schemas.job_alert import JobAlertCreate, JobAlertUnsubscribe

router = APIRouter()


@router.post("", status_code=201)
@limiter.limit("5/minute")
def create_job_alert(request: Request, payload: JobAlertCreate, db: Session = Depends(get_db)):
    alert = JobAlert(
        email=payload.email,
        keyword=payload.keyword,
        remote_type=payload.remote_type,
        frequency=payload.frequency,
    )
    db.add(alert)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(400, "Could not save alert — please check your email and try again")
    return {"ok": True, "message": "You're subscribed! We'll email you matching jobs."}


@router.post("/unsubscribe")
@limiter.limit("5/minute")
def unsubscribe_job_alerts(request: Request, payload: JobAlertUnsubscribe, db: Session = Depends(get_db)):
    # Deactivate every active alert for this email. The response is identical whether or
    # not the email was subscribed, so this endpoint can't be used to probe who subscribed.
    try:
        db.query(JobAlert).filter(
            func.lower(JobAlert.email) == payload.email.lower(),
            JobAlert.is_active.is_(True),
        ).update({"is_active": False}, synchronize_session=False)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(500, "Couldn't process your request — please try again")
    return {"ok": True, "message": "If that email was subscribed, it has been unsubscribed."}