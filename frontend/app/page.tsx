// frontend/app/page.tsx
import { Box, Flex } from "@chakra-ui/react";
import { Suspense } from "react";
import type { Metadata } from "next";
import HeroSection from "@/components/HeroSection";
import SocialProof from "@/components/SocialProof";
import QuickFilterChips from "@/components/QuickFilterChips";
import FilterSidebar from "@/components/FilterSidebar";
import MobileFilters from "@/components/MobileFilters";
import JobList from "@/components/JobList";
import JobAlertForm from "@/components/JobAlertForm";
import EmployerPricingPreview from "@/components/EmployerPricingPreview";
import HomeSkeleton from "@/components/HomeSkeleton";
import JsonLd from "@/components/JsonLd";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo";

// Filtered URLs like /?title=backend&page=2 all canonicalize to the home page
// until dedicated /jobs/[category] landing pages exist.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.svg`,
    description: SITE_DESCRIPTION,
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/?title={search_term_string}#listings`,
      "query-input": "required name=search_term_string",
    },
  },
];

export default function HomePage() {
  return (
    // overflowX="clip" (not "hidden"): hidden turns this Box into a scroll container,
    // which breaks position: sticky on descendants. clip blocks horizontal overflow without that side effect.
    <Box bg="background" minH="100vh" overflowX="clip">
      {/* Outside Suspense so crawlers get it in the initial HTML, not after the skeleton resolves */}
      {structuredData.map((data, i) => (
        <JsonLd key={i} data={data} />
      ))}
      <Suspense fallback={<HomeSkeleton />}>
        <HeroSection />
        <SocialProof />
        <Box maxW="1200px" mx="auto" px={4} pt={6}>
          <QuickFilterChips />
        </Box>
        <Flex id="listings" maxW="1200px" mx="auto" gap={6} px={4} pb={10} scrollMarginTop="80px">
          <Box
            w="280px"
            flexShrink={0}
            display={{ base: "none", md: "block" }}
            position="sticky"
            top="80px"
            alignSelf="flex-start"
            maxH="calc(100vh - 96px)"
            overflowY="auto"
          >
            <FilterSidebar />
          </Box>
          <Box flex="1" minW={0}>
            {/* Mobile-only: the sidebar is hidden below md, so filters live in a drawer */}
            <Box display={{ base: "block", md: "none" }} mb={4}>
              <MobileFilters />
            </Box>
            <JobList />
          </Box>
        </Flex>
        <JobAlertForm />
        <EmployerPricingPreview />
      </Suspense>
    </Box>
  );
}