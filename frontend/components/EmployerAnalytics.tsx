// frontend/components/EmployerAnalytics.tsx
"use client";

import { useEffect, useState } from "react";
import NextLink from "next/link";
import { LuLock } from "react-icons/lu";
import { Box, Button, Flex, Heading, Link as ChakraLink, SimpleGrid, Text } from "@chakra-ui/react";
import { EMPLOYER_PLANS, EMPLOYER_PLAN_ORDER } from "@/lib/pricing";

type Day = { day: string; views: number; apply_clicks: number };
type Listing = { id: string; title: string; views: number; apply_clicks: number };
type Summary = {
  days: number;
  totals: { views: number; apply_clicks: number };
  series: Day[];
  listings: Listing[];
};

const RANGES = [7, 14, 30] as const;
const API = process.env.NEXT_PUBLIC_API_URL;

const rate = (views: number, clicks: number) =>
  views > 0 ? `${Math.round((clicks / views) * 100)}%` : "–";

// Widest preset that fits inside the plan's analytics window.
const maxRange = (days: number): number => [...RANGES].filter((r) => r <= days).pop() ?? RANGES[0];

// Cheapest plan whose window covers `days` (used in the upgrade hint).
const planFor = (days: number): string | undefined =>
  EMPLOYER_PLAN_ORDER.map((id) => EMPLOYER_PLANS[id]).find((p) => p.limits.analyticsDays >= days)?.name;

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <Box bg="background" borderRadius="md" px={{ base: 3, md: 4 }} py={3} minW={0}>
      <Text fontSize={{ base: "xl", md: "2xl" }} fontWeight="semibold" color="text" lineHeight="1.1">
        {value}
      </Text>
      <Text fontSize="xs" color="text" opacity={0.7} mt={1}>
        {label}
      </Text>
    </Box>
  );
}

function Swatch({ kind, label }: { kind: "views" | "clicks"; label: string }) {
  const light = kind === "views" ? "brand.500" : "brand.700";
  const dark = kind === "views" ? "brand.400" : "brand.300";
  return (
    <Flex align="center" gap={2}>
      <Box w="10px" h="10px" borderRadius="sm" bg={light} _dark={{ bg: dark }} />
      <Text fontSize="xs" color="text" opacity={0.7}>
        {label}
      </Text>
    </Flex>
  );
}

