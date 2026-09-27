# backend/app/models/applicant_profile.py
import uuid
from datetime import datetime
from sqlalchemy import String, Text, Integer, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class ApplicantProfile(Base):
    __tablename__ = "applicant_profiles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, unique=True)  # Supabase auth.users.id
    full_name: Mapped[str | None] = mapped_column(String(255))
    expertise: Mapped[str | None] = mapped_column(String(100))
    avatar_id: Mapped[str | None] = mapped_column(String(50))
    cv_filename: Mapped[str | None] = mapped_column(String(255))
    cv_content_type: Mapped[str | None] = mapped_column(String(150))
    cv_base64: Mapped[str | None] = mapped_column(Text)  # small-file demo storage; swap for object storage later
    last_ats_score: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )