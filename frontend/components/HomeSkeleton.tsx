// frontend/components/HomeSkeleton.tsx
"use client";
import { Box, Flex, Wrap } from "@chakra-ui/react";
import Shimmer from "@/components/ui/shimmer";
import JobListSkeleton from "./JobListSkeleton";

const CHIP_WIDTHS = [64, 78, 84, 62, 92, 70, 100, 76];

export default function HomeSkeleton() {
  return (
    <Box bg="background">
      <Box py={{ base: 12, md: 20 }} px={4} textAlign="center">
        <Flex direction="column" align="center" gap={3} mb={8}>
          <Shimmer h={{ base: "28px", md: "40px" }} w={{ base: "90%", md: "620px" }} maxW="100%" />
          <Shimmer h={{ base: "28px", md: "40px" }} w={{ base: "65%", md: "380px" }} maxW="100%" />
          <Shimmer h="16px" w={{ base: "85%", md: "460px" }} maxW="100%" mt={2} />
        </Flex>
        <Box
          bg="surface"
          p={4}
          borderRadius="lg"
          maxW="900px"
          mx="auto"
          border="1px solid"
          borderColor="line"
        >
          <Flex direction={{ base: "column", md: "row" }} gap={3}>
            <Shimmer h="44px" flex={2} />
            <Shimmer h="44px" flex={1} />
            <Shimmer h="44px" flex={1} />
            <Shimmer h="44px" w={{ base: "100%", md: "120px" }} />
          </Flex>
        </Box>
      </Box>

      <Box maxW="1200px" mx="auto" px={4} pt={2} pb={6}>
        <Wrap gap={2} justify="center">
          {CHIP_WIDTHS.map((w, i) => (
            <Shimmer key={i} h="32px" w={`${w}px`} borderRadius="full" />
          ))}
        </Wrap>
      </Box>

      <Flex maxW="1200px" mx="auto" gap={6} px={4} pb={10}>
        <Box
          w="280px"
          flexShrink={0}
          display={{ base: "none", md: "block" }}
          bg="surface"
          p={4}
          borderRadius="md"
          border="1px solid"
          borderColor="line"
        >
          <Shimmer h="18px" w="110px" mb={4} />
          {[0, 1, 2, 3].map((i) => (
            <Shimmer key={i} h="16px" w={`${60 + i * 8}px`} mb={3} />
          ))}
          <Shimmer h="18px" w="90px" mt={6} mb={4} />
          <Shimmer h="8px" w="100%" borderRadius="full" />
        </Box>
        <Box flex="1" minW={0}>
          {/* Mirrors the mobile-only filters button */}
          <Box display={{ base: "block", md: "none" }} mb={4}>
            <Shimmer h="40px" w="120px" />
          </Box>
          <JobListSkeleton />
        </Box>
      </Flex>
    </Box>
  );
}