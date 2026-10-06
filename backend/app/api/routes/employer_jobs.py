# backend/app/api/routes/employer_jobs.py
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.cache import invalidate_job_caches
from app.core.domains import get_employer_domain
from app.core.limiter import limiter
from app.core.security import get_current_user
from app.db.session import get_db
from app.models.job import Job, Company
from app.schemas.employer_job import JobPostCreate, JobPostUpdate
from app.services.employer_access import (
    get_manageable_job,
    serialize_employer_job,
)

router = APIRouter()


@router.post("", status_code=201)
@limiter.limit("10/hour")  # prevent spam/abuse of manual job creation
def create_job_posting(
    request: Request,
    payload: JobPostCreate,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    domain = get_employer_domain(user)  # 400 if no email, 403 if personal mailbox (Gmail, etc.)

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
        description=payload.description,
        source="direct",
        source_url=str(payload.apply_url),
        external_id=f"direct-{uuid.uuid4()}",  # no upstream source to dedup against — always unique
        is_active=True,
        posted_at=datetime.now(timezone.utc),
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    invalidate_job_caches()  # new listing should appear in search immediately

    return {"ok": True, "job_id": str(job.id), "company_name": company.name}


@router.patch("/{job_id}")
@limiter.limit("30/hour")
def update_job_posting(
    request: Request,
    job_id: str,
    payload: JobPostUpdate,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    job = get_manageable_job(db, user, job_id)

    changes = payload.model_dump(exclude_unset=True)
    if "apply_url" in changes:
        changes["source_url"] = str(changes.pop("apply_url"))

    new_min = changes.get("salary_min", job.salary_min)
    new_max = changes.get("salary_max", job.salary_max)
    if new_min is not None and new_max is not None and new_min > new_max:
        raise HTTPException(422, "Minimum salary can't be greater than maximum salary")

    for field, value in changes.items():
        setattr(job, field, value)
    db.commit()
    db.refresh(job)

    invalidate_job_caches(str(job.id))
    return serialize_employer_job(job)


@router.delete("/{job_id}", status_code=204)
@limiter.limit("30/hour")
def delete_job_posting(
    request: Request,
    job_id: str,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    job = get_manageable_job(db, user, job_id)
    job.is_active = False  # soft delete — hidden from search and dashboard
    db.commit()

    invalidate_job_caches(str(job.id))
    return Response(status_code=204)