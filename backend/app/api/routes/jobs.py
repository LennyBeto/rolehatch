# backend/app/api/routes/jobs.py
import re
import statistics

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import case, func, or_, select
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.core.cache import cache_key, get_cached, set_cached
from app.db.session import get_db
from app.models.job import Job, Company
from app.schemas.job import JobOut

router = APIRouter()

PAGE_SIZE = 15
SEARCH_CACHE_TTL = 3300   # ~55 min — just under the hourly scrape cycle
SALARY_INSIGHTS_CACHE_TTL = 3600  # 1 hr — matches scrape cadence, no point recomputing more often
FACETS_CACHE_TTL = 1800
STATS_CACHE_TTL = 1800
JOB_DETAIL_CACHE_TTL = 3600


def build_search_query(
    db: Session,
    location: str | None,
    title: str | None,
    salary_min: int | None,
    remote_type: str | None = None,
):
    # Column-level select instead of full ORM hydration — only pulls the
    # fields actually returned to the frontend, skipping heavier columns
    # like Job.external_id, Job.scraped_at, Company.industry, Company.board_token.
    q = (
        select(
            Job.id, Job.title, Job.location, Job.remote_type, Job.commitment,
            Job.level, Job.tech_stack, Job.description,
            Job.salary_min, Job.salary_max, Job.source, Job.source_url,
            Job.is_active, Job.featured_until, Job.posted_at,
            Company.name.label("company_name"), Company.domain.label("company_domain"),
        )
        .join(Company, Job.company_id == Company.id)
        .where(Job.is_active.is_(True))
    )
    if location:
        q = q.where(Job.location.ilike(f"%{location}%"))
    if title:
        title_variants = [
            part.strip()
            for part in re.split(r"\s*(?:,|/|\||\band\b)\s*", title.lower())
            if part and part.strip()
        ]
        if not title_variants:
            title_variants = [title.strip()]

        phrases = []
        words = []
        for variant in title_variants:
            clean_variant = variant.strip()
            if clean_variant:
                phrases.append(clean_variant)
                words.extend(word for word in re.split(r"\s+", clean_variant) if word)

        title_filters = [Job.title.ilike(f"%{phrase}%") for phrase in phrases]
        title_filters.extend(Job.title.ilike(f"%{word}%") for word in words)
        if title_filters:
            q = q.where(or_(*title_filters))
    if salary_min:
        q = q.where(Job.salary_min >= salary_min)
    if remote_type:
        types = [t.strip().lower() for t in remote_type.split(",") if t.strip()]
        if types:
            q = q.where(func.lower(Job.remote_type).in_(types))

    is_featured_now = case(
        (Job.featured_until.isnot(None) & (Job.featured_until > datetime.now(timezone.utc)), 0),
        else_=1,
    )
    return q.order_by(is_featured_now, Job.posted_at.desc())


def _serialize_row(row, now: datetime) -> dict:
    m = row._mapping
    return {
        "id": str(m["id"]),
        "title": m["title"],
        "location": m["location"],
        "remote_type": m["remote_type"],
        "commitment": m["commitment"],
        "level": m["level"],
        "tech_stack": m["tech_stack"],
        "description": m["description"],
        "salary_min": float(m["salary_min"]) if m["salary_min"] is not None else None,
        "salary_max": float(m["salary_max"]) if m["salary_max"] is not None else None,
        "source": m["source"],
        "source_url": m["source_url"],
        "is_active": m["is_active"],
        "is_featured": bool(m["featured_until"] and m["featured_until"] > now),
        "posted_at": m["posted_at"].isoformat() if m["posted_at"] else None,
        "company_name": m["company_name"],
        "company_domain": m["company_domain"],
    }


