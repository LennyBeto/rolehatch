# backend/app/schemas/applicant_profile.py
from pydantic import BaseModel, ConfigDict, Field
from uuid import UUID
from datetime import datetime

class ApplicantProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    first_name: str
    last_name: str
    job_title: str
    cv_url: str | None = None
    cv_filename: str | None = None
    is_public: bool
    created_at: datetime
    updated_at: datetime