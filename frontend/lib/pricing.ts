// frontend/lib/pricing.ts
// Single source of truth for featured-listing pricing across the app.
// To add another payment provider, add its price/label here rather than
// hardcoding it in a new component — every consumer below stays untouched.

export const FEATURE_DAYS = 14;

export const FEATURE_PRICING = {
  mpesa: {
    amount: 6500,
    currency: "KES",
    display: "KES 6,500",
    label: "M-Pesa",
    live: true,
  },
  card: {
    amount: 49,
    currency: "USD",
    display: "$49",
    label: "Paystack",
    live: true,
  },
} as const;

export type PaymentMethodKey = keyof typeof FEATURE_PRICING;

/** Methods currently available to charge through — filters out unreleased ones. */
export function getLivePaymentMethods(): PaymentMethodKey[] {
  return (Object.keys(FEATURE_PRICING) as PaymentMethodKey[]).filter(
    (key) => FEATURE_PRICING[key].live
  );
}