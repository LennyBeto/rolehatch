# backend/app/api/routes/internal.py
import asyncio
import hmac
import logging
import time

import httpx
from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.core.cache import invalidate_listing_caches, redis
from app.core.config import settings
from app.db.session import SessionLocal, get_db
from app.models.job import Company
from app.services.hidden_jobs import purge_stale_hidden_jobs
from app.services.pipeline import SCRAPERS, fetch_company_jobs, persist_company_jobs

logger = logging.getLogger("perchrole.internal")
router = APIRouter()

PER_COMPANY_TIMEOUT = 1800  # seconds — one slow tenant must not stall the whole run
SYNC_CONCURRENCY = 6        # companies synced in parallel
SYNC_LOCK_TTL = 3300        # auto-expires if a run crashes; < 1h so the next tick can run


def verify_scheduler_secret(x_scheduler_secret: str = Header(...)):
    if not hmac.compare_digest(
        x_scheduler_secret.encode(), settings.scheduler_secret.encode()
    ):
        raise HTTPException(403, "Forbidden")


async def _trigger_frontend_revalidation():
    """Growth: bust the frontend's sitemap/homepage cache right after a sync
    so freshly scraped listings show up immediately, rather than waiting out
    Next.js's ISR window — keeps Google's crawl signal and returning
    visitors' first paint both current with what just got scraped."""
    if not settings.revalidate_secret:
        return
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            await client.post(
                f"{settings.frontend_url}/api/revalidate",
                params={"secret": settings.revalidate_secret},
            )
    except Exception:
        logger.warning("Failed to trigger frontend revalidation", exc_info=True)


def _persist_in_own_session(company_id, raw_jobs: list[dict]) -> dict:
    """Each concurrent company needs its own Session (Sessions aren't thread-safe)."""
    session = SessionLocal()
    try:
        company = session.get(Company, company_id)
        return persist_company_jobs(session, company, raw_jobs)
    finally:
        session.close()


def _acquire_lock(key: str) -> bool:
    try:
        return bool(redis.set(key, "1", nx=True, ex=SYNC_LOCK_TTL))
    except Exception:
        logger.warning("Sync lock unavailable (Redis error) — running without it", exc_info=True)
        return True


def _release_lock(key: str) -> None:
    try:
        redis.delete(key)
    except Exception:
        logger.warning("Could not release sync lock %s (it will expire on its own)", key)


# Plain `def` (not `async def`): FastAPI runs it in a worker thread, so the
# blocking DB/Redis calls inside the sync no longer stall the event loop that
# serves every other user's requests. The async scrapers run on a private
# event loop inside this thread via asyncio.run().
@router.post("/internal/sync-jobs", dependencies=[Depends(verify_scheduler_secret)])
def sync_all_companies(platform: str | None = None, db: Session = Depends(get_db)):
    """Optional ?platform=greenhouse|lever|workday|bamboohr|ashby|smartrecruiters|workable|recruitee
    to split runs across schedulers."""
    lock_key = f"lock:sync-jobs:{platform or 'all'}"
    if not _acquire_lock(lock_key):
        return {"skipped": "previous sync still running", "platform": platform}

    started = time.monotonic()
    try:
        query = db.query(Company).filter(
            Company.is_active.is_(True),
            Company.source_platform.in_(list(SCRAPERS.keys())),  # excludes "direct" companies
        )
        if platform:
            query = query.filter(Company.source_platform == platform)
        companies = query.all()

        results = {"synced": 0, "failed": [], "details": {}}

        async def run():
            sem = asyncio.Semaphore(SYNC_CONCURRENCY)

            async def worker(company: Company):
                name, source_platform = company.name, company.source_platform
                try:
                    async with sem:
                        # Timeout covers the network step only; persisting is a short
                        # DB write and must never be cancelled halfway.
                        raw_jobs = await asyncio.wait_for(
                            fetch_company_jobs(company), timeout=PER_COMPANY_TIMEOUT
                        )
                        stats = await asyncio.to_thread(
                            _persist_in_own_session, company.id, raw_jobs
                        )
                    return name, source_platform, stats, None
                except Exception as e:
                    logger.exception(f"Sync failed for {name} ({source_platform})")
                    return name, source_platform, None, e

            outcomes = await asyncio.gather(*(worker(c) for c in companies))

            for name, source_platform, stats, err in outcomes:
                if err is None:
                    results["details"][name] = stats
                    results["synced"] += 1
                else:
                    results["failed"].append({
                        "company": name,
                        "source_platform": source_platform,
                        "error": str(err) or err.__class__.__name__,  # TimeoutError has an empty message
                    })

            if results["synced"] > 0:
                # Clear the API cache first, so the frontend revalidation below
                # refetches fresh data instead of the stale cached results.
                try:
                    results["cache_keys_cleared"] = await asyncio.to_thread(invalidate_listing_caches)
                except Exception:
                    logger.warning("Cache invalidation failed", exc_info=True)
                await _trigger_frontend_revalidation()

        asyncio.run(run())
        results["duration_seconds"] = round(time.monotonic() - started, 1)
        logger.info(
            "sync-jobs finished: synced=%s failed=%s duration=%ss",
            results["synced"], len(results["failed"]), results["duration_seconds"],
        )
        return results
    finally:
        _release_lock(lock_key)


# Scheduled cleanup of hidden jobs that have stayed hidden for over 5 days, across all users.
# Complements the per-user purge that runs when a dashboard loads (GET /api/saved-jobs).
@router.post("/internal/purge-hidden-jobs", dependencies=[Depends(verify_scheduler_secret)])
def purge_hidden_jobs(db: Session = Depends(get_db)):
    deleted = purge_stale_hidden_jobs(db)
    logger.info("Purged %s stale hidden saved-job rows", deleted)
    return {"deleted": deleted}