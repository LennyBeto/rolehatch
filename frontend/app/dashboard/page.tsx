// frontend/app/dashboard/page.tsx
"use client";
import {
  Box, Heading, Text, Stack, Button, Badge, SimpleGrid, HStack, Icon, Center, Spinner,
} from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { authedFetch } from "@/lib/api";
import { toaster } from "@/components/ui/toaster";
import { LuCheck } from "react-icons/lu";
import Link from "next/link";

type EmployerJob = {
  id: string;
  title: string;
  is_featured: boolean;
  featured_until: string | null;
  level: string | null;
  tech_stack: string[] | null;
};

const FEATURE_PRICE = "$49";
const FEATURE_DAYS = 14;

const PRICING_BENEFITS = [
  "Pinned to the top of every matching search for 14 days",
  "No recruiter agency fees — pay only for the visibility you choose",
  "One-time payment per listing, no recurring subscription",
];

export default function EmployerDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [jobs, setJobs] = useState<EmployerJob[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [promotingId, setPromotingId] = useState<string | null>(null);

  // Guards against React effect re-invocation (dev StrictMode) firing this
  // twice and producing duplicate "Couldn't load your jobs" toasts.
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

  const loadJobs = async () => {
    setJobsLoading(true);
    setLoadError(false);
    try {
      const res = await authedFetch("/api/promote/my-jobs");
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = await res.json();
      setJobs(Array.isArray(data) ? data : []);
    } catch (err) {
      setLoadError(true);
      toaster.create({
        title: "Couldn't load your jobs",
        description: err instanceof Error ? err.message : "Please try again.",
        type: "error",
      });
    } finally {
      setJobsLoading(false);
    }
  };

  useEffect(() => {
    if (!user || hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    loadJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const promote = async (jobId: string) => {
    setPromotingId(jobId);
    try {
      const res = await authedFetch(`/api/promote/checkout/${jobId}`, { method: "POST" });
      if (!res.ok) {
        toaster.create({ title: "Not authorized to promote this listing", type: "error" });
        return;
      }
      const { checkout_url } = await res.json();
      window.location.href = checkout_url;
    } catch {
      toaster.create({ title: "Couldn't start checkout", description: "Please try again.", type: "error" });
    } finally {
      setPromotingId(null);
    }
  };

  if (loading || !user) return null;

  const featuredCount = jobs.filter((j) => j.is_featured).length;

  return (
    <Box maxW="900px" mx="auto" mt={12} px={4} pb={16}>
      <Heading size="lg" mb={1}>Employer Dashboard</Heading>
      <Text color="gray.600" mb={8}>Listings matching your verified email domain.</Text>

      <SimpleGrid columns={{ base: 1, md: 2 }} gap={8} alignItems="start">
        {/* ── Listings column ── */}
        <Box>
          <HStack justify="space-between" mb={3}>
            <Heading size="sm" color="text">Your Listings</Heading>
            <Button asChild size="sm" variant="outline" colorPalette="brand">
              <Link href="/post-job">Post a Job</Link>
            </Button>
          </HStack>

          {jobsLoading ? (
            <Center py={10}><Spinner size="sm" color="brand.500" /></Center>
          ) : (
            <Stack gap={3}>
              {jobs.map((job) => (
                <Box key={job.id} p={4} bg="surface" border="1px solid #E5E3DD" borderRadius="md">
                  <Text fontWeight="600">{job.title}</Text>
                  {job.is_featured ? (
                    <Badge colorPalette="brand" mt={1}>
                      Featured until{" "}
                      {job.featured_until ? new Date(job.featured_until).toLocaleDateString() : "—"}
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      mt={2}
                      colorPalette="brand"
                      loading={promotingId === job.id}
                      onClick={() => promote(job.id)}
                    >
                      Feature this listing — {FEATURE_PRICE}
                    </Button>
                  )}
                </Box>
              ))}

              {jobs.length === 0 && !loadError && (
                <Box p={6} textAlign="center" bg="surface" border="1px dashed #E5E3DD" borderRadius="md">
                  <Text color="gray.500" mb={3}>No listings found for your domain yet.</Text>
                  <Button asChild size="sm" colorPalette="brand">
                    <Link href="/post-job">Post your first job</Link>
                  </Button>
                </Box>
              )}

              {loadError && (
                <Box p={6} textAlign="center" bg="surface" border="1px dashed #E5E3DD" borderRadius="md">
                  <Text color="gray.500" mb={3}>We couldn't load your listings.</Text>
                  <Button size="sm" variant="outline" colorPalette="brand" onClick={loadJobs}>
                    Try again
                  </Button>
                </Box>
              )}
            </Stack>
          )}
        </Box>

        {/* ── Embedded pricing widget ── */}
        <Box bg="surface" borderRadius="lg" border="1px solid #E5E3DD" p={6}>
          <Text fontSize="sm" color="gray.600" mb={1}>Featured Listing</Text>
          <Heading size="xl" color="brand.500" mb={1}>{FEATURE_PRICE}</Heading>
          <Text fontSize="sm" color="gray.600" mb={4}>per posting, {FEATURE_DAYS} days</Text>

          <Stack gap={2} mb={4}>
            {PRICING_BENEFITS.map((b) => (
              <HStack key={b} align="flex-start" gap={2}>
                <Icon color="brand.500" mt={1}><LuCheck /></Icon>
                <Text fontSize="sm" color="text">{b}</Text>
              </HStack>
            ))}
          </Stack>

          {!jobsLoading && (
            <Text fontSize="xs" color="gray.500" mb={4}>
              {featuredCount > 0
                ? `${featuredCount} of your ${jobs.length} listing${jobs.length === 1 ? "" : "s"} currently featured.`
                : "None of your listings are featured yet."}
            </Text>
          )}

          <Button asChild size="sm" variant="outline" colorPalette="brand" w="full">
            <Link href="/pricing">View Full Pricing</Link>
          </Button>
        </Box>
      </SimpleGrid>
    </Box>
  );
}