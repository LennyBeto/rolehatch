# backend/app/schemas/resume.py
from pydantic import BaseModel, Field
from datetime import datetime

class ResumeCreate(BaseModel):
    resume_text: str = Field(min_length=50, max_length=20000)

class ResumeOut(BaseModel):
    resume_text: str
    updated_at: datetime
    has_embedding: bool