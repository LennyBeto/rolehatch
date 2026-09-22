# backend/app/schemas/contact.py
from pydantic import BaseModel, EmailStr, Field

class ContactMessageCreate(BaseModel):
    email: EmailStr
    subject: str = Field(min_length=1, max_length=255)
    message: str = Field(min_length=1, max_length=5000)