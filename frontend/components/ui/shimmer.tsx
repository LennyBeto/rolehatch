// frontend/components/ui/shimmer.tsx
"use client";
import { Box, type BoxProps } from "@chakra-ui/react";

/** Decorative loading placeholder. Pass size/shape props; colors and motion are built in. */
export default function Shimmer(props: BoxProps) {
  return (
    <Box
      aria-hidden="true"
      borderRadius="md"
      bgGradient="to-r"
      gradientFrom="skeleton.base"
      gradientVia="skeleton.shine"
      gradientTo="skeleton.base"
      bgSize="200% 100%"
      animation="shimmer 1.8s linear infinite"
      _motionReduce={{ animation: "none" }}
      {...props}
    />
  );
}