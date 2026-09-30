# backend/app/api/routes/jobs.py
import re

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import case, func, or_, select
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.core.cache import cache_key, get_cached, set_cached
from app.core.security import get_current_user_optional
from app.db.session import get_db
from app.models.job import Job, Company
from app.models.applicant_profile import ApplicantProfile
from app.schemas.job import JobOut

router = APIRouter()

PAGE_SIZE = 15
SEARCH_CACHE_TTL = 3300   # ~55 min — just under the hourly scrape cycle
FACETS_CACHE_TTL = 1800
STATS_CACHE_TTL = 1800
JOB_DETAIL_CACHE_TTL = 3600


def build_search_query(
    db: Session,
    location: str | None,
    title: str | None,
    salary_min: int | None,
    remote_type: str | None = None,
    language: str | None = None,
    quick_filter: str | None = None,
    resume_embedding: list[float] | None = None,
):
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

    if quick_filter:
        phrases = [p.strip().lower() for p in quick_filter.split("|") if p.strip()]
        if phrases:
            q = q.where(or_(*[Job.title.ilike(f"%{p}%") for p in phrases]))

    if salary_min:
        q = q.where(Job.salary_min >= salary_min)
    if remote_type:
        types = [t.strip().lower() for t in remote_type.split(",") if t.strip()]
        if types:
            q = q.where(func.lower(Job.remote_type).in_(types))
    if language:
        langs = [l.strip().lower() for l in language.split(",") if l.strip()]
        if langs:
            q = q.where(Job.tech_stack.overlap(langs))

    if resume_embedding is not None:
        match_distance = Job.embedding.cosine_distance(resume_embedding)
        q = q.add_columns(match_distance.label("match_distance")).order_by(match_distance)
    else:
        is_featured_now = case(
            (Job.featured_until.isnot(None) & (Job.featured_until > datetime.now(timezone.utc)), 0),
            else_=1,
        )
        # Fall back to scraped_at: Lever/Workday/BambooHR jobs have no posted_at,
        # and NULLs sort FIRST under DESC in Postgres, pinning old undated jobs on top.
        # id is a final tiebreaker so pagination stays stable across pages.
        q = q.order_by(
            is_featured_now,
            func.coalesce(Job.posted_at, Job.scraped_at).desc(),
            Job.id,
        )
    return q


def _serialize_row(row, now: datetime) -> dict:
    m = row._mapping
    result = {
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
    if "match_distance" in m and m["match_distance"] is not None:
        similarity = 1 - m["match_distance"]
        result["match_score"] = max(0, min(100, round(similarity * 100)))
    return result


# ── All static/literal paths MUST come before /{job_id} ──
@router.get("/search")
def search_jobs(
    location: str | None = None,
    title: str | None = None,
    salary_min: int | None = None,
    remote_type: str | None = None,
    language: str | None = None,
    quick_filter: str | None = None,
    sort_by_match: bool = False,
    page: int = Query(1, ge=1),
    db: Session = Depends(get_db),
    user: dict | None = Depends(get_current_user_optional),
):
    resume_embedding = None
    if sort_by_match and user:
        profile = db.query(ApplicantProfile).filter_by(user_id=user["sub"]).first()
        if profile and profile.embedding is not None:
            resume_embedding = profile.embedding

    params = {
        "location": location, "title": title, "salary_min": salary_min,
        "remote_type": remote_type, "language": language,
        "quick_filter": quick_filter, "page": page,
    }
    use_cache = resume_embedding is None
    key = cache_key("search", params)
    if use_cache and (cached := get_cached(key)) is not None:
        return cached

    base_query = build_search_query(
        db, location, title, salary_min, remote_type, language, quick_filter, resume_embedding
    )

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

    if use_cache:
        set_cached(key, results, ttl_seconds=SEARCH_CACHE_TTL)
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
    # v2 key: older cached entries lack description/level/tech_stack
    key = f"job:v2:{job_id}"
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
        "level": job.level,
        "tech_stack": job.tech_stack or [],
        "description": job.description,
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