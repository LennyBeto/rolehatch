# backend/app/schemas/job_alert.py
from pydantic import BaseModel, EmailStr, field_validator

class JobAlertCreate(BaseModel):
    email: EmailStr
    keyword: str | None = None
    remote_type: str | None = None
    frequency: str = "daily"

    @field_validator("frequency")
    @classmethod
    def validate_frequency(cls, v):
        if v not in ("daily", "weekly"):
            raise ValueError("frequency must be 'daily' or 'weekly'")
        return v