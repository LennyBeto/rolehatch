// frontend/lib/pricing.ts
// Single source of truth for featured-listing pricing across the app.
// To add another payment provider, add it to FEATURE_PRICING and to
// PAYMENT_METHOD_ORDER; every consumer below stays untouched.

export const FEATURE_DAYS = 14;

export const FEATURE_PRICING = {
  card: {
    amount: 49,
    currency: "USD",
    display: "$49",
    label: "Paystack",
    live: true,
  },
  mpesa: {
    amount: 6500,
    currency: "KES",
    display: "KES 6,500",
    label: "M-Pesa",
    live: true,
  },
} as const;

export type PaymentMethodKey = keyof typeof FEATURE_PRICING;

/** Display order. The first live method is primary and preselected. */
export const PAYMENT_METHOD_ORDER: readonly PaymentMethodKey[] = ["card", "mpesa"];

/** Methods currently available to charge through, in display order. */
export function getLivePaymentMethods(): PaymentMethodKey[] {
  return PAYMENT_METHOD_ORDER.filter((key) => FEATURE_PRICING[key].live);
}