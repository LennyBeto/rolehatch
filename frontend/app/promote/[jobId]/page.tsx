// frontend/app/promote/[jobId]/page.tsx
"use client";
import { Box, Heading, Text } from "@chakra-ui/react";
import { useParams } from "next/navigation";
import PromotePaymentOptions from "@/components/PromotePaymentOptions";
import { FEATURE_PRICING, FEATURE_DAYS } from "@/lib/pricing";

export default function PromoteJobPage() {
  const { jobId } = useParams();

  return (
    <Box maxW="500px" mx="auto" mt={20} textAlign="center">
      <Heading size="md" mb={3}>Feature this listing</Heading>
      <Text color="gray.600" mb={6}>
        Pin your job to the top of search results for {FEATURE_DAYS} days — {FEATURE_PRICING.mpesa.display}.
      </Text>
      <PromotePaymentOptions jobId={jobId as string} />
    </Box>
  );
}