# backend/app/schemas/saved_job.py
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime

class SavedJobCreate(BaseModel):
    job_id: UUID
    status: str = "saved"

class SavedJobUpdate(BaseModel):
    status: str  # "saved" | "applied" | "hidden"

class AppliedJobOut(BaseModel):
    saved_job_id: UUID
    job_id: UUID
    title: str
    company_name: str | None
    location: str | None
    source_url: str
    applied_at: datetime