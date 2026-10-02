# backend/app/schemas/wallet.py  (replaces the Stripe version)
from pydantic import BaseModel, Field


class DepositIn(BaseModel):
    amount: int = Field(ge=10, le=150_000)  # whole KES; M-Pesa per-transaction cap
    phone: str


class WithdrawIn(BaseModel):
    amount: int = Field(ge=10, le=150_000)