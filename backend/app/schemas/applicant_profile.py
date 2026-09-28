# backend/app/schemas/applicant_profile.py
from pydantic import BaseModel, ConfigDict

class ApplicantProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    full_name: str | None = None
    expertise: str | None = None
    avatar_id: str | None = None
    cv_filename: str | None = None
    has_match_score: bool = False

class ApplicantProfileUpdate(BaseModel):
    full_name: str | None = None
    expertise: str | None = None
    avatar_id: str | None = None

class CVScanResult(BaseModel):
    overall_score: int
    breakdown: dict[str, int]
    suggestions: list[str]