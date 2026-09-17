// frontend/components/JobList.tsx
"use client";
import { Box, Heading, Text, Badge, Stack, Button } from "@chakra-ui/react";
import { useEffect, useState } from "react";

type Job = {
  id: string; title: string; location: string | null;
  remote_type: string | null; salary_min: number | null; salary_max: number | null;
  company_name: string; source_url: string;
};

export default function JobList() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/jobs/search`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load jobs");
        return res.json();
      })
      .then(setJobs)
      .catch(() => setError("Couldn't load jobs"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Text>Loading jobs…</Text>;

  if (error) return <Text color="red.500">{error}</Text>;

  return (
    <Stack gap={3}>
      {jobs.length === 0 ? (
        <Text>No jobs found.</Text>
      ) : (
        jobs.map((job) => (
          <Box key={job.id} bg="surface" p={4} borderRadius="md" border="1px solid #E5E3DD">
            <Heading size="md">{job.title}</Heading>
            <Text color="gray.600" fontSize="sm">{job.company_name} · {job.location}</Text>
            {job.remote_type && <Badge colorScheme="brand" mt={1}>{job.remote_type}</Badge>}
            {job.salary_min && (
              <Text fontSize="sm" mt={1}>${job.salary_min}–${job.salary_max}/yr</Text>
            )}
            <Button
              as={Link} href={job.source_url} target="_blank" rel="noopener noreferrer"
              size="sm" mt={3} colorScheme="brand"
            >
              View Job
            </Button>
          </Box>
        ))
      )}
    </Stack>
  );
}
