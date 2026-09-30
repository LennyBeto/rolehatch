# backend/app/schemas/employer_job.py
from pydantic import BaseModel, Field, HttpUrl, field_validator

REMOTE_TYPES = ("remote", "hybrid", "onsite", "field")
COMMITMENTS = ("full_time", "part_time", "contract")


def _check_remote_type(v):
    if v and v not in REMOTE_TYPES:
        raise ValueError("remote_type must be one of: remote, hybrid, onsite, field")
    return v


def _check_commitment(v):
    if v and v not in COMMITMENTS:
        raise ValueError("commitment must be one of: full_time, part_time, contract")
    return v


class JobPostCreate(BaseModel):
    company_name: str
    title: str
    location: str | None = None
    remote_type: str | None = None   # remote / hybrid / onsite / field
    commitment: str | None = None    # full_time / part_time / contract
    salary_min: float | None = None
    salary_max: float | None = None
    description: str | None = None
    apply_url: HttpUrl

    @field_validator("remote_type")
    @classmethod
    def validate_remote_type(cls, v):
        return _check_remote_type(v)

    @field_validator("commitment")
    @classmethod
    def validate_commitment(cls, v):
        return _check_commitment(v)


class JobPostUpdate(BaseModel):
    """Partial update: only fields present in the request body are changed.
    Sending null for an optional field clears it; title and apply_url can't be cleared."""
    title: str | None = Field(default=None, min_length=1, max_length=300)
    location: str | None = Field(default=None, max_length=255)
    remote_type: str | None = None
    commitment: str | None = None
    salary_min: float | None = Field(default=None, ge=0)
    salary_max: float | None = Field(default=None, ge=0)
    description: str | None = Field(default=None, max_length=20000)
    apply_url: HttpUrl | None = None

    @field_validator("remote_type")
    @classmethod
    def validate_remote_type(cls, v):
        return _check_remote_type(v)

    @field_validator("commitment")
    @classmethod
    def validate_commitment(cls, v):
        return _check_commitment(v)

    @field_validator("title", "apply_url")
    @classmethod
    def not_null_when_sent(cls, v):
        # Only runs when the field is included in the body (defaults aren't validated),
        # so omitting title/apply_url is fine but explicitly sending null is rejected.
        if v is None:
            raise ValueError("This field can't be empty")
        return v