# backend/app/schemas/employer_job.py
from pydantic import BaseModel, HttpUrl, field_validator

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
        if v and v not in ("remote", "hybrid", "onsite", "field"):
            raise ValueError("remote_type must be one of: remote, hybrid, onsite, field")
        return v

    @field_validator("commitment")
    @classmethod
    def validate_commitment(cls, v):
        if v and v not in ("full_time", "part_time", "contract"):
            raise ValueError("commitment must be one of: full_time, part_time, contract")
        return v