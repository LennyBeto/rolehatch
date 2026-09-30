# backend/app/api/routes/internal.py
import asyncio
import hmac
import logging

import httpx
from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.core.cache import invalidate_prefixes
from app.core.config import settings
from app.db.session import get_db
from app.models.job import Company
from app.services.hidden_jobs import purge_stale_hidden_jobs
from app.services.pipeline import SCRAPERS, sync_company

logger = logging.getLogger("perchrole.internal")
router = APIRouter()

PER_COMPANY_TIMEOUT = 300  # seconds — one slow tenant must not stall the whole run


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


@router.post("/internal/sync-jobs", dependencies=[Depends(verify_scheduler_secret)])
async def sync_all_companies(platform: str | None = None, db: Session = Depends(get_db)):
    """Optional ?platform=greenhouse|lever|workday|bamboohr to split runs across schedulers."""
    query = db.query(Company).filter(
        Company.is_active.is_(True),
        Company.source_platform.in_(list(SCRAPERS.keys())),  # excludes "direct" companies
    )
    if platform:
        query = query.filter(Company.source_platform == platform)
    companies = query.all()

    results = {"synced": 0, "failed": [], "details": {}}

    for company in companies:
        try:
            results["details"][company.name] = await asyncio.wait_for(
                sync_company(db, company), timeout=PER_COMPANY_TIMEOUT
            )
            results["synced"] += 1
        except Exception as e:
            db.rollback()  # one failed company must not poison the session for the rest
            logger.exception(f"Sync failed for {company.name} ({company.source_platform})")
            results["failed"].append({
                "company": company.name,
                "source_platform": company.source_platform,
                "error": str(e) or e.__class__.__name__,  # TimeoutError has an empty message
            })

    if results["synced"] > 0:
        # Clear the API cache first, so the frontend revalidation below
        # refetches fresh data instead of the stale cached results.
        try:
            results["cache_keys_cleared"] = invalidate_prefixes("search", "facets", "stats")
        except Exception:
            logger.warning("Cache invalidation failed", exc_info=True)
        await _trigger_frontend_revalidation()

    return results


# Scheduled cleanup of hidden jobs that have stayed hidden for over 5 days, across all users.
# Complements the per-user purge that runs when a dashboard loads (GET /api/saved-jobs).
@router.post("/internal/purge-hidden-jobs", dependencies=[Depends(verify_scheduler_secret)])
def purge_hidden_jobs(db: Session = Depends(get_db)):
    deleted = purge_stale_hidden_jobs(db)
    logger.info("Purged %s stale hidden saved-job rows", deleted)
    return {"deleted": deleted}