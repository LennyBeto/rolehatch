# backend/app/api/routes/jobs.py — full corrected order
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import case, func
from sqlalchemy.orm import Session, joinedload
from datetime import datetime, timezone

from app.core.cache import cache_key, get_cached, set_cached
from app.db.session import get_db
from app.models.job import Job, Company
from app.schemas.job import JobOut

router = APIRouter()

PAGE_SIZE = 15


def build_search_query(
    db: Session,
    location: str | None,
    title: str | None,
    salary_min: int | None,
    remote_type: str | None = None,
):
    q = (
        db.query(Job)
        .options(joinedload(Job.company))
        .filter(Job.is_active.is_(True))
    )
    if location:
        q = q.filter(Job.location.ilike(f"%{location}%"))
    if title:
        q = q.filter(Job.title.ilike(f"%{title}%"))
    if salary_min:
        q = q.filter(Job.salary_min >= salary_min)
    if remote_type:
        types = [t.strip() for t in remote_type.split(",") if t.strip()]
        if types:
            q = q.filter(Job.remote_type.in_(types))

    is_featured_now = case(
        (Job.featured_until.isnot(None) & (Job.featured_until > datetime.now(timezone.utc)), 0),
        else_=1,
    )
    return q.order_by(is_featured_now, Job.posted_at.desc())


def _serialize_job(j: Job, now: datetime) -> dict:
    data = JobOut.model_validate(j).model_dump(mode="json")
    data["is_featured"] = bool(j.featured_until and j.featured_until > now)
    data["company_name"] = j.company.name if j.company else None
    data["company_domain"] = j.company.domain if j.company else None
    return data


# ── All static/literal paths MUST come before /{job_id} ──
# FastAPI matches routes in declaration order — /{job_id} is a catch-all
# that will otherwise swallow /search, /facets, and /stats as if they
# were job IDs, causing Postgres UUID-cast errors like 22P02.

@router.get("/search")
def search_jobs(
    location: str | None = None,
    title: str | None = None,
    salary_min: int | None = None,
    remote_type: str | None = None,
    page: int = Query(1, ge=1),
    db: Session = Depends(get_db),
):
    params = {
        "location": location, "title": title, "salary_min": salary_min,
        "remote_type": remote_type, "page": page,
    }
    key = cache_key("search", params)
    if (cached := get_cached(key)) is not None:
        return cached

    base_query = build_search_query(db, location, title, salary_min, remote_type)
    total = base_query.order_by(None).count()

    offset = (page - 1) * PAGE_SIZE
    jobs = base_query.offset(offset).limit(PAGE_SIZE).all()

    now = datetime.now(timezone.utc)
    results = {
        "jobs": [_serialize_job(j, now) for j in jobs],
        "total": total,
        "page": page,
        "page_size": PAGE_SIZE,
        "total_pages": (total + PAGE_SIZE - 1) // PAGE_SIZE,
    }

    set_cached(key, results, ttl_seconds=600)
    return results


@router.get("/facets")
def get_facets(db: Session = Depends(get_db)):
    key = "facets:global"
    if (cached := get_cached(key)) is not None:
        return cached

    remote_counts = (
        db.query(Job.remote_type, func.count(Job.id))
        .filter(Job.is_active.is_(True), Job.remote_type.isnot(None))
        .group_by(Job.remote_type)
        .all()
    )
    facets = {"remote_type": {rt: count for rt, count in remote_counts}}

    set_cached(key, facets, ttl_seconds=900)
    return facets


@router.get("/stats")
def get_platform_stats(db: Session = Depends(get_db)):
    key = "stats:global"
    if (cached := get_cached(key)) is not None:
        return cached

    total_jobs = db.query(Job).filter(Job.is_active.is_(True)).count()
    total_companies = db.query(Company).filter(Company.is_active.is_(True)).count()

    stats = {"total_jobs": total_jobs, "total_companies": total_companies}
    set_cached(key, stats, ttl_seconds=1800)
    return stats


# ── Dynamic path last ──
@router.get("/{job_id}")
def get_job(job_id: str, db: Session = Depends(get_db)):
    key = f"job:{job_id}"
    if (cached := get_cached(key)) is not None:
        return cached

    job = (
        db.query(Job)
        .options(joinedload(Job.company))
        .filter_by(id=job_id, is_active=True)
        .first()
    )
    if not job:
        raise HTTPException(404, "Job not found")

    result = _serialize_job(job, datetime.now(timezone.utc))
    set_cached(key, result, ttl_seconds=3600)
    return result