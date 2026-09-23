// frontend/app/my-applications/page.tsx
"use client";
import { Box, Heading, Text, Stack, Center, Spinner } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { authedFetch } from "@/lib/api";
import { toaster } from "@/components/ui/toaster";
import JobCard from "@/components/JobCard";

type AppliedJob = Parameters<typeof JobCard>[0]["job"] & { applied_at: string };

export default function MyApplicationsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [jobs, setJobs] = useState<AppliedJob[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    authedFetch("/api/saved-jobs/applied")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load applications");
        return res.json();
      })
      .then((data) => setJobs(Array.isArray(data) ? data : []))
      .catch(() => toaster.create({ title: "Couldn't load your applications", type: "error" }))
      .finally(() => setFetching(false));
  }, [user]);

  if (loading || !user) return null;

  return (
    <Box maxW="800px" mx="auto" mt={12} px={4} pb={12}>
      <Heading size="lg" mb={1}>My Applications</Heading>
      <Text color="gray.600" mb={6}>
        Jobs you've marked as applied — {jobs.length} total.
      </Text>

      {fetching ? (
        <Center py={20}>
          <Spinner size="sm" color="brand.500" />
        </Center>
      ) : jobs.length === 0 ? (
        <Text color="gray.500">
          You haven't marked any jobs as applied yet. Use "Mark Applied" on a listing to track it here.
        </Text>
      ) : (
        <Stack gap={4}>
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </Stack>
      )}
    </Box>
  );
}