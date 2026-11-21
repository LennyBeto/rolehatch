// frontend/components/PricingTiers.tsx
"use client";
import { Badge, Box, Button, Heading, HStack, Icon, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import { LuCheck } from "react-icons/lu";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  FEATURE_PRICING,
  FEATURE_DAYS,
  PAYG_PLAN,
  EMPLOYER_PLANS,
  EMPLOYER_PLAN_ORDER,
  RECOMMENDED_PLAN,
  perListingLabel,
  perListingPrice,
  savingsPercent,
  type PlanFeature,
} from "@/lib/pricing";
import PlanSubscribeButton from "./PlanSubscribeButton";

type TierView = {
  id: string;
  name: string;
  summary: string;
  price: string;
  cadence: string;
  unitText: string;
  /** Cost per listing relative to the pay-as-you-go price (1 = full price). */
  unitRatio: number;
  caption: string;
  features: PlanFeature[];
  recommended: boolean;
  action: ReactNode;
};

function buildTiers(): TierView[] {
  const payg = FEATURE_PRICING.card;

  const paygTier: TierView = {
    id: "payg",
    name: PAYG_PLAN.name,
    summary: PAYG_PLAN.summary,
    price: payg.display,
    cadence: `per posting, ${FEATURE_DAYS} days`,
    unitText: `${payg.display} per featured listing`,
    unitRatio: 1,
    caption: "Standard rate",
    features: PAYG_PLAN.features,
    recommended: false,
    action: (
      <Button asChild colorPalette="brand" variant="outline" size="lg" w="full" borderRadius="full">
        <Link href="/dashboard">Feature a listing</Link>
      </Button>
    ),
  };

  const planTiers: TierView[] = EMPLOYER_PLAN_ORDER.map((id) => {
    const plan = EMPLOYER_PLANS[id];
    const recommended = id === RECOMMENDED_PLAN;
    return {
      id,
      name: plan.name,
      summary: plan.summary,
      price: plan.display,
      cadence: `per ${plan.period}`,
      unitText: `${perListingLabel(plan)} per featured listing`,
      unitRatio: perListingPrice(plan) / payg.amount,
      caption: `Save ${savingsPercent(plan)}% compared with pay as you go`,
      features: plan.features,
      recommended,
      action: plan.live ? (
        <PlanSubscribeButton planId={id} label={`Choose ${plan.name}`} highlighted={recommended} />
      ) : (
        <Button colorPalette="brand" variant="outline" size="lg" w="full" borderRadius="full" disabled>
          Coming soon
        </Button>
      ),
    };
  });

  return [paygTier, ...planTiers];
}

function TierCard({ tier }: { tier: TierView }) {
  const barWidth = `${Math.max(4, Math.round(tier.unitRatio * 100))}%`;

  return (
    <Stack
      as="section"
      aria-labelledby={`tier-${tier.id}`}
      gap={5}
      p={{ base: 5, md: 6 }}
      bg="background"
      borderRadius="lg"
      border={tier.recommended ? "2px solid" : "1px solid"}
      borderColor={tier.recommended ? "brand.focusRing" : "line"}
      textAlign="left"
      order={{ base: tier.recommended ? 0 : 1, lg: 0 }}
    >
      <Stack gap={2}>
        <HStack justify="space-between" align="center" minH="28px">
          <Heading as="h3" id={`tier-${tier.id}`} size="md" color="text">
            {tier.name}
          </Heading>
          {tier.recommended && (
            <Badge colorPalette="brand" variant="solid" borderRadius="full" px={3}>
              Recommended
            </Badge>
          )}
        </HStack>
        <Text fontSize="sm" color="fg.muted" minH={{ lg: "40px" }}>
          {tier.summary}
        </Text>
      </Stack>

      <Box>
        <Heading size="2xl" color="brand.fg" lineHeight="1" css={{ fontVariantNumeric: "tabular-nums" }}>
          {tier.price}
        </Heading>
        <Text fontSize="sm" color="fg.muted" mt={1}>{tier.cadence}</Text>
      </Box>

      <Stack gap={2}>
        <Text fontSize="sm" fontWeight="600" color="text">{tier.unitText}</Text>
        <Box aria-hidden h="8px" bg="brand.muted" borderRadius="full" overflow="hidden">
          <Box h="full" w={barWidth} bg="brand.focusRing" borderRadius="full" />
        </Box>
        <Text fontSize="xs" color="fg.muted">{tier.caption}</Text>
      </Stack>

      <Stack as="ul" gap={2.5} flex="1" listStyleType="none" m={0} p={0}>
        {tier.features.map((f) => (
          <HStack as="li" key={f.text} align="flex-start" gap={2.5}>
            <Icon color="brand.fg" mt={1} flexShrink={0}><LuCheck /></Icon>
            <Text color="text" fontSize="sm">
              {f.text}
              {f.soon && (
                <Badge ml={2} size="xs" colorPalette="brand" variant="subtle" borderRadius="full" verticalAlign="middle">
                  Soon
                </Badge>
              )}
            </Text>
          </HStack>
        ))}
      </Stack>

      <Box pt={1}>{tier.action}</Box>
    </Stack>
  );
}

export default function PricingTiers() {
  const tiers = buildTiers();
  return (
    <SimpleGrid columns={{ base: 1, lg: 3 }} gap={{ base: 5, lg: 6 }} alignItems="stretch">
      {tiers.map((tier) => (
        <TierCard key={tier.id} tier={tier} />
      ))}
    </SimpleGrid>
  );
}