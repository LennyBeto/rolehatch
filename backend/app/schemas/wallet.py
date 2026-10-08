# backend/app/schemas/wallet.py  (M-Pesa + Paystack)
from pydantic import BaseModel, Field


class DepositIn(BaseModel):
    amount: int = Field(ge=10, le=150_000)  # whole KES; M-Pesa per-transaction cap
    phone: str


class PaystackDepositIn(BaseModel):
    amount: int = Field(ge=10, le=150_000)  # whole KES; no phone needed for card/bank


class WithdrawIn(BaseModel):
    amount: int = Field(ge=10, le=150_000)