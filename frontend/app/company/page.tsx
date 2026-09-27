// frontend/app/company/page.tsx
"use client";
import { Box, Heading, Text, Stack, SimpleGrid, Center, Spinner, Icon } from "@chakra-ui/react";
import { LuTarget, LuHeart, LuRefreshCw } from "react-icons/lu";
import { useEffect, useState } from "react";

type Stats = { total_jobs: number; total_companies: number };

const SECTIONS = [
  {
    icon: LuTarget,
    title: "Why we exist",
    body: "Most job boards are full of reposted, stale, or ghost listings. PerchRole pulls postings directly from company career pages and applicant tracking systems — so what you see is what's actually open, sourced straight from the employer.",
  },
  {
    icon: LuHeart,
    title: "Free for job seekers, always",
    body: "Searching, filtering, saving jobs, and setting up alerts costs nothing and always will. We support the platform through optional featured listings, which employers can purchase to increase a posting's visibility — job seekers never see ads or pay for access.",
  },
  {
    icon: LuRefreshCw,
    title: "How it works",
    body: "Our scrapers sync hourly with each connected company's career page, so listings stay current and closed roles disappear automatically rather than lingering as dead links.",
  },
];

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
    <Box bg="background" minH="100vh">
      <Box maxW="800px" mx="auto" px={4} py={12}>
        <Heading size="lg" color="text" mb={3}>About PerchRole</Heading>
        <Text color="gray.600" fontSize="lg" mb={10}>
          A job search platform built on one idea: listings should come straight from the source.
        </Text>

        <Stack gap={4}>
          {SECTIONS.map((section) => (
            <Box
              key={section.title}
              bg="surface"
              p={5}
              borderRadius="lg"
              border="1px solid #E5E3DD"
              transition="box-shadow 0.15s ease"
              _hover={{ boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}
            >
              <Stack direction="row" gap={3} align="flex-start">
                <Center
                  boxSize="36px"
                  borderRadius="md"
                  bg="brand.50"
                  color="brand.500"
                  flexShrink={0}
                >
                  <Icon boxSize={5}><section.icon /></Icon>
                </Center>
                <Box>
                  <Heading size="sm" color="text" mb={1}>{section.title}</Heading>
                  <Text fontSize="sm" color="gray.600" lineHeight="1.7">{section.body}</Text>
                </Box>
              </Stack>
            </Box>
          ))}
        </Stack>

        {loading ? (
          <Center py={10}><Spinner size="sm" color="brand.500" /></Center>
        ) : stats ? (
          <SimpleGrid columns={2} gap={4} mt={10}>
            <Box
              bg="surface"
              border="1px solid #E5E3DD"
              borderRadius="lg"
              py={8}
              textAlign="center"
            >
              <Heading size="2xl" color="brand.500">{stats.total_jobs}+</Heading>
              <Text fontSize="sm" color="gray.600" mt={1}>Live roles</Text>
            </Box>
            <Box
              bg="surface"
              border="1px solid #E5E3DD"
              borderRadius="lg"
              py={8}
              textAlign="center"
            >
              <Heading size="2xl" color="brand.500">{stats.total_companies}</Heading>
              <Text fontSize="sm" color="gray.600" mt={1}>Companies</Text>
            </Box>
          </SimpleGrid>
        ) : null}
      </Box>
    </Box>
  );
}