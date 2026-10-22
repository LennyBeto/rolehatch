// frontend/app/dashboard/loading.tsx
"use client";
import { Box, Stack, VisuallyHidden } from "@chakra-ui/react";
import RouteProgress from "@/components/RouteProgress";
import Shimmer from "@/components/ui/shimmer";

export default function DashboardLoading() {
  return (
    <Box maxW="700px" mx="auto" mt={12} px={4} role="status" aria-busy="true" aria-live="polite">
      <RouteProgress />
      <VisuallyHidden>Loading your dashboard</VisuallyHidden>
      <Shimmer h="28px" w="55%" mb={2} />
      <Shimmer h="16px" w="70%" mb={6} />
      <Stack gap={3}>
        {[0, 1, 2].map((i) => (
          <Box
            key={i}
            p={4}
            bg="surface"
            border="1px solid"
            borderColor="line"
            borderRadius="md"
          >
            <Shimmer h="18px" w={i === 1 ? "50%" : "65%"} mb={3} />
            <Shimmer h="32px" w="170px" />
          </Box>
        ))}
      </Stack>
    </Box>
  );
}