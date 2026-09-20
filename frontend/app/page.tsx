// frontend/app/page.tsx
import { Box, Flex } from "@chakra-ui/react";
import HeroSection from "@/components/HeroSection";
import FilterSidebar from "@/components/FilterSidebar";
import JobList from "@/components/JobList";

export default function HomePage() {
  return (
    <Box bg="background" minH="100vh">
      <HeroSection />
      <Flex id="listings" maxW="1200px" mx="auto" gap={6} px={4} py={10} scrollMarginTop="80px">
        <Box w="280px" flexShrink={0} display={{ base: "none", md: "block" }}>
          <FilterSidebar />
        </Box>
        <Box flex="1">
          <JobList />
        </Box>
      </Flex>
    </Box>
  );
}