// frontend/app/dashboard/page.tsx
"use client";
import {
  Box, Heading, Text, Stack, Button, Badge, SimpleGrid, HStack, Icon, Center, Spinner, Flex,
} from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { authedFetch } from "@/lib/api";
import { toaster } from "@/components/ui/toaster";
import { LuCheck } from "react-icons/lu";
import Link from "next/link";
import PromotePaymentOptions from "@/components/PromotePaymentOptions";
import EditJobDialog from "@/components/EditJobDialog";
import DeleteJobDialog from "@/components/DeleteJobDialog";
import EmployerAnalytics from "@/components/EmployerAnalytics";
import {
  FEATURE_DAYS,
  FEATURE_PRICING,
  EMPLOYER_PLANS,
  EMPLOYER_PLAN_ORDER,
} from "@/lib/pricing";
import type { EmployerJob } from "@/lib/types";

// Shown in USD everywhere; converted to the payer's local currency at checkout.
const FEATURE_PRICE_DISPLAY = FEATURE_PRICING.card.display;

// The "pay as you go" strip links to plans, so only show it once a plan can be bought.
const PLANS_LIVE = EMPLOYER_PLAN_ORDER.some((id) => EMPLOYER_PLANS[id].live);

const PRICING_BENEFITS = [
  "Pinned to the top of every matching search for 14 days",
  "No recruiter agency fees — pay only for the visibility you choose",
  "One-time payment per listing, no subscription needed",
];

type Entitlements = {
  plan: string | null;
  plan_name: string | null;
  status: string | null;
  current_period_end: string | null;
  featured_remaining: number | null; // null = unlimited
  refresh_remaining: number | null;  // null = unlimited
  partner_logo: boolean;
  company_page?: boolean;
  newsletter?: boolean;
};

function errorText(body: unknown, fallback: string) {
  const detail = (body as { detail?: unknown } | null)?.detail;
  return typeof detail === "string" ? detail : fallback;
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString() : "";
}

function remainingLabel(n: number | null) {
  return n === null ? "Unlimited" : String(n);
}

