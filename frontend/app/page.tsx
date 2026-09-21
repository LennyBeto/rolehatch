// frontend/app/page.tsx
import { Box, Flex } from "@chakra-ui/react";
import HeroSection from "@/components/HeroSection";
import SocialProof from "@/components/SocialProof";
import QuickFilterChips from "@/components/QuickFilterChips";
import FilterSidebar from "@/components/FilterSidebar";
import JobList from "@/components/JobList";
import JobAlertForm from "@/components/JobAlertForm";
import EmployerPricingPreview from "@/components/EmployerPricingPreview";

export default function HomePage() {
  return (
    <Box bg="background" minH="100vh">
      <HeroSection />
      <SocialProof />
      <Box maxW="1200px" mx="auto" px={4} pt={6}>
        <QuickFilterChips />
      </Box>
      <Flex id="listings" maxW="1200px" mx="auto" gap={6} px={4} pb={10} scrollMarginTop="80px">
        <Box w="280px" flexShrink={0} display={{ base: "none", md: "block" }}>
          <FilterSidebar />
        </Box>
        <Box flex="1">
          <JobList />
        </Box>
      </Flex>
      <JobAlertForm />
      <EmployerPricingPreview />
    </Box>
  );
}