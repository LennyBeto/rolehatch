# backend/app/schemas/applicant_profile.py
from pydantic import BaseModel, ConfigDict, Field, model_validator


class ApplicantProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    full_name: str | None = None
    expertise: str | None = None
    avatar_id: str | None = None
    avatar_url: str | None = None
    cv_filename: str | None = None
    has_match_score: bool = False

    @model_validator(mode="before")
    @classmethod
    def derive_has_match_score(cls, data):
        """The model stores an embedding, not a boolean — a scan generates it and a
        new CV upload clears it, so its presence means match scoring is live."""
        if isinstance(data, dict):
            return data
        return {
            "full_name": getattr(data, "full_name", None),
            "expertise": getattr(data, "expertise", None),
            "avatar_id": getattr(data, "avatar_id", None),
            "avatar_url": getattr(data, "avatar_url", None),
            "cv_filename": getattr(data, "cv_filename", None),
            "has_match_score": getattr(data, "embedding", None) is not None,
        }


class ApplicantProfileUpdate(BaseModel):
    # avatar_url is intentionally NOT settable here — only POST /avatar may write it,
    # otherwise a user could point their picture at any external URL.
    full_name: str | None = Field(default=None, max_length=255)
    expertise: str | None = Field(default=None, max_length=100)
    avatar_id: str | None = Field(default=None, max_length=50)


class CVScanResult(BaseModel):
    overall_score: int
    breakdown: dict[str, int]
    suggestions: list[str]