export default function EmployerAnalytics({ accessToken }: { accessToken?: string }) {
  const [range, setRange] = useState<number>(14);
  const [data, setData] = useState<Summary | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorCode, setErrorCode] = useState<string | null>(null);

  // Widest window this employer's plan allows. null = unknown (nothing is locked in the UI;
  // the backend is what actually enforces the limit).
  const [allowedDays, setAllowedDays] = useState<number | null>(null);
  const [accessReady, setAccessReady] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    const ctrl = new AbortController();
    fetch(`${API}/api/promote/entitlements`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: ctrl.signal,
    })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((json: { analytics_days?: number }) => {
        const days = typeof json.analytics_days === "number" ? json.analytics_days : null;
        setAllowedDays(days);
        if (days !== null) setRange((current) => Math.min(current, maxRange(days)));
        setAccessReady(true);
      })
      .catch((e) => {
        if (e?.name !== "AbortError") setAccessReady(true);
      });
    return () => ctrl.abort();
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken || !accessReady) return;
    const ctrl = new AbortController();
    setStatus("loading");
    setErrorCode(null);
    fetch(`${API}/api/analytics/employer/summary?days=${range}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: ctrl.signal,
    })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((json: Summary) => {
        setData(json);
        setStatus("ready");
      })
      .catch((e) => {
        if (e?.name === "AbortError") return;
        setErrorCode(/^\d+$/.test(e?.message ?? "") ? e.message : null);
        setStatus("error");
      });
    return () => ctrl.abort();
  }, [accessToken, accessReady, range]);

  const max = data ? Math.max(1, ...data.series.map((d) => Math.max(d.views, d.apply_clicks))) : 1;
  const hasActivity = !!data && (data.totals.views > 0 || data.totals.apply_clicks > 0);

  const lockedAny = allowedDays !== null && RANGES.some((r) => r > allowedDays);
  const upgradePlans =
    allowedDays === null
      ? ""
      : EMPLOYER_PLAN_ORDER.map((id) => EMPLOYER_PLANS[id])
          .filter((p) => p.limits.analyticsDays > allowedDays)
          .map((p) => p.name)
          .join(" and ");

  return (
    <Box
      as="section"
      aria-labelledby="employer-analytics-title"
      bg="surface"
      borderWidth="1px"
      borderColor="line"
      borderRadius="lg"
      p={{ base: 4, md: 6 }}
      mb={6}
    >
      <Flex justify="space-between" align="flex-start" gap={3} wrap="wrap" mb={lockedAny ? 2 : 4}>
        <Box minW={0}>
          <Heading as="h2" id="employer-analytics-title" size="md" color="text">
            Listing performance
          </Heading>
          <Text fontSize="sm" color="text" opacity={0.7} mt={1}>
            Views and apply clicks on your listings.
          </Text>
        </Box>
        <Flex gap={1} role="group" aria-label="Date range">
          {RANGES.map((r) => {
            const locked = allowedDays !== null && r > allowedDays;
            if (locked) {
              return (
                <Button key={r} asChild size="sm" colorPalette="brand" variant="outline">
                  <NextLink
                    href="/pricing"
                    aria-label={`${r} days: available on ${planFor(r) ?? "a higher plan"}. See plans`}
                  >
                    {r} days <LuLock aria-hidden="true" />
                  </NextLink>
                </Button>
              );
            }
            const active = r === range;
            return (
              <Button
                key={r}
                size="sm"
                colorPalette="brand"
                variant={active ? "solid" : "outline"}
                aria-pressed={active}
                onClick={() => setRange(r)}
              >
                {r} days
              </Button>
            );
          })}
        </Flex>
      </Flex>

      {lockedAny && (
        <Text fontSize="xs" color="text" opacity={0.7} mb={4}>
          Longer history is available on {upgradePlans}.{" "}
          <ChakraLink asChild color="brand.fg" textDecoration="underline">
            <NextLink href="/pricing">See plans</NextLink>
          </ChakraLink>
        </Text>
      )}

      {status === "error" && (
        <Text role="alert" fontSize="sm" color="text">
          Couldn’t load your stats. Refresh the page, or try again in a minute.
          {errorCode && (
            <Text as="span" display="block" fontSize="xs" opacity={0.7} mt={1}>
              Error {errorCode}
            </Text>
          )}
        </Text>
      )}

      {status === "loading" && !data && (
        <Text fontSize="sm" color="text" opacity={0.7} aria-live="polite">
          Loading your stats…
        </Text>
      )}

      {data && status !== "error" && (
        <>
          <SimpleGrid columns={3} gap={{ base: 2, md: 3 }} mb={5}>
            <Tile label="Views" value={data.totals.views.toLocaleString()} />
            <Tile label="Apply clicks" value={data.totals.apply_clicks.toLocaleString()} />
            <Tile label="Click rate" value={rate(data.totals.views, data.totals.apply_clicks)} />
          </SimpleGrid>

          {!hasActivity ? (
            <Text fontSize="sm" color="text" opacity={0.8}>
              No activity yet. Views and apply clicks show up here shortly after the first visit.
            </Text>
          ) : (
            <Box mb={5}>
              <Flex gap={4} mb={3}>
                <Swatch kind="views" label="Views" />
                <Swatch kind="clicks" label="Apply clicks" />
              </Flex>
              <Flex
                role="img"
                aria-label={`Daily views and apply clicks for the last ${data.days} days. ${data.totals.views} views and ${data.totals.apply_clicks} apply clicks in total.`}
                align="flex-end"
                gap={{ base: "2px", md: "4px" }}
                h="120px"
                borderBottomWidth="1px"
                borderColor="line"
              >
                {data.series.map((d) => (
                  <Flex
                    key={d.day}
                    flex="1"
                    minW={0}
                    h="100%"
                    align="flex-end"
                    gap="1px"
                    title={`${d.day}: ${d.views} views, ${d.apply_clicks} apply clicks`}
                  >
                    <Box
                      flex="1"
                      borderTopRadius="2px"
                      bg="brand.500"
                      _dark={{ bg: "brand.400" }}
                      h={`${(d.views / max) * 100}%`}
                      minH={d.views ? "2px" : "0"}
                    />
                    <Box
                      flex="1"
                      borderTopRadius="2px"
                      bg="brand.700"
                      _dark={{ bg: "brand.300" }}
                      h={`${(d.apply_clicks / max) * 100}%`}
                      minH={d.apply_clicks ? "2px" : "0"}
                    />
                  </Flex>
                ))}
              </Flex>
              <Flex justify="space-between" mt={1}>
                <Text fontSize="xs" color="text" opacity={0.6}>
                  {data.series[0]?.day.slice(5)}
                </Text>
                <Text fontSize="xs" color="text" opacity={0.6}>
                  {data.series[data.series.length - 1]?.day.slice(5)}
                </Text>
              </Flex>
            </Box>
          )}

          {data.listings.length > 0 && (
            <Box as="ul" listStyleType="none" m={0} p={0}>
              {data.listings.map((l) => (
                <Box as="li" key={l.id} py={3} borderTopWidth="1px" borderColor="line">
                  <Text fontWeight="medium" color="text" lineClamp={2} mb={1}>
                    {l.title}
                  </Text>
                  <Flex gap={4} wrap="wrap" fontSize="sm" color="text" opacity={0.8}>
                    <Text>{l.views.toLocaleString()} views</Text>
                    <Text>{l.apply_clicks.toLocaleString()} apply clicks</Text>
                    <Text>{rate(l.views, l.apply_clicks)} click rate</Text>
                  </Flex>
                </Box>
              ))}
            </Box>
          )}
        </>
      )}
    </Box>
  );
}