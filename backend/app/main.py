# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.api.routes import (
    jobs, saved_jobs, promote, internal, job_alerts, companies,
    employer_jobs, contact, applicant_profile,
)

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="PerchRole API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH"],
    allow_headers=["Authorization", "Content-Type"],
)

app.add_middleware(GZipMiddleware, minimum_size=1000)


@app.middleware("http")
async def security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
    return response


app.include_router(jobs.router, prefix="/api/jobs", tags=["jobs"])
app.include_router(saved_jobs.router, prefix="/api/saved-jobs", tags=["saved-jobs"])
app.include_router(promote.router, prefix="/api/promote", tags=["promote"])
app.include_router(job_alerts.router, prefix="/api/job-alerts", tags=["job-alerts"])
app.include_router(companies.router, prefix="/api/companies", tags=["companies"])
app.include_router(employer_jobs.router, prefix="/api/employer/jobs", tags=["employer-jobs"])
app.include_router(contact.router, prefix="/api/contact", tags=["contact"])
app.include_router(applicant_profile.router, prefix="/api/applicants", tags=["applicants"])
app.include_router(internal.router)  # no prefix — route already defines /internal/sync-jobs


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}


@app.get("/readyz")
async def readyz():
    return {"status": "ready"}