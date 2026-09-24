# backend/app/api/routes/saved_jobs.py
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert as pg_insert
from app.db.session import get_db
from app.core.security import get_current_user
from app.models.job import SavedJob, Job, Company
from app.schemas.saved_job import SavedJobCreate, SavedJobUpdate

router = APIRouter()

ALLOWED_STATUSES = {"saved", "applied", "hidden"}

@router.post("")
def save_job(payload: SavedJobCreate, user=Depends(get_current_user), db: Session = Depends(get_db)):
    if payload.status not in ALLOWED_STATUSES:
        raise HTTPException(400, "Invalid status")

    stmt = pg_insert(SavedJob).values(
        user_id=user["sub"], job_id=payload.job_id, status=payload.status,
    ).on_conflict_do_update(
        index_elements=["user_id", "job_id"], set_={"status": payload.status},
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
    record.status = payload.status
    db.commit()
    return {"ok": True}

@router.get("")
def list_saved_jobs(user=Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(SavedJob).filter_by(user_id=user["sub"]).all()

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