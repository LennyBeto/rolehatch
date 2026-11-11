# backend/app/api/routes/companies.py
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import case, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.billing import EmployerSubscription
from app.models.company_profile import CompanyProfile
from app.models.job import Company, Job
from app.schemas.company_profile import CompanyProfileUpdate
from app.services import billing

router = APIRouter()

MAX_LOGOS = 12
MAX_COMPANY_JOBS = 50
PROFILE_FIELDS = ("tagline", "about", "website_url", "careers_url", "headquarters", "company_size")


def _company_by_domain(db: Session, domain: str) -> Company | None:
    if not domain:
        return None
    return (
        db.query(Company)
        .filter(func.lower(Company.domain) == domain, Company.is_active.is_(True))
        .first()
    )


def _has_company_page(db: Session, domain: str) -> bool:
    """True while the domain has a live plan that includes the company page.

    .get() so a plan id that no longer exists in PLANS degrades to "no company page"
    instead of a 500 on a public page."""
    sub = billing.live_subscription(db, domain)
    if not sub:
        return False
    return bool(billing.PLANS.get(sub.plan_id, {}).get("company_page"))


def _partner_plan_ids() -> list[str]:
    """Plans that include the homepage hiring-partner logo (driven by billing.PLANS)."""
    return [plan_id for plan_id, plan in billing.PLANS.items() if plan.get("partner_logo")]


def _profile_dict(profile: CompanyProfile | None) -> dict:
    return {f: getattr(profile, f, None) if profile else None for f in PROFILE_FIELDS}


def _job_dict(j: Job, company: Company, now: datetime) -> dict:
    # Same shape as /api/jobs/search so the existing JobCard renders it unchanged.
    return {
        "id": str(j.id),
        "title": j.title,
        "location": j.location,
        "remote_type": j.remote_type,
        "commitment": j.commitment,
        "level": j.level,
        "tech_stack": j.tech_stack or [],
        "description": j.description,
        "salary_min": float(j.salary_min) if j.salary_min is not None else None,
        "salary_max": float(j.salary_max) if j.salary_max is not None else None,
        "source": j.source,
        "source_url": j.source_url,
        "is_active": j.is_active,
        "is_featured": bool(j.featured_until and j.featured_until > now),
        "posted_at": j.posted_at.isoformat() if j.posted_at else None,
        "company_name": company.name,
        "company_domain": company.domain,
    }


@router.get("/featured")
def get_featured_companies(db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)

    # Plans with the partner-logo perk (Enterprise today) get a homepage logo while paid.
    partner_domains = [
        s.email_domain
        for s in db.query(EmployerSubscription).filter(
            EmployerSubscription.plan_id.in_(_partner_plan_ids()),
            EmployerSubscription.status.in_(["active", "cancelled"]),
            EmployerSubscription.current_period_end > now,
        ).all()
    ]

    partners = []
    if partner_domains:
        partners = (
            db.query(Company)
            .filter(
                Company.is_active.is_(True),
                func.lower(Company.domain).in_(partner_domains),
            )
            .all()
        )

    query = db.query(Company).filter(Company.is_active.is_(True), Company.domain.isnot(None))
    if partners:
        query = query.filter(Company.id.notin_([p.id for p in partners]))
    others = query.limit(MAX_LOGOS).all()

    ordered = (partners + others)[:MAX_LOGOS]
    partner_ids = {p.id for p in partners}
    return [
        {"name": c.name, "domain": c.domain, "partner": c.id in partner_ids}
        for c in ordered
    ]


# ── Employer's own company page (literal paths must stay above /{domain}) ──

@router.get("/me/profile")
def get_my_company_profile(user=Depends(get_current_user), db: Session = Depends(get_db)):
    domain = billing.email_domain(user.get("email"))
    company = _company_by_domain(db, domain)
    profile = (
        db.query(CompanyProfile).filter_by(company_id=company.id).first() if company else None
    )
    return {
        "domain": domain,
        "company_exists": company is not None,
        "company_name": company.name if company else None,
        "has_access": bool(domain) and _has_company_page(db, domain),
        "profile": _profile_dict(profile),
    }


@router.patch("/me/profile")
def update_my_company_profile(
    payload: CompanyProfileUpdate,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    domain = billing.email_domain(user.get("email"))
    if not domain:
        raise HTTPException(400, "Could not determine your company domain from your account email")
    if not _has_company_page(db, domain):
        raise HTTPException(402, "The company page is included with the Enterprise plan")

    company = _company_by_domain(db, domain)
    if not company:
        raise HTTPException(404, "Post a job first so PerchRole can create your company page")

    data = payload.model_dump()
    for url_field in ("website_url", "careers_url"):
        if data[url_field] is not None:
            data[url_field] = str(data[url_field])

    profile = db.query(CompanyProfile).filter_by(company_id=company.id).first()
    if not profile:
        profile = CompanyProfile(company_id=company.id)
        db.add(profile)
    for field in PROFILE_FIELDS:
        setattr(profile, field, data[field])

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Your company page was just updated elsewhere. Please try again.")
    return {"ok": True}


# ── Dynamic path last ──
@router.get("/{domain}")
def get_company_page(domain: str, db: Session = Depends(get_db)):
    domain = domain.strip().lower()
    company = _company_by_domain(db, domain)
    if not company:
        raise HTTPException(404, "Company not found")

    now = datetime.now(timezone.utc)
    open_filter = (Job.company_id == company.id, Job.is_active.is_(True))

    featured_first = case(
        (Job.featured_until.isnot(None) & (Job.featured_until > now), 0),
        else_=1,
    )
    jobs = (
        db.query(Job)
        .filter(*open_filter)
        .order_by(featured_first, Job.posted_at.desc().nullslast())
        .limit(MAX_COMPANY_JOBS)
        .all()
    )
    open_roles = db.query(func.count(Job.id)).filter(*open_filter).scalar() or 0

    profile = None
    if _has_company_page(db, domain):
        profile = _profile_dict(
            db.query(CompanyProfile).filter_by(company_id=company.id).first()
        )

    return {
        "name": company.name,
        "domain": company.domain,
        "industry": company.industry,
        "open_roles": open_roles,
        "profile": profile,
        "jobs": [_job_dict(j, company, now) for j in jobs],
    }