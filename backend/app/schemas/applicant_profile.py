# backend/app/schemas/applicant_profile.py
from pydantic import BaseModel, Field, field_validator

EXPERTISE_OPTIONS = [
    "frontend_engineer", "backend_engineer", "fullstack_engineer",
    "devops_engineer", "data_scientist", "data_analyst",
    "product_manager", "ui_ux_designer", "qa_engineer",
    "mobile_engineer", "cybersecurity_engineer", "other",
]


class ApplicantProfileOut(BaseModel):
    model_config = {"from_attributes": True, "populate_by_name": True}

    full_name: str | None = None
    expertise: str | None = None
    avatar_id: str | None = None
    is_public: bool = True
    cv_filename: str | None = None
    last_ats_score: int | None = None
    has_match_score: bool = Field(default=False, validation_alias="embedding")

    @field_validator("has_match_score", mode="before")
    @classmethod
    def _embedding_presence(cls, v):
        # Reads the raw pgvector list off ApplicantProfile.embedding and
        # collapses it to a bool — the vector itself is never serialized
        # to the client, only whether match scoring is currently active.
        return v is not None


class ApplicantProfileUpdate(BaseModel):
    full_name: str | None = Field(None, max_length=255)
    expertise: str | None = None
    avatar_id: str | None = Field(None, max_length=50)
    is_public: bool | None = None


class CVScanResult(BaseModel):
    overall_score: int
    breakdown: dict[str, int]
    suggestions: list[str]