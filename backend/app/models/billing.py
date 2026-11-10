# backend/app/models/billing.py
import uuid
from datetime import datetime

from sqlalchemy import String, Integer, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class EmployerSubscription(Base):
    """One row per company email domain. Counters reset each billing period."""
    __tablename__ = "employer_subscriptions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email_domain: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    plan_id: Mapped[str] = mapped_column(String(20), nullable=False)        # starter | growth | enterprise
    status: Mapped[str] = mapped_column(String(20), nullable=False)         # active | cancelled
    paystack_subscription_code: Mapped[str | None] = mapped_column(String(100), unique=True)
    paystack_email_token: Mapped[str | None] = mapped_column(String(100))
    current_period_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    featured_used: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)
    bumps_used: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ProcessedPayment(Base):
    """Idempotency ledger: each Paystack reference is applied at most once."""
    __tablename__ = "processed_payments"

    reference: Mapped[str] = mapped_column(String(120), primary_key=True)
    kind: Mapped[str] = mapped_column(String(30), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())