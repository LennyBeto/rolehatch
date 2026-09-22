// frontend/app/company/page.tsx
"use client";
import { Box, Heading, Text, Stack, SimpleGrid, Center, Spinner } from "@chakra-ui/react";
import { useEffect, useState } from "react";

type Stats = { total_jobs: number; total_companies: number };

export default function CompanyPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/jobs/stats`)
      .then((res) => res.json())
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <Box maxW="800px" mx="auto" px={4} py={12}>
      <Heading size="lg" color="text" mb={3}>About PerchRole</Heading>
      <Text color="gray.600" fontSize="lg" mb={8}>
        A job search platform built on one idea: listings should come straight from the source.
      </Text>

      <Stack gap={6} color="text">
        <Box>
          <Heading size="sm" mb={2}>Why we exist</Heading>
          <Text fontSize="sm">
            Most job boards are full of reposted, stale, or ghost listings. PerchRole pulls postings
            directly from company career pages and applicant tracking systems — so what you see is
            what's actually open, sourced straight from the employer.
          </Text>
        </Box>

        <Box>
          <Heading size="sm" mb={2}>Free for job seekers, always</Heading>
          <Text fontSize="sm">
            Searching, filtering, saving jobs, and setting up alerts costs nothing and always will.
            We support the platform through optional featured listings, which employers can purchase
            to increase a posting's visibility — job seekers never see ads or pay for access.
          </Text>
        </Box>

        <Box>
          <Heading size="sm" mb={2}>How it works</Heading>
          <Text fontSize="sm">
            Our scrapers sync hourly with each connected company's career page, so listings stay current
            and closed roles disappear automatically rather than lingering as dead links.
          </Text>
        </Box>
      </Stack>

      {loading ? (
        <Center py={10}><Spinner size="sm" color="brand.500" /></Center>
      ) : stats ? (
        <SimpleGrid columns={2} gap={6} mt={10} pt={8} borderTop="1px solid #E5E3DD">
          <Box textAlign="center">
            <Heading size="2xl" color="brand.500">{stats.total_jobs}+</Heading>
            <Text fontSize="sm" color="gray.600">Live roles</Text>
          </Box>
          <Box textAlign="center">
            <Heading size="2xl" color="brand.500">{stats.total_companies}</Heading>
            <Text fontSize="sm" color="gray.600">Companies</Text>
          </Box>
        </SimpleGrid>
      ) : null}
    </Box>
  );
}