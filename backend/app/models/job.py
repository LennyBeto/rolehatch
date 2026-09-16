# backend/app/models/job.py
import uuid
from datetime import datetime
from sqlalchemy import String, Numeric, DateTime, ForeignKey, Text, Index, func
from sqlalchemy.dialects.postgresql import UUID, ARRAY, ENUM
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

source_enum = ENUM("greenhouse", "lever", "workday", "bamboohr", "direct", name="job_source")

class Company(Base):
    __tablename__ = "companies"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    domain: Mapped[str | None] = mapped_column(String(255), unique=True)
    board_token: Mapped[str | None] = mapped_column(String(255))  # e.g. Greenhouse/Lever slug
    industry: Mapped[str | None] = mapped_column(String(120))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    jobs: Mapped[list["Job"]] = relationship(back_populates="company", cascade="all, delete-orphan")


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("companies.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    location: Mapped[str | None] = mapped_column(String(255))
    remote_type: Mapped[str | None] = mapped_column(String(30))  # remote/hybrid/onsite/field
    commitment: Mapped[str | None] = mapped_column(String(30))   # full_time/part_time/contract
    salary_min: Mapped[float | None] = mapped_column(Numeric(10, 2))
    salary_max: Mapped[float | None] = mapped_column(Numeric(10, 2))
    experience_years: Mapped[float | None] = mapped_column(Numeric(3, 1))
    benefits: Mapped[list[str] | None] = mapped_column(ARRAY(String))
    source: Mapped[str] = mapped_column(source_enum, nullable=False)
    source_url: Mapped[str] = mapped_column(String(1000), nullable=False)
    external_id: Mapped[str] = mapped_column(String(255), nullable=False)  # source's job id, for dedup
    is_featured: Mapped[bool] = mapped_column(default=False)               # promoted listings
    posted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    scraped_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    is_active: Mapped[bool] = mapped_column(default=True)  # soft-close stale/removed postings
    featured_until: Mapped["datetime | None"] = mapped_column(DateTime(timezone=True), nullable=True)
    
    company: Mapped["Company"] = relationship(back_populates="jobs")

    __table_args__ = (
        Index("ix_jobs_source_external_id", "source", "external_id", unique=True),  # scraper dedup
        Index("ix_jobs_location", "location"),
        Index("ix_jobs_remote_type", "remote_type"),
        Index("ix_jobs_salary", "salary_min", "salary_max"),
        Index("ix_jobs_title_trgm", "title", postgresql_using="gin",
              postgresql_ops={"title": "gin_trgm_ops"}),  # fuzzy title search
    )


class SavedJob(Base):
    __tablename__ = "saved_jobs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)  # Supabase auth.users.id
    job_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("jobs.id", ondelete="CASCADE"))
    status: Mapped[str] = mapped_column(String(20), default="saved")  # saved/applied/hidden
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (Index("ix_saved_jobs_user", "user_id", "job_id", unique=True),)