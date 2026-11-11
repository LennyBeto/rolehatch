# backend/app/schemas/company_profile.py
from pydantic import BaseModel, Field, HttpUrl, field_validator

COMPANY_SIZES = ("1-10", "11-50", "51-200", "201-1000", "1000+")


class CompanyProfileUpdate(BaseModel):
    tagline: str | None = Field(default=None, max_length=160)
    about: str | None = Field(default=None, max_length=2000)
    website_url: HttpUrl | None = None
    careers_url: HttpUrl | None = None
    headquarters: str | None = Field(default=None, max_length=120)
    company_size: str | None = None

    @field_validator(
        "tagline", "about", "headquarters", "company_size", "website_url", "careers_url",
        mode="before",
    )
    @classmethod
    def blank_to_none(cls, v):
        # The editor sends empty strings for cleared fields.
        if isinstance(v, str):
            v = v.strip()
            return v or None
        return v

    @field_validator("company_size")
    @classmethod
    def validate_size(cls, v):
        if v is not None and v not in COMPANY_SIZES:
            raise ValueError(f"company_size must be one of: {', '.join(COMPANY_SIZES)}")
        return v

    @field_validator("website_url", "careers_url")
    @classmethod
    def validate_url_length(cls, v):
        if v is not None and len(str(v)) > 500:
            raise ValueError("URL must be 500 characters or fewer")
        return v