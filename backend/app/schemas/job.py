# backend/app/schemas/job.py
from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime

class JobOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    location: str | None
    remote_type: str | None
    salary_min: float | None
    salary_max: float | None
    source: str
    source_url: str
    is_active: bool
    posted_at: datetime | None