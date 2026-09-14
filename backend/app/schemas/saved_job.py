# backend/app/schemas/saved_job.py
from pydantic import BaseModel
from uuid import UUID

class SavedJobCreate(BaseModel):
    job_id: UUID
    status: str = "saved"

class SavedJobUpdate(BaseModel):
    status: str  # "saved" | "applied" | "hidden"