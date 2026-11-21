// frontend/components/EmployerPricingPreview.tsx
"use client";
import { Box, Heading, Text, HStack, Button } from "@chakra-ui/react";
import Link from "next/link";
import { EMPLOYER_PLANS, EMPLOYER_PLAN_ORDER } from "@/lib/pricing";
import PricingTiers from "./PricingTiers";
import PlanComparison from "./PlanComparison";

const anyPlanLive = EMPLOYER_PLAN_ORDER.some((id) => EMPLOYER_PLANS[id].live);

export default function EmployerPricingPreview({
  showComparison = false,
}: {
  showComparison?: boolean;
}) {
  return (
    <Box as="section" bg="surface" borderTop="1px solid" borderColor="line" py={{ base: 10, md: 12 }} px={4}>
      <Box maxW="1100px" mx="auto" textAlign="center">
        <Heading as="h2" size="lg" color="text" mb={2}>Reach candidates directly</Heading>
        <Text color="fg.muted" maxW="620px" mx="auto" mb={8}>
          {anyPlanLive
            ? "Posting is always free. Pay only when you want a listing seen first, one at a time or with a monthly plan."
            : "Posting is always free. Pay only when you want a listing seen first."}
        </Text>

        <PricingTiers />

        <Text fontSize="sm" color="fg.muted" textAlign="center" mt={6} mb={showComparison ? 12 : 8}>
          {anyPlanLive
            ? "Plans renew monthly. Cancel anytime and keep your perks until the end of the paid period."
            : "Monthly plans are rolling out soon. Featured listings are available now."}
        </Text>

        {showComparison && (
          <Box mb={10}>
            <PlanComparison />
          </Box>
        )}

        <HStack justify="center" gap={4} flexWrap="wrap">
          <Button asChild colorPalette="brand" size="lg" borderRadius="full" px={8}>
            <Link href="/dashboard">Post a Job</Link>
          </Button>
          {!showComparison && (
            <Button asChild variant="outline" colorPalette="brand" size="lg" borderRadius="full" px={8}>
              <Link href="/pricing">View Full Pricing</Link>
            </Button>
          )}
        </HStack>
      </Box>
    </Box>
  );
}