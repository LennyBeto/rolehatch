// frontend/components/JobListSkeleton.tsx
import { Box, Skeleton, Stack } from "@chakra-ui/react";

export default function JobListSkeleton() {
  return (
    <Stack gap={4}>
      {[...Array(5)].map((_, i) => (
        <Box key={i} bg="surface" p={5} borderRadius="lg" border="1px solid #E5E3DD">
          <Skeleton height="20px" width="60%" mb={2} />
          <Skeleton height="14px" width="40%" mb={3} />
          <Skeleton height="24px" width="120px" />
        </Box>
      ))}
    </Stack>
  );
}