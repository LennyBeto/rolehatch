# backend/app/api/routes/analytics.py
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.limiter import limiter
from app.core.security import get_current_user
from app.db.session import get_db
from app.models.job import Company, Job
from app.models.job_daily_stat import JobDailyStat as Stat

# Prefix and tags are set in app/main.py
router = APIRouter()

JobId = Job.__table__.c.id.type.python_type  # matches the jobs.id column type


def _today():
    return datetime.now(timezone.utc).date()


class EventIn(BaseModel):
    type: Literal["view", "apply_click"]


@router.post("/jobs/{job_id}/event", status_code=204)
@limiter.limit("60/minute")
def record_event(request: Request, job_id: JobId, body: EventIn, db: Session = Depends(get_db)):
    """Public, privacy-light counter: one upserted row per job per day."""
    if "bot" in (request.headers.get("user-agent") or "").lower():
        return Response(status_code=204)

    is_view = body.type == "view"
    stmt = pg_insert(Stat).values(
        job_id=job_id,
        day=_today(),
        views=1 if is_view else 0,
        apply_clicks=0 if is_view else 1,
    )
    stmt = stmt.on_conflict_do_update(
        index_elements=["job_id", "day"],
        set_={
            "views": Stat.__table__.c.views + (1 if is_view else 0),
            "apply_clicks": Stat.__table__.c.apply_clicks + (0 if is_view else 1),
        },
    )
    try:
        db.execute(stmt)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=404, detail="Job not found")
    return Response(status_code=204)


@router.get("/employer/summary")
def employer_summary(
    days: int = Query(14, ge=7, le=30),
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Stats for active listings whose company domain matches the signed-in user's email domain."""
    email = (user.get("email") or "").lower()
    domain = email.rsplit("@", 1)[-1] if "@" in email else ""
    since = _today() - timedelta(days=days - 1)

    jobs = []
    if domain:
        jobs = db.execute(
            select(Job.id, Job.title)
            .join(Company, Company.id == Job.company_id)
            .where(func.lower(Company.domain) == domain, Job.is_active.is_(True))
        ).all()

    ids = [j.id for j in jobs]
    rows = (
        db.execute(
            select(Stat.job_id, Stat.day, Stat.views, Stat.apply_clicks).where(
                Stat.job_id.in_(ids), Stat.day >= since
            )
        ).all()
        if ids
        else []
    )

    per_job = defaultdict(lambda: [0, 0])
    per_day = defaultdict(lambda: [0, 0])
    for r in rows:
        per_job[r.job_id][0] += r.views
        per_job[r.job_id][1] += r.apply_clicks
        per_day[r.day][0] += r.views
        per_day[r.day][1] += r.apply_clicks

    series = []
    for i in range(days):
        d = since + timedelta(days=i)
        v, c = per_day.get(d, (0, 0))
        series.append({"day": d.isoformat(), "views": v, "apply_clicks": c})

    listings = [
        {
            "id": str(j.id),
            "title": j.title,
            "views": per_job[j.id][0],
            "apply_clicks": per_job[j.id][1],
        }
        for j in jobs
    ]
    listings.sort(key=lambda x: (x["views"], x["apply_clicks"]), reverse=True)

    return {
        "days": days,
        "totals": {
            "views": sum(s["views"] for s in series),
            "apply_clicks": sum(s["apply_clicks"] for s in series),
        },
        "series": series,
        "listings": listings,
    }