// frontend/components/EmployerPricingPreview.tsx
"use client";
import {
  Box, Heading, Text, SimpleGrid, Stack, HStack, Button, Icon, Badge,
} from "@chakra-ui/react";
import { LuCheck } from "react-icons/lu";
import Link from "next/link";
import {
  FEATURE_PRICING,
  FEATURE_DAYS,
  EMPLOYER_PLANS,
  EMPLOYER_PLAN_ORDER,
  RECOMMENDED_PLAN,
  perListingLabel,
  savingsPercent,
} from "@/lib/pricing";
import PlanSubscribeButton from "./PlanSubscribeButton";
import PlanComparison from "./PlanComparison";

const BENEFITS = [
  "Direct placement in front of engaged job seekers — no reposting delays",
  "Featured placement pins your listing to the top of search results for 14 days",
  "No recruiter agency fees — post directly, pay only for visibility you choose",
];

const anyPlanLive = EMPLOYER_PLAN_ORDER.some((id) => EMPLOYER_PLANS[id].live);

export default function EmployerPricingPreview({
  showComparison = false,
}: {
  showComparison?: boolean;
}) {
  return (
    <Box bg="surface" borderTop="1px solid" borderColor="line" py={12} px={4}>
      <Box maxW="900px" mx="auto" textAlign="center">
        <Heading size="lg" color="text" mb={2}>Reach candidates directly</Heading>
        <Text color="fg.muted" mb={8}>
          {anyPlanLive
            ? "Posting is always free. Feature a single listing, or save with a monthly plan."
            : "Posting is always free. Pay only if you want a listing featured."}
        </Text>

        <SimpleGrid columns={{ base: 1, md: 2 }} gap={8} textAlign="left" mb={12}>
          <Stack gap={3}>
            {BENEFITS.map((b) => (
              <HStack key={b} align="flex-start" gap={2}>
                <Icon color="brand.fg" mt={1} flexShrink={0}><LuCheck /></Icon>
                <Text color="text" fontSize="sm">{b}</Text>
              </HStack>
            ))}
          </Stack>

          <Box bg="background" borderRadius="lg" border="1px solid" borderColor="line" p={6}>
            <Text fontSize="sm" color="fg.muted" mb={1}>Featured Listing</Text>
            <Heading size="xl" color="brand.fg" mb={1}>{FEATURE_PRICING.card.display}</Heading>
            <Text fontSize="sm" color="fg.muted" mb={4}>
              per posting, {FEATURE_DAYS} days — via Paystack
            </Text>
            <Text fontSize="sm" color="text">
              Pins your role above standard listings in every matching search.
            </Text>
          </Box>
        </SimpleGrid>

        <Heading as="h3" size="md" color="text" mb={1}>Monthly plans</Heading>
        <Text color="fg.muted" fontSize="sm" mb={6}>
          Hiring regularly? A plan lowers your cost per featured listing and adds analytics and support.
        </Text>

        <SimpleGrid columns={{ base: 1, lg: 3 }} gap={5} textAlign="left" mb={4}>
          {EMPLOYER_PLAN_ORDER.map((id) => {
            const plan = EMPLOYER_PLANS[id];
            const recommended = id === RECOMMENDED_PLAN;

            return (
              <Stack
                key={id}
                bg="background"
                borderRadius="lg"
                border="2px solid"
                borderColor={recommended ? "brand.solid" : "line"}
                p={6}
                gap={4}
              >
                {recommended && (
                  <Badge
                    colorPalette="brand"
                    variant="solid"
                    alignSelf="flex-start"
                    borderRadius="full"
                    px={3}
                  >
                    Recommended
                  </Badge>
                )}

                <Box>
                  <Text fontSize="sm" fontWeight="600" color="text">{plan.name}</Text>
                  <Text fontSize="xs" color="fg.muted" mt={1}>{plan.summary}</Text>
                </Box>

                <Box>
                  <Heading size="2xl" color="brand.fg" lineHeight="1">{plan.display}</Heading>
                  <Text fontSize="sm" color="fg.muted" mt={1}>per {plan.period}</Text>
                  <Text fontSize="xs" color="brand.fg" fontWeight="600" mt={2}>
                    {perListingLabel(plan)} per featured listing · save {savingsPercent(plan)}%
                  </Text>
                </Box>

                <Stack gap={2} flex="1">
                  {plan.features.map((f) => (
                    <HStack key={f.text} align="flex-start" gap={2}>
                      <Icon color="brand.fg" mt={1} flexShrink={0}><LuCheck /></Icon>
                      <Text color="text" fontSize="sm">
                        {f.text}
                        {f.soon && (
                          <Badge
                            ml={2}
                            size="xs"
                            colorPalette="brand"
                            variant="subtle"
                            borderRadius="full"
                            verticalAlign="middle"
                          >
                            Soon
                          </Badge>
                        )}
                      </Text>
                    </HStack>
                  ))}
                </Stack>

                {plan.live ? (
                  <PlanSubscribeButton
                    planId={id}
                    label={`Choose ${plan.name}`}
                    highlighted={recommended}
                  />
                ) : (
                  <Button
                    colorPalette="brand"
                    variant="outline"
                    w="full"
                    borderRadius="full"
                    disabled
                  >
                    Coming soon
                  </Button>
                )}
              </Stack>
            );
          })}
        </SimpleGrid>

        <Text fontSize="sm" color="fg.muted" textAlign="center" mb={showComparison ? 12 : 8}>
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