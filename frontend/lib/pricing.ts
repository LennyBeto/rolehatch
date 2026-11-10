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

// ── Employer monthly plans ───────────────────────────────────
// Display data only for now. Keep `live: false` until subscription checkout is
// wired; the card then shows a disabled "Coming soon" button. A feature with
// `soon: true` is listed but not built yet.

export type EmployerPlanId = "starter" | "growth" | "enterprise";

export type PlanFeature = {
  text: string;
  soon?: boolean;
};

export type EmployerPlan = {
  name: string;
  amount: number;
  currency: "USD";
  display: string;
  period: "month";
  summary: string;
  features: PlanFeature[];
  live: boolean;
};

export const EMPLOYER_PLANS: Record<EmployerPlanId, EmployerPlan> = {
  starter: {
    name: "Starter",
    amount: 29,
    currency: "USD",
    display: "$29",
    period: "month",
    summary: "For small teams hiring a few roles at a time.",
    features: [
      { text: "2 featured listings a month" },
      { text: "2 refreshes a month" },
      { text: "Plan status on your dashboard" },
    ],
    live: false,
  },
  growth: {
    name: "Growth",
    amount: 99,
    currency: "USD",
    display: "$99",
    period: "month",
    summary: "For companies with an ongoing hiring pipeline.",
    features: [
      { text: "6 featured listings a month" },
      { text: "8 refreshes a month" },
      { text: "Priority email support" },
    ],
    live: false,
  },
  enterprise: {
    name: "Enterprise",
    amount: 249,
    currency: "USD",
    display: "$249",
    period: "month",
    summary: "For organisations with large or international hiring.",
    features: [
      { text: "Unlimited featured listings and refreshes" },
      { text: "Your logo in the homepage hiring partners strip" },
      { text: "Dedicated account contact and onboarding" },
      { text: "Your own company page on PerchRole", soon: true },
      { text: "Featured in the PerchRole newsletter", soon: true },
    ],
    live: false,
  },
};

/** Display order of the plan cards. */
export const EMPLOYER_PLAN_ORDER: readonly EmployerPlanId[] = ["starter", "growth", "enterprise"];

/** Gets the "Recommended" badge and the highlighted border. */
export const RECOMMENDED_PLAN: EmployerPlanId = "growth";