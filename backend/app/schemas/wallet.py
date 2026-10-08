# backend/app/schemas/wallet.py  (M-Pesa + Paystack + PayPal)
from pydantic import BaseModel, Field


class DepositIn(BaseModel):
    amount: int = Field(ge=10, le=150_000)  # whole KES; M-Pesa per-transaction cap
    phone: str


class PaystackDepositIn(BaseModel):
    amount: int = Field(ge=10, le=150_000)  # whole KES; no phone needed for card/bank


class PaypalDepositIn(BaseModel):
    amount: int = Field(ge=10, le=150_000)  # whole KES; converted to USD server-side at PAYPAL_KES_PER_USD


class WithdrawIn(BaseModel):
    amount: int = Field(ge=10, le=150_000)