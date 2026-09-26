// frontend/components/JobList.tsx — wrap the results in a gated overlay when signed out
"use client";
import { Box, Heading, Text, Stack, Center } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toaster } from "@/components/ui/toaster";
import { useAuth } from "@/lib/AuthContext";
import JobCard from "./JobCard";
import PaginationControls from "./PaginationControls";
import JobListSkeleton from "./JobListSkeleton";
import SignInModal from "./SignInModal";

type Job = Parameters<typeof JobCard>[0]["job"];
type SearchResponse = { jobs: Job[]; total: number; page: number; page_size: number; total_pages: number };

const SIGNED_OUT_PREVIEW_COUNT = 3;

export default function JobList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const currentPage = Number(searchParams.get("page") ?? 1);

   useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    const title = searchParams.get("title");
    const remoteType = searchParams.get("remote_type");
    const salaryMin = searchParams.get("salary_min");
    const location = searchParams.get("location");
    const language = searchParams.get("language");

    if (title) params.set("title", title);
    if (remoteType) params.set("remote_type", remoteType);
    if (salaryMin) params.set("salary_min", salaryMin);
    if (location) params.set("location", location);
    if (language) params.set("language", language);
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

  if (loading) return <JobListSkeleton />;
  if (!data || data.jobs.length === 0) {
    return <Center py={20}><Text color="gray.500">No jobs match your filters.</Text></Center>;
  }

  const featured = data.jobs.filter((j) => j.is_featured);
  const regular = data.jobs.filter((j) => !j.is_featured);
  const visibleJobs = user ? data.jobs : data.jobs.slice(0, SIGNED_OUT_PREVIEW_COUNT);

  return (
    <Stack gap={6}>
      {user && featured.length > 0 && (
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
        {user && featured.length > 0 && (
          <Heading size="sm" color="gray.500" mb={3} textTransform="uppercase" letterSpacing="wide">
            All Jobs
          </Heading>
        )}
        <Stack gap={4}>
          {(user ? regular : visibleJobs).map((job) => <JobCard key={job.id} job={job} />)}
        </Stack>
      </Box>

      {!user && data.jobs.length > SIGNED_OUT_PREVIEW_COUNT && (
        <Box
          textAlign="center"
          py={8}
          bg="surface"
          border="1px dashed #E5E3DD"
          borderRadius="lg"
        >
          <Text color="text" fontWeight="600" mb={1}>
            {data.total - SIGNED_OUT_PREVIEW_COUNT}+ more jobs waiting
          </Text>
          <Text color="gray.600" fontSize="sm" mb={4}>
            Sign in free to see every listing and apply directly.
          </Text>
          <Box
            as="button"
            onClick={() => setModalOpen(true)}
            bg="brand.500"
            color="white"
            px={6}
            py={2}
            borderRadius="full"
            fontSize="sm"
            fontWeight="600"
            cursor="pointer"
          >
            Sign In Free
          </Box>
        </Box>
      )}

      {user && (
        <PaginationControls
          currentPage={data.page}
          totalPages={data.total_pages}
          onPageChange={goToPage}
        />
      )}

      <SignInModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </Stack>
  );
}