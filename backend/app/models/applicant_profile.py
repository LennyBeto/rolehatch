# backend/app/models/applicant_profile.py
import uuid
from datetime import datetime
from sqlalchemy import String, Text, Integer, Boolean, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from pgvector.sqlalchemy import Vector
from app.db.base import Base


class ApplicantProfile(Base):
    __tablename__ = "applicant_profiles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, unique=True)  # Supabase auth.users.id
    full_name: Mapped[str | None] = mapped_column(String(255))
    expertise: Mapped[str | None] = mapped_column(String(100))
    summary: Mapped[str | None] = mapped_column(Text)  # 30-50 word professional summary — typed manually or parsed from CV; nullable for profiles created before this column existed
    avatar_id: Mapped[str | None] = mapped_column(String(50))
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_public: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)  # visible to employers in profile search — DB column has no server_default, Python-side default only
    cv_filename: Mapped[str | None] = mapped_column(String(255))
    cv_content_type: Mapped[str | None] = mapped_column(String(150))
    cv_base64: Mapped[str | None] = mapped_column(Text)  # small-file demo storage; swap for object storage later
    last_ats_score: Mapped[int | None] = mapped_column(Integer)
    embedding: Mapped[list[float] | None] = mapped_column(Vector(768))  # Gemini text-embedding-004, from extracted CV text — set in scan_cv, cleared on new upload
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )