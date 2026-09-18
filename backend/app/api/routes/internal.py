# backend/app/api/routes/internal.py
from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.job import Company
from app.services.pipeline import sync_company
from app.core.config import settings

router = APIRouter()

def verify_scheduler_secret(x_scheduler_secret: str = Header(...)):
    print(f"DEBUG received: {repr(x_scheduler_secret)}")
    print(f"DEBUG expected: {repr(settings.scheduler_secret)}")
    if x_scheduler_secret != settings.scheduler_secret:
        raise HTTPException(403, "Forbidden")

@router.post("/internal/sync-jobs", dependencies=[Depends(verify_scheduler_secret)])
async def sync_all_companies(db: Session = Depends(get_db)):
    companies = db.query(Company).filter(Company.is_active.is_(True)).all()
    for company in companies:
        await sync_company(db, company)
    return {"synced": len(companies)}