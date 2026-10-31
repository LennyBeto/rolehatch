# backend/app/models/cv_build.py
import uuid
from datetime import datetime
from sqlalchemy import Boolean, CheckConstraint, DateTime, Index, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class CvBuildCredit(Base):
    """One row per user: lifetime free-build flag + purchased credit balance."""
    __tablename__ = "cv_build_credits"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    free_used: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    paid_credits: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (CheckConstraint("paid_credits >= 0", name="ck_cv_paid_credits_nonneg"),)


class CvBuild(Base):
    """Ledger of build attempts; remembers which credit type was spent so a refund restores the right one."""
    __tablename__ = "cv_builds"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    source: Mapped[str] = mapped_column(String(10), nullable=False)    # free | paid
    status: Mapped[str] = mapped_column(String(10), nullable=False)    # pending | completed | refunded
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (Index("ix_cv_builds_user", "user_id"),)


class CvCreditPurchase(Base):
    """Idempotency record: the Paystack reference (session id) is the primary key."""
    __tablename__ = "cv_credit_purchases"

    reference: Mapped[str] = mapped_column(String(255), primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    credits: Mapped[int] = mapped_column(Integer, nullable=False)
    amount: Mapped[int] = mapped_column(Integer, nullable=False)       # minor units
    currency: Mapped[str] = mapped_column(String(10), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())