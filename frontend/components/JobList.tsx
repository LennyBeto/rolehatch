// frontend/components/JobList.tsx
"use client";
import { Box, Heading, Text, Stack, Spinner, Center } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toaster } from "@/components/ui/toaster";
import JobCard from "./JobCard";
import PaginationControls from "./PaginationControls";
import JobListSkeleton from "./JobListSkeleton";

type Job = Parameters<typeof JobCard>[0]["job"];

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
    const location = searchParams.get("location");

    if (title) params.set("title", title);
    if (remoteType) params.set("remote_type", remoteType);
    if (salaryMin) params.set("salary_min", salaryMin);
    if (location) params.set("location", location);
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
    router.push(`/?${params.toString()}#listings`);
  };

 // if (loading) return <Center py={20}><Spinner size="lg" color="brand.500" /></Center>;
 if (loading) return <JobListSkeleton />; 
 if (!data || data.jobs.length === 0) {
    return <Center py={20}><Text color="gray.500">No jobs match your filters.</Text></Center>;
  }

  const featured = data.jobs.filter((j) => j.is_featured);
  const regular = data.jobs.filter((j) => !j.is_featured);

  return (
    <Stack gap={6}>
      {featured.length > 0 && (
        <Box>
          <Heading size="sm" color="gray.500" mb={3} textTransform="uppercase" letterSpacing="wide">
            Featured Roles
          </Heading>
          <Stack gap={4}>
            {featured.map((job) => <JobCard key={job.id} job={job} />)}
          </Stack>
        </Box>
      )}

      <Box>
        {featured.length > 0 && (
          <Heading size="sm" color="gray.500" mb={3} textTransform="uppercase" letterSpacing="wide">
            All Jobs
          </Heading>
        )}
        <Stack gap={4}>
          {regular.map((job) => <JobCard key={job.id} job={job} />)}
        </Stack>
      </Box>

      <PaginationControls
        currentPage={data.page}
        totalPages={data.total_pages}
        onPageChange={goToPage}
      />
    </Stack>
  );
}