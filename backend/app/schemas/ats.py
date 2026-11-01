# backend/app/schemas/ats.py
from pydantic import BaseModel, Field

class ATSScanRequest(BaseModel):
    cv_text: str = Field(min_length=50, max_length=30000)
    job_description: str | None = Field(default=None, max_length=20000)