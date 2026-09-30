# backend/app/services/employer_access.py
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.job import Job, Company


def user_email_domain(user: dict) -> str:
    email = user.get("email", "")
    return email.split("@")[-1].lower() if "@" in email else ""


def verify_employer_owns_job(db: Session, user: dict, job: Job) -> bool:
    """Confirm the signed-in user's email domain matches the job's company domain."""
    company = db.query(Company).filter_by(id=job.company_id).first()
    if not company or not company.domain:
        return False
    domain = user_email_domain(user)
    return bool(domain) and domain == company.domain.lower()


def get_manageable_job(db: Session, user: dict, job_id: str) -> Job:
    """Load a job the caller may edit/delete, or raise the appropriate HTTP error."""
    try:
        job_uuid = uuid.UUID(job_id)
    except ValueError:
        raise HTTPException(404, "Job not found")

    job = db.query(Job).filter_by(id=job_uuid, is_active=True).first()
    if not job:
        raise HTTPException(404, "Job not found")

    if not verify_employer_owns_job(db, user, job):
        raise HTTPException(403, "You can only manage listings for your company's verified domain.")

    if job.source != "direct":
        raise HTTPException(
            409,
            "Synced listings are managed on your careers page and can't be edited here.",
        )
    return job


def serialize_employer_job(j: Job, now: datetime | None = None) -> dict:
    now = now or datetime.now(timezone.utc)
    return {
        "id": str(j.id),
        "title": j.title,
        "location": j.location,
        "remote_type": j.remote_type,
        "commitment": j.commitment,
        "level": j.level,
        "tech_stack": j.tech_stack,
        "salary_min": float(j.salary_min) if j.salary_min is not None else None,
        "salary_max": float(j.salary_max) if j.salary_max is not None else None,
        "description": j.description,
        "source": j.source,
        "source_url": j.source_url,
        "can_manage": j.source == "direct",
        "is_featured": bool(j.featured_until and j.featured_until > now),
        "featured_until": j.featured_until.isoformat() if j.featured_until else None,
    }