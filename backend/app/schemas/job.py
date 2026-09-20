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
    commitment: str | None = None
    salary_min: float | None
    salary_max: float | None
    source: str
    source_url: str
    is_active: bool
    is_featured: bool = False
    posted_at: datetime | None
    company_name: str | None = None
    company_domain: str | None = None