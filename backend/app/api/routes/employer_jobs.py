# backend/app/api/routes/employer_jobs.py
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import func
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.job import Job, Company
from app.schemas.employer_job import JobPostCreate

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


@router.post("", status_code=201)
@limiter.limit("10/hour")  # prevent spam/abuse of manual job creation
def create_job_posting(
    request: Request,
    payload: JobPostCreate,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_email = user.get("email", "")
    domain = user_email.split("@")[-1].lower() if "@" in user_email else None
    if not domain:
        raise HTTPException(400, "Could not determine your company domain from your account email")

    company = db.query(Company).filter(func.lower(Company.domain) == domain).first()
    if not company:
        # First time this domain has posted — provision the company record automatically,
        # scoped to the exact email domain that created it (same trust model as promote.py).
        company = Company(
            id=uuid.uuid4(),
            name=payload.company_name,
            domain=domain,
            source_platform="direct",
            is_active=True,
        )
        db.add(company)
        db.flush()

    job = Job(
        id=uuid.uuid4(),
        company_id=company.id,
        title=payload.title,
        location=payload.location,
        remote_type=payload.remote_type,
        commitment=payload.commitment,
        salary_min=payload.salary_min,
        salary_max=payload.salary_max,
        source="direct",
        source_url=str(payload.apply_url),
        external_id=f"direct-{uuid.uuid4()}",  # no upstream source to dedup against — always unique
        is_active=True,
        posted_at=datetime.now(timezone.utc),
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    return {"ok": True, "job_id": str(job.id), "company_name": company.name}