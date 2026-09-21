# backend/app/api/routes/job_alerts.py
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.db.session import get_db
from app.models.job_alert import JobAlert
from app.schemas.job_alert import JobAlertCreate

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


@router.post("", status_code=201)
@limiter.limit("5/minute")
def create_job_alert(payload: JobAlertCreate, db: Session = Depends(get_db)):
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