# ── All static/literal paths MUST come before /{job_id} ──
# FastAPI matches routes in declaration order — /{job_id} is a catch-all
# that will otherwise swallow /search, /facets, and /stats as if they
# were job IDs, causing Postgres UUID cast errors (22P02).

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

    count_query = select(func.count()).select_from(base_query.order_by(None).subquery())
    total = db.execute(count_query).scalar_one()

    offset = (page - 1) * PAGE_SIZE
    rows = db.execute(base_query.offset(offset).limit(PAGE_SIZE)).all()

    now = datetime.now(timezone.utc)
    results = {
        "jobs": [_serialize_row(r, now) for r in rows],
        "total": total,
        "page": page,
        "page_size": PAGE_SIZE,
        "total_pages": (total + PAGE_SIZE - 1) // PAGE_SIZE,
    }

    set_cached(key, results, ttl_seconds=SEARCH_CACHE_TTL)
    return results

@router.get("/salary-insights")
def get_salary_insights(
    title: str = Query(..., min_length=1),
    company_domain: str | None = None,
    db: Session = Depends(get_db),
):
    """
    Aggregated salary range for a role title, optionally scoped to one company.
    Pulls from active listings that actually have salary data. Thin samples are
    flagged (not hidden) so the frontend can decide how to present them.
    """
    params = {"title": title, "company_domain": company_domain}
    key = cache_key("salary_insights", params)
    if (cached := get_cached(key)) is not None:
        return cached

    q = (
        select(Job.salary_min, Job.salary_max)
        .join(Company, Job.company_id == Company.id)
        .where(
            Job.is_active.is_(True),
            Job.salary_min.isnot(None),
            Job.title.ilike(f"%{title}%"),
        )
    )
    if company_domain:
        q = q.where(func.lower(Company.domain) == company_domain.lower())

    rows = db.execute(q).all()
    mins = [float(r.salary_min) for r in rows if r.salary_min is not None]
    maxs = [float(r.salary_max) for r in rows if r.salary_max is not None] or mins

    if not mins:
        result = {
            "title": title, "company_domain": company_domain,
            "sample_size": 0, "low_confidence": True,
            "salary_min": None, "salary_median": None, "salary_max": None,
        }
    else:
        result = {
            "title": title,
            "company_domain": company_domain,
            "sample_size": len(mins),
            "low_confidence": len(mins) < 3,  # fewer than 3 listings — don't trust the range
            "salary_min": min(mins),
            "salary_median": round(statistics.median(mins + maxs), 2),
            "salary_max": max(maxs),
        }

    set_cached(key, result, ttl_seconds=SALARY_INSIGHTS_CACHE_TTL)
    return result

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

    set_cached(key, facets, ttl_seconds=FACETS_CACHE_TTL)
    return facets


@router.get("/stats")
def get_platform_stats(db: Session = Depends(get_db)):
    key = "stats:global"
    if (cached := get_cached(key)) is not None:
        return cached

    total_jobs = db.query(Job).filter(Job.is_active.is_(True)).count()
    total_companies = db.query(Company).filter(Company.is_active.is_(True)).count()

    stats = {"total_jobs": total_jobs, "total_companies": total_companies}
    set_cached(key, stats, ttl_seconds=STATS_CACHE_TTL)
    return stats


# ── Dynamic path last ──
@router.get("/{job_id}")
def get_job(job_id: str, db: Session = Depends(get_db)):
    key = f"job:{job_id}"
    if (cached := get_cached(key)) is not None:
        return cached

    job = db.query(Job).filter_by(id=job_id, is_active=True).first()
    if not job:
        raise HTTPException(404, "Job not found")

    company = job.company
    now = datetime.now(timezone.utc)
    result = {
        "id": str(job.id),
        "title": job.title,
        "location": job.location,
        "remote_type": job.remote_type,
        "commitment": job.commitment,
        "salary_min": float(job.salary_min) if job.salary_min is not None else None,
        "salary_max": float(job.salary_max) if job.salary_max is not None else None,
        "source": job.source,
        "source_url": job.source_url,
        "is_active": job.is_active,
        "is_featured": bool(job.featured_until and job.featured_until > now),
        "posted_at": job.posted_at.isoformat() if job.posted_at else None,
        "company_name": company.name if company else None,
        "company_domain": company.domain if company else None,
    }
    set_cached(key, result, ttl_seconds=JOB_DETAIL_CACHE_TTL)
    return result