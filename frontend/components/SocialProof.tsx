// frontend/components/SocialProof.tsx
"use client";
import { Box, Text, HStack, Image, Center, Spinner } from "@chakra-ui/react";
import { useEffect, useState } from "react";

type Company = { name: string; domain: string | null };
type Stats = { total_jobs: number; total_companies: number };

export default function SocialProof() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;

    if (!apiBaseUrl) {
      setLoading(false);
      return;
    }

    Promise.all([
      fetch(`${apiBaseUrl}/api/companies/featured`).then(async (response) => {
        if (!response.ok) throw new Error(`Featured companies request failed: ${response.status}`);
        return response.json();
      }),
      fetch(`${apiBaseUrl}/api/jobs/stats`).then(async (response) => {
        if (!response.ok) throw new Error(`Jobs stats request failed: ${response.status}`);
        return response.json();
      }),
    ])
      .then(([companiesData, statsData]) => {
        setCompanies(Array.isArray(companiesData) ? companiesData : []);
        setStats(statsData ?? null);
      })
      .catch((err) => {
        // Real fetch/parse errors are still visible to developers, while the
        // component remains usable when the backend is temporarily unavailable.
        console.error("SocialProof: failed to load companies/stats", err);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Center py={8}><Spinner size="sm" color="brand.500" /></Center>;

  // Only hide the whole section if BOTH stats and companies came back
  // empty — previously any empty companies list hid the stats line too,
  // even when stats loaded fine.
  if (!stats && companies.length === 0) return null;

  return (
    <Box py={8} borderTop="1px solid #E5E3DD" borderBottom="1px solid #E5E3DD" bg="surface">
      {stats && (
        <Text textAlign="center" color="gray.600" fontSize="sm" mb={4}>
          <Text as="span" fontWeight="700" color="brand.500">{stats.total_jobs}+</Text> live roles across{" "}
          <Text as="span" fontWeight="700" color="brand.500">{stats.total_companies}</Text> companies
        </Text>
      )}
      {companies.length > 0 && (
        <HStack justify="center" gap={8} flexWrap="wrap" px={4}>
          {companies.map((c) => (
            c.domain && (
              <Image
                key={c.name}
                src={`https://www.google.com/s2/favicons?domain=${c.domain}&sz=64`}
                alt={c.name}
                boxSize="32px"
                opacity={0.7}
                title={c.name}
              />
            )
          ))}
        </HStack>
      )}
    </Box>
  );
}