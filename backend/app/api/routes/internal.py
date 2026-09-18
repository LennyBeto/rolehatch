# backend/app/api/routes/internal.py
from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.job import Company
from app.services.pipeline import sync_company
from app.core.config import settings
import logging

logger = logging.getLogger("rolehatch.internal")
router = APIRouter()


def verify_scheduler_secret(x_scheduler_secret: str = Header(...)):
    if x_scheduler_secret != settings.scheduler_secret:
        raise HTTPException(403, "Forbidden")


@router.post("/internal/sync-jobs", dependencies=[Depends(verify_scheduler_secret)])
async def sync_all_companies(db: Session = Depends(get_db)):
    companies = db.query(Company).filter(Company.is_active.is_(True)).all()
    results = {"synced": 0, "failed": []}

    for company in companies:
        try:
            await sync_company(db, company)
            results["synced"] += 1
        except Exception as e:
            # Log the full traceback AND report it back in the response —
            # so you see the real error without having to dig through terminal scrollback
            logger.exception(f"Sync failed for {company.name} ({company.source_platform})")
            results["failed"].append({
                "company": company.name,
                "source_platform": company.source_platform,
                "error": str(e),
            })

    return results