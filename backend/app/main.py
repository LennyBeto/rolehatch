# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.core.config import settings
from app.api.routes import jobs, saved_jobs, promote

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="RoleHatch API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,  # never use "*" with credentials
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)

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