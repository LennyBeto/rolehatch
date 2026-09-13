# backend/app/api/routes/jobs.py — priority-order caching applied
from fastapi import APIRouter, Query
from app.core.cache import cache_key, get_cached, set_cached

router = APIRouter()

@router.get("/search")
def search_jobs(location: str | None = None, title: str | None = None, salary_min: int | None = None):
    params = {"location": location, "title": title, "salary_min": salary_min}
    key = cache_key("search", params)
    if (cached := get_cached(key)) is not None:
        return cached
    results = []  # ← Postgres query goes here
    set_cached(key, results, ttl_seconds=600)  # 10 min TTL — search results
    return results

@router.get("/{job_id}")
def get_job(job_id: str):
    key = f"job:{job_id}"
    if (cached := get_cached(key)) is not None:
        return cached
    job = {}  # ← Postgres fetch
    set_cached(key, job, ttl_seconds=3600)  # 1 hr — individual listings change rarely
    return job

@router.get("/facets")
def get_facets():
    key = "facets:global"
    if (cached := get_cached(key)) is not None:
        return cached
    facets = {}  # ← aggregation query, refreshed on a schedule not per-request
    set_cached(key, facets, ttl_seconds=900)
    return facets