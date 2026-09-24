# backend/app/api/routes/internal.py
import httpx
from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.job import Company
from app.services.pipeline import sync_company
from app.core.config import settings
import logging

logger = logging.getLogger("perchrole.internal")
router = APIRouter()


def verify_scheduler_secret(x_scheduler_secret: str = Header(...)):
    if x_scheduler_secret != settings.scheduler_secret:
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
async def sync_all_companies(db: Session = Depends(get_db)):
    companies = db.query(Company).filter(Company.is_active.is_(True)).all()
    results = {"synced": 0, "failed": []}

    for company in companies:
        try:
            await sync_company(db, company)
            results["synced"] += 1
        except Exception as e:
            logger.exception(f"Sync failed for {company.name} ({company.source_platform})")
            results["failed"].append({
                "company": company.name,
                "source_platform": company.source_platform,
                "error": str(e),
            })

    if results["synced"] > 0:
        await _trigger_frontend_revalidation()

    return results