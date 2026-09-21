"use client";

import { Suspense } from "react";
import { Box, Flex } from "@chakra-ui/react";
import HeroSection from "@/components/HeroSection";
import QuickFilterChips from "@/components/QuickFilterChips";
import FilterSidebar from "@/components/FilterSidebar";
import JobList from "@/components/JobList";

export default function HomePage() {
  return (
    <Box bg="background" minH="100vh">
      <Suspense fallback={null}>
        <HeroSection />
      </Suspense>
      <Box maxW="1200px" mx="auto" px={4} pt={6}>
        <Suspense fallback={null}>
          <QuickFilterChips />
        </Suspense>
      </Box>
      <Flex id="listings" maxW="1200px" mx="auto" gap={6} px={4} pb={10} scrollMarginTop="80px">
        <Box w="280px" flexShrink={0} display={{ base: "none", md: "block" }}>
          <Suspense fallback={null}>
            <FilterSidebar />
          </Suspense>
        </Box>
        <Box flex="1">
          <Suspense fallback={null}>
            <JobList />
          </Suspense>
        </Box>
      </Flex>
    </Box>
  );
}