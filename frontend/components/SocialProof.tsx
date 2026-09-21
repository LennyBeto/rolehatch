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
    Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/companies/featured`).then((r) => r.json()),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/jobs/stats`).then((r) => r.json()),
    ])
      .then(([companiesData, statsData]) => {
        setCompanies(companiesData);
        setStats(statsData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Center py={8}><Spinner size="sm" color="brand.500" /></Center>;
  if (companies.length === 0) return null;

  return (
    <Box py={8} borderTop="1px solid #E5E3DD" borderBottom="1px solid #E5E3DD" bg="surface">
      {stats && (
        <Text textAlign="center" color="gray.600" fontSize="sm" mb={4}>
          <Text as="span" fontWeight="700" color="brand.500">{stats.total_jobs}+</Text> live roles across{" "}
          <Text as="span" fontWeight="700" color="brand.500">{stats.total_companies}</Text> companies
        </Text>
      )}
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
    </Box>
  );
}