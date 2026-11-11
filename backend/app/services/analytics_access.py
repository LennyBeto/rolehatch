# backend/app/services/analytics_access.py
from sqlalchemy.orm import Session

from app.services import billing


def allowed_days(db: Session, user: dict) -> int:
    """Widest analytics window (days) this employer's plan allows."""
    return billing.analytics_days_for(db, billing.email_domain(user.get("email")))


def clamp_days(db: Session, user: dict, days: int) -> int:
    """Never serve a window wider than the plan allows."""
    return max(1, min(days, allowed_days(db, user)))