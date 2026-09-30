# backend/app/api/routes/saved_jobs.py
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert as pg_insert
from app.db.session import get_db
from app.core.security import get_current_user
from app.models.job import SavedJob, Job, Company
from app.schemas.saved_job import AppliedJobOut, SavedJobCreate, SavedJobUpdate
from app.services.hidden_jobs import purge_stale_hidden_jobs  # NEW

logger = logging.getLogger("perchrole.saved_jobs")
router = APIRouter()

ALLOWED_STATUSES = {"saved", "applied", "hidden"}

@router.post("")
def save_job(payload: SavedJobCreate, user=Depends(get_current_user), db: Session = Depends(get_db)):
    if payload.status not in ALLOWED_STATUSES:
        raise HTTPException(400, "Invalid status")

    # NEW: stamp when a job is hidden; clear the stamp for any other status
    hidden_at = datetime.now(timezone.utc) if payload.status == "hidden" else None

    stmt = pg_insert(SavedJob).values(
        user_id=user["sub"], job_id=payload.job_id, status=payload.status, hidden_at=hidden_at,
    ).on_conflict_do_update(
        index_elements=["user_id", "job_id"], set_={"status": payload.status, "hidden_at": hidden_at},
    )
    db.execute(stmt)
    db.commit()
    return {"ok": True}

@router.patch("/{job_id}")
def update_saved_job(job_id: str, payload: SavedJobUpdate, user=Depends(get_current_user), db: Session = Depends(get_db)):
    if payload.status not in ALLOWED_STATUSES:
        raise HTTPException(400, "Invalid status")

    record = db.query(SavedJob).filter_by(user_id=user["sub"], job_id=job_id).first()
    if not record:
        raise HTTPException(404, "Not found")

    # NEW: start the 5-day clock only when a job newly becomes hidden; clear it when it leaves "hidden"
    if payload.status == "hidden":
        if record.status != "hidden" or record.hidden_at is None:
            record.hidden_at = datetime.now(timezone.utc)
    else:
        record.hidden_at = None

    record.status = payload.status
    db.commit()
    return {"ok": True}

@router.get("")
def list_saved_jobs(user=Depends(get_current_user), db: Session = Depends(get_db)):
    # NEW: drop this user's jobs that have stayed hidden for over 5 days. Never let a purge failure break the list.
    try:
        purge_stale_hidden_jobs(db, user["sub"])
    except Exception:
        db.rollback()
        logger.exception("Hidden-job purge failed")

    records = db.query(SavedJob).filter_by(user_id=user["sub"]).all()
    return [
        {
            "id": str(r.id),
            "user_id": str(r.user_id),
            "job_id": str(r.job_id),
            "status": r.status,
            "hidden_at": r.hidden_at.isoformat() if r.hidden_at else None,  # NEW: powers the removal countdown
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in records
    ]

# ── My Applications — jobs marked as "applied", with job/company details ──
@router.get("/applications", response_model=list[AppliedJobOut])
def list_applications(user=Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.execute(
        select(
            SavedJob.id.label("saved_job_id"),
            Job.id.label("job_id"),
            Job.title,
            Company.name.label("company_name"),
            Job.location,
            Job.source_url,
            SavedJob.created_at.label("applied_at"),
        )
        .join(Job, SavedJob.job_id == Job.id)
        .join(Company, Job.company_id == Company.id, isouter=True)
        .where(SavedJob.user_id == user["sub"], SavedJob.status == "applied")
        .order_by(SavedJob.created_at.desc())
    ).all()

    return [dict(r._mapping) for r in rows]

# ── NEW: personalized "My Applications" dashboard data ──
@router.get("/applied")
def list_applied_jobs(user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Full job + company details for every listing this user marked 'applied',
    most recently applied first. Powers the /my-applications dashboard."""
    now = datetime.now(timezone.utc)
    rows = (
        db.query(SavedJob, Job, Company)
        .join(Job, SavedJob.job_id == Job.id)
        .join(Company, Job.company_id == Company.id)
        .filter(SavedJob.user_id == user["sub"], SavedJob.status == "applied")
        .order_by(SavedJob.created_at.desc())
        .all()
    )
    return [
        {
            "id": str(job.id),
            "title": job.title,
            "location": job.location,
            "remote_type": job.remote_type,
            "commitment": job.commitment,
            "level": job.level,
            "tech_stack": job.tech_stack,
            "description": job.description,
            "salary_min": float(job.salary_min) if job.salary_min is not None else None,
            "salary_max": float(job.salary_max) if job.salary_max is not None else None,
            "source": job.source,
            "source_url": job.source_url,
            "is_featured": bool(job.featured_until and job.featured_until > now),
            "posted_at": job.posted_at.isoformat() if job.posted_at else None,
            "company_name": company.name,
            "company_domain": company.domain,
            "applied_at": saved_job.created_at.isoformat(),
        }
        for saved_job, job, company in rows
    ]