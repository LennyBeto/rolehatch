// frontend/app/pricing/page.tsx
import { Box, Heading, Text } from "@chakra-ui/react";
import type { Metadata } from "next";
import EmployerPricingPreview from "@/components/EmployerPricingPreview";
import JsonLd from "@/components/JsonLd";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

const TITLE = "Employer Pricing — PerchRole";
const DESCRIPTION =
  "Post tech jobs free on PerchRole. Pay only to feature a listing at the top of search results for 14 days, with no subscription.";

// Keep in sync with FEATURE_PRICE_CENTS in backend/app/api/routes/promote.py
const FEATURED_PRICE_USD = "49.00";

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

const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Featured Job Listing",
    description:
      "Pins your job posting above standard listings in every matching PerchRole search for 14 days.",
    brand: { "@type": "Brand", name: SITE_NAME },
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}/pricing`,
      price: FEATURED_PRICE_USD,
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
  },
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
        <Text color="gray.600">
          PerchRole is free to post on. Featured placement is the only paid option —
          simple, transparent, and pay-per-listing rather than a recurring subscription.
        </Text>
      </Box>
      <EmployerPricingPreview />
    </Box>
  );
}