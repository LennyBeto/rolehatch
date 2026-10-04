// frontend/components/SocialProof.tsx
"use client";
import { Box, Text, HStack, Image, Center, Spinner } from "@chakra-ui/react";
import { useEffect, useState } from "react";

type Company = { name: string; domain: string | null };
type Stats = { total_jobs: number; total_companies: number };

async function getJson<T>(baseUrl: string, path: string): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`);
  if (!response.ok) throw new Error(`${path} request failed: ${response.status}`);
  return response.json();
}

export default function SocialProof() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [failedLogos, setFailedLogos] = useState<Set<string>>(new Set());

  useEffect(() => {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;

    if (!apiBaseUrl) {
      console.warn("SocialProof: NEXT_PUBLIC_API_URL is not set");
      setLoading(false);
      return;
    }

    let cancelled = false;

    Promise.allSettled([
      getJson<Company[]>(apiBaseUrl, "/api/companies/featured"),
      getJson<Stats>(apiBaseUrl, "/api/jobs/stats"),
    ]).then(([companiesResult, statsResult]) => {
      if (cancelled) return;

      if (companiesResult.status === "fulfilled") {
        setCompanies(Array.isArray(companiesResult.value) ? companiesResult.value : []);
      } else {
        // warn, not error: console.error triggers the Next.js dev overlay
        console.warn("SocialProof: companies unavailable", companiesResult.reason);
      }

      if (statsResult.status === "fulfilled") {
        setStats(statsResult.value ?? null);
      } else {
        console.warn("SocialProof: stats unavailable", statsResult.reason);
      }

      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleCompanies = companies.filter((c) => c.domain && !failedLogos.has(c.name));

  if (loading) return <Center py={8}><Spinner size="sm" color="brand.500" /></Center>;

  // Hide the section only if BOTH stats and logos are unavailable.
  if (!stats && visibleCompanies.length === 0) return null;

  return (
    <Box py={8} borderTop="1px solid #E5E3DD" borderBottom="1px solid #E5E3DD" bg="surface">
      {stats && (
        <Text
          textAlign="center"
          color="gray.600"
          fontSize="sm"
          mb={visibleCompanies.length > 0 ? 4 : 0}
        >
          <Text as="span" fontWeight="700" color="brand.500">{stats.total_jobs}+</Text> live roles across{" "}
          <Text as="span" fontWeight="700" color="brand.500">{stats.total_companies}</Text> companies
        </Text>
      )}
      {visibleCompanies.length > 0 && (
        <HStack justify="center" gap={8} flexWrap="wrap" px={4}>
          {visibleCompanies.map((c) => (
            <Image
              key={c.name}
              src={`https://www.google.com/s2/favicons?domain=${c.domain}&sz=64`}
              alt={c.name}
              boxSize="32px"
              opacity={0.7}
              title={c.name}
              onError={() => setFailedLogos((prev) => new Set(prev).add(c.name))}
            />
          ))}
        </HStack>
      )}
    </Box>
  );
}