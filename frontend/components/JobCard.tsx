// frontend/components/JobCard.tsx
"use client";
import { Box, Heading, Text, Badge, HStack, Button, Flex, Image } from "@chakra-ui/react";
import { formatPostAge } from "@/lib/formatPostAge";

type Job = {
  id: string; title: string; location: string | null;
  remote_type: string | null; commitment: string | null;
  salary_min: number | null; salary_max: number | null;
  source: string; source_url: string; is_featured: boolean;
  posted_at: string | null; company_name: string | null; company_domain: string | null;
};

export default function JobCard({ job }: { job: Job }) {
  const logoUrl = job.company_domain
    ? `https://www.google.com/s2/favicons?domain=${job.company_domain}&sz=64`
    : null;

  return (
    <Box
      bg="surface"
      p={5}
      borderRadius="lg"
      border="1px solid #E5E3DD"
      position="relative"
      transition="box-shadow 0.15s ease, transform 0.15s ease"
      _hover={{ boxShadow: "0 4px 16px rgba(0,0,0,0.06)", transform: "translateY(-1px)" }}
    >
      {job.is_featured && (
        <Badge position="absolute" top={4} right={5} colorPalette="orange" variant="solid" borderRadius="full" px={3}>
          FEATURED
        </Badge>
      )}

      <Flex gap={3} align="flex-start" pr={job.is_featured ? "90px" : 0}>
        {logoUrl && (
          <Image src={logoUrl} alt={job.company_name ?? "Company logo"} boxSize="40px" borderRadius="md" mt={1} />
        )}
        <Box flex={1}>
          <Flex justify="space-between" align="flex-start">
            <Box>
              <Heading size="md" color="text" mb={1}>{job.title}</Heading>
              <Text color="gray.600" fontSize="sm">
                {job.company_name ?? "Company"} · {job.location}
              </Text>
            </Box>
            {job.salary_min && (
              <Text fontSize="sm" fontWeight="600" color="text" whiteSpace="nowrap">
                ${job.salary_min}k – ${job.salary_max}k
              </Text>
            )}
          </Flex>

          <HStack gap={2} mt={3} flexWrap="wrap">
            {job.remote_type && <Badge colorPalette="brand" variant="subtle">{job.remote_type}</Badge>}
            {job.commitment && <Badge variant="outline">{job.commitment}</Badge>}
            <Badge variant="outline" textTransform="capitalize">{job.source}</Badge>
            <Text fontSize="xs" color="gray.500">{formatPostAge(job.posted_at)}</Text>
          </HStack>

          <Box mt={4}>
            <Button asChild size="sm" colorPalette="brand">
              <a href={job.source_url} target="_blank" rel="noopener noreferrer">
                View Job
              </a>
            </Button>
          </Box>
        </Box>
      </Flex>
    </Box>
  );
}