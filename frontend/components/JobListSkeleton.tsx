// frontend/components/JobListSkeleton.tsx
"use client";
import { Box, Flex, HStack, Stack, VisuallyHidden } from "@chakra-ui/react";
import Shimmer from "@/components/ui/shimmer";

// Varied widths so the placeholders read as real content, not a repeated block
const TITLE_WIDTHS = ["62%", "48%", "70%", "55%", "66%"];
const COMPANY_WIDTHS = ["38%", "44%", "32%", "40%", "36%"];

export default function JobListSkeleton() {
  return (
    <Stack gap={4} role="status" aria-busy="true" aria-live="polite">
      <VisuallyHidden>Loading jobs</VisuallyHidden>
      {TITLE_WIDTHS.map((titleWidth, i) => (
        <Box
          key={i}
          bg="surface"
          p={5}
          borderRadius="lg"
          border="1px solid"
          borderColor="line"
        >
          <Flex gap={3} align="flex-start">
            <Shimmer boxSize="40px" flexShrink={0} mt={1} />
            <Box flex={1} minW={0}>
              <Flex justify="space-between" align="flex-start" gap={4}>
                <Box flex={1} minW={0}>
                  <Shimmer h="20px" w={titleWidth} maxW="100%" mb={2} />
                  <Shimmer h="14px" w={COMPANY_WIDTHS[i]} maxW="100%" />
                </Box>
                <Shimmer
                  h="16px"
                  w="84px"
                  flexShrink={0}
                  display={{ base: "none", sm: "block" }}
                />
              </Flex>

              <HStack gap={2} mt={3} flexWrap="wrap">
                <Shimmer h="22px" w="64px" borderRadius="full" />
                <Shimmer h="22px" w="84px" borderRadius="full" />
                <Shimmer h="22px" w="72px" borderRadius="full" />
              </HStack>

              <HStack gap={3} mt={4}>
                <Shimmer h="32px" w="104px" />
                <Shimmer h="32px" w="84px" />
              </HStack>
            </Box>
          </Flex>
        </Box>
      ))}
    </Stack>
  );
}