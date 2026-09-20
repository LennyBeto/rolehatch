// frontend/components/JobList.tsx
"use client";
import { Box, Heading, Text, Badge, Stack, Button } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toaster } from "@/components/ui/toaster";

type Job = {
  id: string; title: string; location: string | null;
  remote_type: string | null; salary_min: number | null; salary_max: number | null;
  source: string; source_url: string;
};

export default function JobList() {
  const searchParams = useSearchParams();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    const title = searchParams.get("title");
    const remoteType = searchParams.get("remote_type");
    const salaryMin = searchParams.get("salary_min");

    if (title) params.set("title", title);
    if (remoteType) params.set("remote_type", remoteType);
    if (salaryMin) params.set("salary_min", salaryMin);

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/jobs/search?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load jobs");
        return res.json();
      })
      .then(setJobs)
      .catch(() => toaster.create({ title: "Couldn't load jobs", type: "error" }))
      .finally(() => setLoading(false));
  }, [searchParams]);

  if (loading) return <Text>Loading jobs…</Text>;
  if (jobs.length === 0) return <Text color="gray.500">No jobs match your filters.</Text>;

  return (
    <Stack gap={3}>
      {jobs.map((job) => (
        <Box key={job.id} bg="surface" p={4} borderRadius="md" border="1px solid #E5E3DD">
          <Heading size="md">{job.title}</Heading>
          <Text color="gray.600" fontSize="sm">{job.location}</Text>
          {job.remote_type && <Badge colorPalette="brand" mt={1}>{job.remote_type}</Badge>}
          {job.salary_min && <Text fontSize="sm" mt={1}>${job.salary_min}–${job.salary_max}/yr</Text>}
          <Button as="a" href={job.source_url} target="_blank" rel="noopener noreferrer"
            size="sm" mt={3} colorPalette="brand">
            View Job
          </Button>
        </Box>
      ))}
    </Stack>
  );
}