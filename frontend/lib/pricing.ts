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
// Tiers are built from three levers:
//   volume   - featured listings and refreshes per month
//   features - analytics history, homepage partner logo, company page, newsletter
//   support  - channel and reply-time target
// Keep the numbers below in sync with PLANS in backend/app/services/billing.py,
// which is what actually enforces them.
// Keep `live: false` until subscription checkout is tested; the card then shows a
// disabled "Coming soon" button.
// A perk set to "soon" shows a Soon badge on the cards and in the comparison table;
// set it to "included" once the feature is deployed.

export type EmployerPlanId = "starter" | "growth" | "enterprise";

export type PlanFeature = {
  text: string;
  soon?: boolean;
};

export type PlanLimits = {
  featuredPerMonth: number;
  refreshesPerMonth: number;
  analyticsDays: 7 | 14 | 30;
  supportLabel: string;      // e.g. "Priority email support"
  supportResponse: string;   // a target, not a guarantee: e.g. "2 business days"
};

export type PerkKey = "partnerLogo" | "companyPage" | "newsletter";
export type PerkState = "included" | "soon" | "none";

export type EmployerPlan = {
  name: string;
  amount: number;
  currency: "USD";
  display: string;
  period: "month";
  summary: string;
  limits: PlanLimits;
  perks: Record<PerkKey, PerkState>;
  features: PlanFeature[];
  live: boolean;
};

/** Analytics window for employers without a plan (matches the backend baseline). */
export const BASELINE_ANALYTICS_DAYS = 7;

const PERK_LABELS: Record<PerkKey, string> = {
  partnerLogo: "Your logo in the homepage hiring partners strip",
  companyPage: "Your own company page on PerchRole",
  newsletter: "Featured in the PerchRole newsletter",
};

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

function buildFeatures(limits: PlanLimits, perks: Record<PerkKey, PerkState>): PlanFeature[] {
  const features: PlanFeature[] = [
    { text: `${plural(limits.featuredPerMonth, "featured listing", "featured listings")} a month` },
    { text: `${plural(limits.refreshesPerMonth, "refresh", "refreshes")} a month` },
    { text: `${limits.analyticsDays}-day listing analytics` },
    { text: `${limits.supportLabel}, reply within ${limits.supportResponse}` },
  ];
  (Object.keys(PERK_LABELS) as PerkKey[]).forEach((key) => {
    if (perks[key] !== "none") {
      features.push({ text: PERK_LABELS[key], soon: perks[key] === "soon" });
    }
  });
  return features;
}

type PlanSeed = {
  name: string;
  amount: number;
  summary: string;
  limits: PlanLimits;
  perks: Record<PerkKey, PerkState>;
  live: boolean;
};

function makePlan(seed: PlanSeed): EmployerPlan {
  return {
    ...seed,
    currency: "USD",
    display: `$${seed.amount}`,
    period: "month",
    features: buildFeatures(seed.limits, seed.perks),
  };
}

export const EMPLOYER_PLANS: Record<EmployerPlanId, EmployerPlan> = {
  starter: makePlan({
    name: "Starter",
    amount: 29,
    summary: "For small teams hiring a few roles at a time.",
    limits: {
      featuredPerMonth: 1,
      refreshesPerMonth: 2,
      analyticsDays: 7,
      supportLabel: "Email support",
      supportResponse: "3 business days",
    },
    perks: { partnerLogo: "none", companyPage: "none", newsletter: "none" },
    live: false,
  }),
  growth: makePlan({
    name: "Growth",
    amount: 99,
    summary: "For companies with an ongoing hiring pipeline.",
    limits: {
      featuredPerMonth: 4,
      refreshesPerMonth: 10,
      analyticsDays: 14,
      supportLabel: "Priority email support",
      supportResponse: "2 business days",
    },
    perks: { partnerLogo: "none", companyPage: "none", newsletter: "none" },
    live: false,
  }),
  enterprise: makePlan({
    name: "Enterprise",
    amount: 249,
    summary: "For organisations with large or international hiring.",
    limits: {
      featuredPerMonth: 15,
      refreshesPerMonth: 30,
      analyticsDays: 30,
      supportLabel: "Dedicated account contact",
      supportResponse: "1 business day",
    },
    perks: { partnerLogo: "included", companyPage: "included", newsletter: "included" },
    live: false,
  }),
};

/** Display order of the plan cards. */
export const EMPLOYER_PLAN_ORDER: readonly EmployerPlanId[] = ["starter", "growth", "enterprise"];

/** Gets the "Recommended" badge and the highlighted border. */
export const RECOMMENDED_PLAN: EmployerPlanId = "growth";

// ── Value helpers (what each plan saves vs. paying $49 per listing) ──

export function perListingPrice(plan: EmployerPlan): number {
  return plan.amount / plan.limits.featuredPerMonth;
}

export function perListingLabel(plan: EmployerPlan): string {
  const per = perListingPrice(plan);
  return `${Number.isInteger(per) ? "" : "≈ "}$${Math.round(per)}`;
}

export function savingsPercent(plan: EmployerPlan): number {
  return Math.round((1 - perListingPrice(plan) / FEATURE_PRICING.card.amount) * 100);
}

// ── Comparison table (rendered on /pricing) ─────────────────
// Columns: Pay as you go, then the plans in EMPLOYER_PLAN_ORDER.

export type ComparisonCell = string | boolean;
export type ComparisonRow = { label: string; cells: ComparisonCell[]; soon?: boolean };
export type ComparisonSection = { title: string; rows: ComparisonRow[] };

export function buildComparison(): ComparisonSection[] {
  const plans = EMPLOYER_PLAN_ORDER.map((id) => EMPLOYER_PLANS[id]);
  const payg = FEATURE_PRICING.card;
  const perk = (key: PerkKey): ComparisonCell[] => [false, ...plans.map((p) => p.perks[key] !== "none")];
  const soon = (key: PerkKey) => plans.some((p) => p.perks[key] === "soon");

  return [
    {
      title: "Volume",
      rows: [
        {
          label: "Featured listings per month",
          cells: [`Pay ${payg.display} each`, ...plans.map((p) => String(p.limits.featuredPerMonth))],
        },
        {
          label: "Cost per featured listing",
          cells: [payg.display, ...plans.map(perListingLabel)],
        },
        {
          label: "Refreshes per month",
          cells: [false, ...plans.map((p) => String(p.limits.refreshesPerMonth))],
        },
      ],
    },
    {
      title: "Insights",
      rows: [
        {
          label: "Listing analytics history",
          cells: [
            `${BASELINE_ANALYTICS_DAYS} days`,
            ...plans.map((p) => `${p.limits.analyticsDays} days`),
          ],
        },
      ],
    },
    {
      title: "Visibility and brand",
      rows: [
        { label: `Featured placement (${FEATURE_DAYS} days each)`, cells: [true, true, true, true] },
        { label: "Homepage hiring partners logo", cells: perk("partnerLogo") },
        { label: "Your own company page", cells: perk("companyPage"), soon: soon("companyPage") },
        { label: "Newsletter feature", cells: perk("newsletter"), soon: soon("newsletter") },
      ],
    },
    {
      title: "Support",
      rows: [
        {
          label: "Support channel",
          cells: ["Email", ...plans.map((p) => p.limits.supportLabel.replace(/ support$/, ""))],
        },
        {
          label: "Reply target",
          cells: ["Best effort", ...plans.map((p) => p.limits.supportResponse)],
        },
      ],
    },
  ];
}