# backend/app/models/ats_scan.py
import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Boolean, DateTime, CheckConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class ATSScanQuota(Base):
    """One row per user: 1 lifetime free scan + purchased scan credits."""
    __tablename__ = "ats_scan_quota"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    free_used: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    paid_credits: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (CheckConstraint("paid_credits >= 0", name="ck_ats_paid_credits_nonneg"),)


class ATSScanPayment(Base):
    """One row per pack purchase. Created 'pending' at checkout, settled once by the
    Paystack webhook or /verify (row lock + status check make the grant idempotent)."""
    __tablename__ = "ats_scan_payments"

    reference: Mapped[str] = mapped_column(String(100), primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    credits: Mapped[int] = mapped_column(Integer, nullable=False)
    amount_kes: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending", server_default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())