export default function EmployerDashboard() {
  const { user, session, loading } = useAuth();
  const router = useRouter();

  const [jobs, setJobs] = useState<EmployerJob[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [editingJob, setEditingJob] = useState<EmployerJob | null>(null);
  const [deletingJob, setDeletingJob] = useState<EmployerJob | null>(null);

  const [plan, setPlan] = useState<Entitlements | null>(null);
  const [confirmingPlan, setConfirmingPlan] = useState(false);
  const [busyJobId, setBusyJobId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const hasFetchedRef = useRef(false);
  const hasFetchedPlanRef = useRef(false);

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

  // The plan strip is optional: if this fails, listings still work as before.
  const loadEntitlements = async (): Promise<Entitlements | null> => {
    try {
      const res = await authedFetch("/api/promote/entitlements");
      if (!res.ok) return null;
      const data: Entitlements = await res.json();
      setPlan(data);
      return data;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    if (!user || hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    loadJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!user || hasFetchedPlanRef.current) return;
    hasFetchedPlanRef.current = true;

    // Paystack returns here with ?reference=sub-... after a plan payment. The webhook can
    // land a moment after the redirect, so poll briefly until the plan shows up.
    const reference = new URLSearchParams(window.location.search).get("reference") ?? "";
    const returningFromPlanCheckout = reference.startsWith("sub-");

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;

    const tick = async () => {
      const data = await loadEntitlements();
      if (cancelled) return;
      if (!returningFromPlanCheckout) return;

      if (data?.plan) {
        setConfirmingPlan(false);
        window.history.replaceState(null, "", "/dashboard");
        toaster.create({ title: `${data.plan_name} plan is active`, type: "success" });
        return;
      }
      attempts += 1;
      if (attempts >= 10) {
        setConfirmingPlan(false);
        toaster.create({
          title: "Payment received",
          description: "Your plan can take a minute to appear. Refresh shortly.",
          type: "info",
        });
        return;
      }
      setConfirmingPlan(true);
      timer = setTimeout(tick, 2000);
    };

    tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const toggleExpanded = (jobId: string) => {
    setExpandedJobId((current) => (current === jobId ? null : jobId));
  };

  const handleSaved = (updated: EmployerJob) => {
    setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));
    setEditingJob(null);
  };

  const handleDeleted = (jobId: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
    setExpandedJobId((current) => (current === jobId ? null : current));
    setDeletingJob(null);
  };

  const featureWithPlan = async (job: EmployerJob) => {
    setBusyJobId(job.id);
    try {
      const res = await authedFetch(`/api/promote/plan/feature/${job.id}`, { method: "POST" });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toaster.create({ title: errorText(body, "Couldn't feature this listing"), type: "error" });
        return;
      }
      setJobs((prev) =>
        prev.map((j) =>
          j.id === job.id ? { ...j, is_featured: true, featured_until: body.featured_until } : j,
        ),
      );
      setExpandedJobId((current) => (current === job.id ? null : current));
      toaster.create({
        title: "Listing featured",
        description: `It's pinned to the top of search for ${FEATURE_DAYS} days.`,
        type: "success",
      });
      await loadEntitlements();
    } catch {
      toaster.create({ title: "Something went wrong. Please try again.", type: "error" });
    } finally {
      setBusyJobId(null);
    }
  };

  const refreshListing = async (job: EmployerJob) => {
    setBusyJobId(job.id);
    try {
      const res = await authedFetch(`/api/promote/refresh/${job.id}`, { method: "POST" });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toaster.create({ title: errorText(body, "Couldn't refresh this listing"), type: "error" });
        return;
      }
      toaster.create({
        title: "Listing refreshed",
        description: "It's back at the top of the newest jobs.",
        type: "success",
      });
      await loadEntitlements();
    } catch {
      toaster.create({ title: "Something went wrong. Please try again.", type: "error" });
    } finally {
      setBusyJobId(null);
    }
  };

  const cancelPlan = async () => {
    if (!window.confirm("Cancel your plan? You keep your perks until the end of this billing period.")) {
      return;
    }
    setCancelling(true);
    try {
      const res = await authedFetch("/api/promote/subscription/cancel", { method: "POST" });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toaster.create({ title: errorText(body, "Couldn't cancel your plan"), type: "error" });
        return;
      }
      toaster.create({
        title: "Plan cancelled",
        description: `Your perks last until ${formatDate(body?.access_until ?? null)}.`,
        type: "success",
      });
      await loadEntitlements();
    } catch {
      toaster.create({ title: "Something went wrong. Please try again.", type: "error" });
    } finally {
      setCancelling(false);
    }
  };

  if (loading || !user) return null;

  const featuredCount = jobs.filter((j) => j.is_featured).length;
  const hasPlan = !!plan?.plan;
  const planCreditAvailable = hasPlan && plan?.featured_remaining !== 0;
  const refreshAvailable = hasPlan && plan?.refresh_remaining !== 0;

  return (
    <Box maxW="900px" mx="auto" mt={12} px={4} pb={16}>
      <Heading size="lg" mb={1}>Employer Dashboard</Heading>
      <Text color="fg.muted" mb={8}>Listings matching your verified email domain.</Text>

      {confirmingPlan && (
        <HStack
          bg="surface"
          border="1px solid"
          borderColor="line"
          borderRadius="lg"
          p={5}
          mb={8}
          gap={3}
          role="status"
        >
          <Spinner size="sm" color="brand.fg" />
          <Text fontSize="sm" color="text">Confirming your payment…</Text>
        </HStack>
      )}

      {!confirmingPlan && hasPlan && plan && (
        <Box bg="surface" border="1px solid" borderColor="line" borderRadius="lg" p={5} mb={8}>
          <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
            <Box>
              <HStack gap={2} wrap="wrap">
                <Text fontWeight="600" color="text">{plan.plan_name} plan</Text>
                <Badge colorPalette="brand" variant={plan.status === "active" ? "solid" : "outline"}>
                  {plan.status === "active" ? "Active" : "Cancelled"}
                </Badge>
              </HStack>
              <Text fontSize="sm" color="fg.muted" mt={1}>
                Featured listings left: {remainingLabel(plan.featured_remaining)} · Refreshes left:{" "}
                {remainingLabel(plan.refresh_remaining)}
              </Text>
              <Text fontSize="xs" color="fg.muted" mt={1}>
                {plan.status === "active" ? "Renews" : "Access ends"} {formatDate(plan.current_period_end)}
              </Text>
            </Box>
            {plan.status === "active" && (
              <Button
                size="sm"
                variant="outline"
                colorPalette="brand"
                loading={cancelling}
                onClick={cancelPlan}
              >
                Cancel plan
              </Button>
            )}
            {plan.newsletter && (
              <Button asChild size="sm" variant="outline" colorPalette="brand" borderRadius="full">
                <Link href="/dashboard/newsletter">Newsletter feature</Link>
              </Button>
            )}
          </Flex>
        </Box>
      )}

      {!confirmingPlan && plan && !hasPlan && PLANS_LIVE && (
        <Box bg="surface" border="1px solid" borderColor="line" borderRadius="lg" p={5} mb={8}>
          <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
            <Box>
              <Text fontWeight="600" color="text">You're on pay-as-you-go</Text>
              <Text fontSize="sm" color="fg.muted">
                Hiring regularly? Monthly plans include featured listings and refreshes.
              </Text>
            </Box>
            <Button asChild size="sm" colorPalette="brand" borderRadius="full">
              <Link href="/pricing">See plans</Link>
            </Button>
          </Flex>
        </Box>
      )}

      {!jobsLoading && jobs.length > 0 && (
        <EmployerAnalytics accessToken={session?.access_token} />
      )}

      <SimpleGrid columns={{ base: 1, md: 2 }} gap={8} alignItems="start">
        <Box>
          <HStack justify="space-between" mb={3}>
            <Heading size="sm" color="text">Your Listings</Heading>
            <Button asChild size="sm" variant="outline" colorPalette="brand">
              <Link href="/post-job">Post a Job</Link>
            </Button>
          </HStack>

          {jobsLoading ? (
            <Center py={10}><Spinner size="sm" color="brand.fg" /></Center>
          ) : (
            <Stack gap={3}>
              {jobs.map((job) => (
                <Box key={job.id} p={4} bg="surface" border="1px solid" borderColor="line" borderRadius="md">
                  <Flex justify="space-between" align="flex-start" gap={3} wrap="wrap">
                    <Box>
                      <Text fontWeight="600">{job.title}</Text>
                      {!job.can_manage && (
                        <Text fontSize="xs" color="fg.muted" mt={1}>
                          Synced from {job.source} — edit it on your careers page.
                        </Text>
                      )}
                    </Box>
                    {job.can_manage && (
                      <HStack gap={2}>
                        <Button size="xs" variant="outline" colorPalette="brand" onClick={() => setEditingJob(job)}>
                          Edit
                        </Button>
                        <Button size="xs" variant="outline" colorPalette="red" onClick={() => setDeletingJob(job)}>
                          Delete
                        </Button>
                      </HStack>
                    )}
                  </Flex>

                  {job.is_featured ? (
                    <Badge colorPalette="brand" mt={1}>
                      Featured until{" "}
                      {job.featured_until ? new Date(job.featured_until).toLocaleDateString() : "—"}
                    </Badge>
                  ) : (
                    <>
                      <HStack mt={2} gap={2} wrap="wrap">
                        {planCreditAvailable && (
                          <Button
                            size="sm"
                            colorPalette="brand"
                            loading={busyJobId === job.id}
                            onClick={() => featureWithPlan(job)}
                          >
                            Feature with your plan
                          </Button>
                        )}
                        <Button
                          size="sm"
                          colorPalette="brand"
                          variant={expandedJobId === job.id || planCreditAvailable ? "outline" : "solid"}
                          onClick={() => toggleExpanded(job.id)}
                        >
                          {expandedJobId === job.id
                            ? "Cancel"
                            : `Feature this listing — ${FEATURE_PRICE_DISPLAY}`}
                        </Button>
                      </HStack>

                      {expandedJobId === job.id && (
                        <Box mt={3}>
                          <PromotePaymentOptions jobId={job.id} />
                        </Box>
                      )}
                    </>
                  )}

                  {job.source === "direct" && refreshAvailable && (
                    <Button
                      size="xs"
                      mt={2}
                      variant="ghost"
                      colorPalette="brand"
                      loading={busyJobId === job.id}
                      onClick={() => refreshListing(job)}
                    >
                      Refresh to top
                    </Button>
                  )}
                </Box>
              ))}

              {jobs.length === 0 && !loadError && (
                <Box p={6} textAlign="center" bg="surface" border="1px dashed" borderColor="line" borderRadius="md">
                  <Text color="fg.muted" mb={3}>No listings found for your domain yet.</Text>
                  <Button asChild size="sm" colorPalette="brand">
                    <Link href="/post-job">Post your first job</Link>
                  </Button>
                </Box>
              )}

              {loadError && (
                <Box p={6} textAlign="center" bg="surface" border="1px dashed" borderColor="line" borderRadius="md">
                  <Text color="fg.muted" mb={3}>We couldn't load your listings.</Text>
                  <Button size="sm" variant="outline" colorPalette="brand" onClick={loadJobs}>
                    Try again
                  </Button>
                </Box>
              )}
            </Stack>
          )}
        </Box>

        <Box bg="surface" borderRadius="lg" border="1px solid" borderColor="line" p={6}>
          <Text fontSize="sm" color="fg.muted" mb={1}>Featured Listing</Text>
          <Heading size="xl" color="brand.fg" mb={1}>{FEATURE_PRICE_DISPLAY}</Heading>
          <Text fontSize="sm" color="fg.muted" mb={1}>per posting, {FEATURE_DAYS} days</Text>
          <Text fontSize="xs" color="fg.muted" mb={4}>
            Priced in USD. Converted to your local currency at checkout.
          </Text>

          <Stack gap={2} mb={4}>
            {PRICING_BENEFITS.map((b) => (
              <HStack key={b} align="flex-start" gap={2}>
                <Icon color="brand.fg" mt={1} flexShrink={0}><LuCheck /></Icon>
                <Text fontSize="sm" color="text">{b}</Text>
              </HStack>
            ))}
          </Stack>

          {!jobsLoading && (
            <Text fontSize="xs" color="fg.muted" mb={4}>
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

      <EditJobDialog job={editingJob} onClose={() => setEditingJob(null)} onSaved={handleSaved} />
      <DeleteJobDialog job={deletingJob} onClose={() => setDeletingJob(null)} onDeleted={handleDeleted} />
    </Box>
  );
}