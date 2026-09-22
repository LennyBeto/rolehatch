// frontend/app/dashboard/page.tsx
"use client";
import { Box, Heading, Text, Stack, Button, Badge } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { authedFetch } from "@/lib/api";
import { toaster } from "@/components/ui/toaster";

type EmployerJob = {
  id: string; title: string; is_featured: boolean; featured_until: string | null; level: string | null; tech_stack: string[] | null;
};

export default function EmployerDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [jobs, setJobs] = useState<EmployerJob[]>([]);

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    authedFetch("/api/promote/my-jobs")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load jobs");
        return res.json();
      })
      .then((data) => setJobs(Array.isArray(data) ? data : []))
      .catch(() => toaster.create({ title: "Couldn't load your jobs", type: "error" }));
  }, [user]);

  const promote = async (jobId: string) => {
    const res = await authedFetch(`/api/promote/checkout/${jobId}`, { method: "POST" });
    if (!res.ok) {
      toaster.create({ title: "Not authorized to promote this listing", type: "error" });
      return;
    }
    const { checkout_url } = await res.json();
    window.location.href = checkout_url;
  };

  return (
    <Box maxW="700px" mx="auto" mt={12} px={4}>
      <Heading size="lg" mb={1}>Employer Dashboard</Heading>
      <Text color="gray.600" mb={6}>Listings matching your verified email domain.</Text>
      <Stack gap={3}>
        {jobs.map((job) => (
          <Box key={job.id} p={4} bg="surface" border="1px solid #E5E3DD" borderRadius="md">
            <Text fontWeight="600">{job.title}</Text>
            {job.is_featured ? (
              <Badge colorPalette="brand" mt={1}>Featured until {job.featured_until}</Badge>
            ) : (
              <Button size="sm" mt={2} colorPalette="brand" onClick={() => promote(job.id)}>
                Feature this listing — $49
              </Button>
            )}
          </Box>
        ))}
        {jobs.length === 0 && <Text color="gray.500">No listings found for your domain yet.</Text>}
      </Stack>
    </Box>
  );
}