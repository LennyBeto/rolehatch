# backend/app/api/routes/companies.py — new file, powers the logo ribbon
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.job import Company

router = APIRouter()

@router.get("/featured")
def get_featured_companies(db: Session = Depends(get_db)):
    companies = (
        db.query(Company)
        .filter(Company.is_active.is_(True), Company.domain.isnot(None))
        .limit(12)
        .all()
    )
    return [{"name": c.name, "domain": c.domain} for c in companies]