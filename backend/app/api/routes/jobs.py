# backend/app/api/routes/jobs.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import case, func
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.core.cache import cache_key, get_cached, set_cached
from app.db.session import get_db
from app.models.job import Job, Company
from app.schemas.job import JobOut

router = APIRouter()


def build_search_query(db: Session, location: str | None, title: str | None, salary_min: int | None):
    q = db.query(Job).filter(Job.is_active.is_(True))
    if location:
        q = q.filter(Job.location.ilike(f"%{location}%"))
    if title:
        q = q.filter(Job.title.ilike(f"%{title}%"))
    if salary_min:
        q = q.filter(Job.salary_min >= salary_min)

    is_featured_now = case(
        (Job.featured_until.isnot(None) & (Job.featured_until > datetime.now(timezone.utc)), 0),
        else_=1,
    )
    return q.order_by(is_featured_now, Job.posted_at.desc())


@router.get("/search", response_model=list[JobOut])
def search_jobs(
    location: str | None = None,
    title: str | None = None,
    salary_min: int | None = None,
    db: Session = Depends(get_db),
):
    params = {"location": location, "title": title, "salary_min": salary_min}
    key = cache_key("search", params)
    if (cached := get_cached(key)) is not None:
        return cached

    jobs = build_search_query(db, location, title, salary_min).limit(50).all()
    results = [JobOut.model_validate(j).model_dump(mode="json") for j in jobs]

    set_cached(key, results, ttl_seconds=600)  # 10 min TTL — search results
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

    set_cached(key, facets, ttl_seconds=900)  # refreshed on a schedule, not per-request
    return facets


@router.get("/{job_id}", response_model=JobOut)
def get_job(job_id: str, db: Session = Depends(get_db)):
    key = f"job:{job_id}"
    if (cached := get_cached(key)) is not None:
        return cached

    job = db.query(Job).filter_by(id=job_id, is_active=True).first()
    if not job:
        raise HTTPException(404, "Job not found")

    result = JobOut.model_validate(job).model_dump(mode="json")
    set_cached(key, result, ttl_seconds=3600)  # 1 hr — individual listings change rarely
    return result