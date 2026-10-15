# backend/app/api/routes/jobs.py
import re
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import String, case, cast, func, or_, select
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.core.cache import cache_key, get_cached, job_detail_key, set_cached
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

# Bumped so stale cached results are discarded (new remote_type values, salary range
# semantics, title/tech matching). cache.py invalidates with the wildcard 'search*',
# so a future bump needs no other change.
SEARCH_CACHE_PREFIX = "search_v4"

SALARY_SLIDER_MAX = 300   # slider's top end ($k) — treated as "no upper limit"
SHORT_TERM_LEN = 3        # terms this short match on word boundaries ("pm" != "development")

# Maps what the UI may send -> the exact lowercase keywords pipeline.py stores in Job.tech_stack
LANGUAGE_ALIASES = {
    "go": ["go", "golang"],
    "golang": ["go", "golang"],
    "postgres": ["postgres", "postgresql"],
    "postgresql": ["postgres", "postgresql"],
    "node": ["node.js"],
    "nodejs": ["node.js"],
    "js": ["javascript"],
    "ts": ["typescript"],
    "dotnet": [".net"],
}

# Terms too ambiguous to match against free-text titles ("Go-to-Market Manager")
TITLE_FALLBACK_SKIP = {"go"}


def _normalize_languages(raw: str | None) -> list[str]:
    if not raw:
        return []
    out: list[str] = []
    for part in raw.split(","):
        key = part.strip().lower()
        if not key:
            continue
        for value in LANGUAGE_ALIASES.get(key, [key]):
            if value not in out:
                out.append(value)
    return out[:20]


def _title_match(term: str):
    """Short alphanumeric terms (pm, sre, ai, ux) match whole words only;
    everything else is a substring match."""
    if len(term) <= SHORT_TERM_LEN and term.isalnum():
        return Job.title.op("~*")(rf"\m{term}\M")
    return Job.title.ilike(f"%{term}%")


def build_search_query(
    db: Session,
    location: str | None,
    title: str | None,
    salary_min: int | None,
    remote_type: str | None = None,
    languages: str | None = None,
    quick_filter: str | None = None,
    resume_embedding: list[float] | None = None,
    salary_max: int | None = None,
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

        title_filters = [_title_match(t) for t in dict.fromkeys(phrases + words)]
        # Also match the tech stack, so "python" finds a "Backend Engineer" role
        # that lists Python in its description.
        title_tech = _normalize_languages(",".join(words))
        if title_tech:
            title_filters.append(Job.tech_stack.overlap(cast(title_tech, ARRAY(String))))
        if title_filters:
            q = q.where(or_(*title_filters))

    if quick_filter:
        phrases = [p.strip().lower() for p in quick_filter.split("|") if p.strip()]
        if phrases:
            q = q.where(or_(*[_title_match(p) for p in phrases]))

    # Salary: a job matches when its range overlaps the selected range. Jobs with
    # no listed salary are excluded only while a salary filter is active.
    has_cap = salary_max is not None and salary_max < SALARY_SLIDER_MAX
    if salary_min or has_cap:
        job_low = func.coalesce(Job.salary_min, Job.salary_max)
        job_high = func.coalesce(Job.salary_max, Job.salary_min)
        if salary_min:
            q = q.where(job_high >= salary_min)
        if has_cap:
            q = q.where(job_low <= salary_max)

    if remote_type:
        types = [t.strip().lower() for t in remote_type.split(",") if t.strip()]
        if types:
            q = q.where(func.lower(Job.remote_type).in_(types))

    langs = _normalize_languages(languages)
    if langs:
        # Explicit VARCHAR[] cast so `&&` compares varchar[] with varchar[]
        # (a bare Python list can bind as text[] and fail operator resolution).
        lang_filters = [Job.tech_stack.overlap(cast(langs, ARRAY(String)))]
        # Fallback for jobs whose tech_stack is empty: language named as a whole word in the title.
        for lang in langs:
            if lang in TITLE_FALLBACK_SKIP:
                continue
            pattern = rf"(^|[^a-z0-9+#]){re.escape(lang)}($|[^a-z0-9+#])"
            lang_filters.append(Job.title.op("~*")(pattern))
        q = q.where(or_(*lang_filters))

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
    salary_max: int | None = None,
    remote_type: str | None = None,
    languages: str | None = None,   # comma-separated, e.g. "python,go"
    language: str | None = None,    # legacy alias for `languages`
    quick_filter: str | None = None,
    sort_by_match: bool = False,
    page: int = Query(1, ge=1),
    db: Session = Depends(get_db),
    user: dict | None = Depends(get_current_user_optional),
):
    # Merge both param names, normalize, and use the normalized form everywhere
    normalized_langs = _normalize_languages(",".join(p for p in (languages, language) if p))
    languages_csv = ",".join(normalized_langs) or None

    resume_embedding = None
    if sort_by_match and user:
        profile = db.query(ApplicantProfile).filter_by(user_id=user["sub"]).first()
        if profile and profile.embedding is not None:
            resume_embedding = profile.embedding

    params = {
        "location": location, "title": title, "salary_min": salary_min,
        "salary_max": salary_max, "remote_type": remote_type,
        "languages": sorted(normalized_langs) or None,
        "quick_filter": quick_filter, "page": page,
    }
    use_cache = resume_embedding is None
    key = cache_key(SEARCH_CACHE_PREFIX, params)
    if use_cache and (cached := get_cached(key)) is not None:
        return cached

    base_query = build_search_query(
        db, location, title, salary_min, remote_type, languages_csv, quick_filter,
        resume_embedding, salary_max=salary_max,
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
    # A non-UUID id would otherwise hit Postgres as a bad cast (22P02) and return 500.
    try:
        job_id = str(uuid.UUID(job_id))
    except ValueError:
        raise HTTPException(404, "Job not found")

    key = job_detail_key(job_id)  # versioned in cache.py; also what invalidation deletes
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