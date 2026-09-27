# backend/app/schemas/applicant_profile.py
from pydantic import BaseModel, Field

EXPERTISE_OPTIONS = [
    "frontend_engineer", "backend_engineer", "fullstack_engineer",
    "devops_engineer", "data_scientist", "data_analyst",
    "product_manager", "ui_ux_designer", "qa_engineer",
    "mobile_engineer", "cybersecurity_engineer", "other",
]


class ApplicantProfileOut(BaseModel):
    model_config = {"from_attributes": True}

    full_name: str | None = None
    expertise: str | None = None
    avatar_id: str | None = None
    cv_filename: str | None = None
    last_ats_score: int | None = None


class ApplicantProfileUpdate(BaseModel):
    full_name: str | None = Field(None, max_length=255)
    expertise: str | None = None
    avatar_id: str | None = Field(None, max_length=50)


class CVScanResult(BaseModel):
    overall_score: int
    breakdown: dict[str, int]
    suggestions: list[str]