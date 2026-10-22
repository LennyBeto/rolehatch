// frontend/app/loading.tsx
"use client";
import { Box, Stack, VisuallyHidden } from "@chakra-ui/react";
import RouteProgress from "@/components/RouteProgress";
import Shimmer from "@/components/ui/shimmer";

export default function Loading() {
  return (
    <Box maxW="700px" mx="auto" px={4} py={12} role="status" aria-busy="true" aria-live="polite">
      <RouteProgress />
      <VisuallyHidden>Loading page</VisuallyHidden>
      <Shimmer h="32px" w={{ base: "70%", md: "45%" }} mb={3} />
      <Shimmer h="16px" w={{ base: "90%", md: "60%" }} mb={8} />
      <Stack gap={3}>
        <Shimmer h="14px" w="100%" />
        <Shimmer h="14px" w="96%" />
        <Shimmer h="14px" w="88%" />
        <Shimmer h="14px" w="92%" />
        <Shimmer h="14px" w="60%" />
      </Stack>
    </Box>
  );
}