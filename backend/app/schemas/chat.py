# backend/app/schemas/chat.py
from typing import Literal
from pydantic import BaseModel, Field, field_validator


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)  # room to paste a CV


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=20)

    @field_validator("messages")
    @classmethod
    def last_must_be_user(cls, v):
        if v[-1].role != "user":
            raise ValueError("last message must be from the user")
        return v


class ChatResponse(BaseModel):
    reply: str