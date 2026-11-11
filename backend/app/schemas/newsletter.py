# backend/app/schemas/newsletter.py
from pydantic import BaseModel, ConfigDict, EmailStr, Field, HttpUrl, field_validator


class SubscribeRequest(BaseModel):
    email: EmailStr


class SlotCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    headline: str = Field(min_length=1, max_length=80)
    blurb: str = Field(min_length=1, max_length=300)
    link_url: HttpUrl

    @field_validator("link_url")
    @classmethod
    def validate_url_length(cls, v):
        if len(str(v)) > 500:
            raise ValueError("URL must be 500 characters or fewer")
        return v