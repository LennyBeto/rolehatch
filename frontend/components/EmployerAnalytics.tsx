// frontend/components/EmployerAnalytics.tsx
"use client";

import { useEffect, useState } from "react";
import { Box, Button, Flex, Heading, SimpleGrid, Text } from "@chakra-ui/react";

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

  useEffect(() => {
    if (!accessToken) return;
    const ctrl = new AbortController();
    setStatus("loading");
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
        if (e?.name !== "AbortError") setStatus("error");
      });
    return () => ctrl.abort();
  }, [accessToken, range]);

  const max = data ? Math.max(1, ...data.series.map((d) => Math.max(d.views, d.apply_clicks))) : 1;
  const hasActivity = !!data && (data.totals.views > 0 || data.totals.apply_clicks > 0);

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
      <Flex justify="space-between" align="flex-start" gap={3} wrap="wrap" mb={4}>
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

      {status === "error" && (
        <Text role="alert" fontSize="sm" color="text">
          Couldn’t load your stats. Refresh the page, or try again in a minute.
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