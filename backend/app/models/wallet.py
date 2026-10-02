# backend/app/models/wallet.py  (replaces the Stripe version)
import uuid
from datetime import datetime
from sqlalchemy import BigInteger, CheckConstraint, DateTime, ForeignKey, Index, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class Wallet(Base):
    __tablename__ = "wallets"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, unique=True)
    balance: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0, server_default="0")  # whole KES
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="KES", server_default="KES")
    phone: Mapped[str | None] = mapped_column(String(15))  # verified via a completed STK deposit
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (CheckConstraint("balance >= 0", name="ck_wallets_balance_nonneg"),)


class WalletTransaction(Base):
    __tablename__ = "wallet_transactions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    wallet_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("wallets.id", ondelete="CASCADE"), nullable=False)
    type: Mapped[str] = mapped_column(String(20), nullable=False)    # deposit | withdrawal
    amount: Mapped[int] = mapped_column(BigInteger, nullable=False)  # whole KES
    status: Mapped[str] = mapped_column(String(20), nullable=False)  # pending | completed | failed
    phone: Mapped[str | None] = mapped_column(String(15))
    checkout_request_id: Mapped[str | None] = mapped_column(String(64), unique=True)  # STK deposits
    mpesa_receipt: Mapped[str | None] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (Index("ix_wallet_tx_wallet_created", "wallet_id", "created_at"),)