// frontend/components/RouteProgress.tsx
"use client";
import { Box } from "@chakra-ui/react";

/** Thin indeterminate bar pinned to the top of the viewport during route loads. */
export default function RouteProgress() {
  return (
    <Box
      role="progressbar"
      aria-label="Loading page"
      position="fixed"
      top={0}
      left={0}
      right={0}
      h="3px"
      overflow="hidden"
      zIndex={20}
    >
      <Box
        h="100%"
        w="30%"
        bg="brand.ring"
        borderRadius="full"
        animation="progressSlide 1.2s ease-in-out infinite"
        _motionReduce={{ animation: "none", w: "100%", opacity: 0.5 }}
      />
    </Box>
  );
}