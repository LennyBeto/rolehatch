// frontend/app/pricing/page.tsx
import { Box, Heading, Text } from "@chakra-ui/react";
import type { Metadata } from "next";
import EmployerPricingPreview from "@/components/EmployerPricingPreview";
import JsonLd from "@/components/JsonLd";
import { SITE_NAME, SITE_URL } from "@/lib/seo";
import {
  FEATURE_PRICING,
  FEATURE_DAYS,
  EMPLOYER_PLANS,
  EMPLOYER_PLAN_ORDER,
} from "@/lib/pricing";

const PLANS_LIVE = EMPLOYER_PLAN_ORDER.some((id) => EMPLOYER_PLANS[id].live);

const TITLE = "Employer Pricing — PerchRole";
const DESCRIPTION = PLANS_LIVE
  ? `Post tech jobs free on PerchRole. Feature a single listing for ${FEATURE_PRICING.card.display}, or choose a monthly plan with featured listings, analytics and support.`
  : `Post tech jobs free on PerchRole. Pay only to feature a listing at the top of search results for ${FEATURE_DAYS} days, with no subscription.`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/pricing" },
  openGraph: {
    type: "website",
    title: TITLE,
    description: DESCRIPTION,
    url: "/pricing",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

// Plan offers are only published once a plan can actually be bought.
const planOffers = EMPLOYER_PLAN_ORDER.filter((id) => EMPLOYER_PLANS[id].live).map((id) => {
  const plan = EMPLOYER_PLANS[id];
  const price = plan.amount.toFixed(2);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `PerchRole ${plan.name} employer plan`,
    description: plan.summary,
    brand: { "@type": "Brand", name: SITE_NAME },
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}/pricing`,
      price,
      priceCurrency: plan.currency,
      availability: "https://schema.org/InStock",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price,
        priceCurrency: plan.currency,
        referenceQuantity: { "@type": "QuantitativeValue", value: 1, unitCode: "MON" },
      },
    },
  };
});

const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Featured Job Listing",
    description: `Pins your job posting above standard listings in every matching PerchRole search for ${FEATURE_DAYS} days.`,
    brand: { "@type": "Brand", name: SITE_NAME },
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}/pricing`,
      price: FEATURE_PRICING.card.amount.toFixed(2),
      priceCurrency: FEATURE_PRICING.card.currency,
      availability: "https://schema.org/InStock",
    },
  },
  ...planOffers,
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Pricing", item: `${SITE_URL}/pricing` },
    ],
  },
];

export default function PricingPage() {
  return (
    <Box bg="background" minH="100vh" py={12}>
      {structuredData.map((data, i) => (
        <JsonLd key={i} data={data} />
      ))}
      <Box maxW="700px" mx="auto" px={4} textAlign="center" mb={8}>
        {/* as="h1": same visual size, gives the page a real H1 (Chakra v3 Heading defaults to h2) */}
        <Heading as="h1" size="lg" color="text" mb={3}>Pricing for Employers</Heading>
        <Text color="fg.muted">
          {PLANS_LIVE
            ? `PerchRole is free to post on. Feature a single listing for ${FEATURE_PRICING.card.display}, or save with a monthly plan: more featured listings, longer analytics history and faster support.`
            : "PerchRole is free to post on. Featured placement is the only paid option for now: simple, transparent and pay-per-listing. Monthly plans are coming soon."}
        </Text>
      </Box>
      <EmployerPricingPreview showComparison />
    </Box>
  );
}