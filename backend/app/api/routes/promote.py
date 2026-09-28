# backend/app/api/routes/promote.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timezone

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.job import Job, Company

router = APIRouter()


@router.get("/my-jobs")
def my_jobs(user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Return listings belonging to the signed-in user's verified company domain."""
    user_domain = user.get("email", "").split("@")[-1].lower()
    company = db.query(Company).filter(func.lower(Company.domain) == user_domain).first()
    if not company:
        return []

    jobs = db.query(Job).filter_by(company_id=company.id, is_active=True).all()
    now = datetime.now(timezone.utc)

    def _is_featured(j: Job) -> bool:
        return bool(j.featured_until and j.featured_until > now)

    # Featured listings first, then by title, so employers see promoted
    # roles at the top of their own dashboard too — mirrors public search sort.
    jobs.sort(key=lambda j: (not _is_featured(j), j.title.lower()))

    return [
        {
            "id": str(j.id),
            "title": j.title,
            "is_featured": _is_featured(j),
            "featured_until": j.featured_until.isoformat() if j.featured_until else None,
        }
        for j in jobs
    ]