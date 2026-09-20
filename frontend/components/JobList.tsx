// frontend/components/JobList.tsx
"use client";
import { Box, Heading, Text, Badge, Stack, Button, Spinner, Center, HStack } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toaster } from "@/components/ui/toaster";

type Job = {
  id: string; title: string; location: string | null;
  remote_type: string | null; salary_min: number | null; salary_max: number | null;
  source: string; source_url: string;
};

type SearchResponse = {
  jobs: Job[]; total: number; page: number; page_size: number; total_pages: number;
};

export default function JobList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const currentPage = Number(searchParams.get("page") ?? 1);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    const title = searchParams.get("title");
    const remoteType = searchParams.get("remote_type");
    const salaryMin = searchParams.get("salary_min");

    if (title) params.set("title", title);
    if (remoteType) params.set("remote_type", remoteType);
    if (salaryMin) params.set("salary_min", salaryMin);
    params.set("page", String(currentPage));

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/jobs/search?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load jobs");
        return res.json();
      })
      .then(setData)
      .catch(() => toaster.create({ title: "Couldn't load jobs", type: "error" }))
      .finally(() => setLoading(false));
  }, [searchParams, currentPage]);

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    router.push(`/?${params.toString()}`);
  };

  if (loading) {
    return (
      <Center py={20}>
        <Spinner size="lg" color="brand.500" />
      </Center>
    );
  }

  if (!data || data.jobs.length === 0) {
    return (
      <Center py={20}>
        <Text color="gray.500">No jobs match your filters.</Text>
      </Center>
    );
  }

  return (
    <Stack gap={4}>
      {data.jobs.map((job) => (
        <Box
          key={job.id}
          bg="surface"
          p={5}
          borderRadius="lg"
          border="1px solid #E5E3DD"
          transition="box-shadow 0.15s ease, transform 0.15s ease"
          _hover={{ boxShadow: "0 4px 16px rgba(0,0,0,0.06)", transform: "translateY(-1px)" }}
        >
          <Heading size="md" color="text" mb={1}>{job.title}</Heading>
          <Text color="gray.600" fontSize="sm" mb={2}>{job.location}</Text>
          {job.remote_type && (
            <Badge colorPalette="brand" variant="subtle" mr={2}>{job.remote_type}</Badge>
          )}
          {job.salary_min && (
            <Text as="span" fontSize="sm" color="gray.700">
              ${job.salary_min}k–${job.salary_max}k/yr
            </Text>
          )}
          <Box mt={3}>
            <Button
              as="a" href={job.source_url} target="_blank" rel="noopener noreferrer"
              size="sm" colorPalette="brand"
            >
              View Job
            </Button>
          </Box>
        </Box>
      ))}

      {data.total_pages > 1 && (
        <HStack justify="center" pt={4} gap={2}>
          <Button
            size="sm" variant="outline" colorPalette="brand"
            disabled={currentPage <= 1}
            onClick={() => goToPage(currentPage - 1)}
          >
            Previous
          </Button>
          <Text fontSize="sm" color="gray.600" px={2}>
            Page {data.page} of {data.total_pages}
          </Text>
          <Button
            size="sm" variant="outline" colorPalette="brand"
            disabled={currentPage >= data.total_pages}
            onClick={() => goToPage(currentPage + 1)}
          >
            Next
          </Button>
        </HStack>
      )}
    </Stack>
  );
}