// frontend/app/promote/[jobId]/page.tsx
"use client";
import { Box, Heading, Text, Button } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PromotePaymentOptions from "@/components/PromotePaymentOptions";
import { useAuth } from "@/lib/AuthContext";
import { authedFetch } from "@/lib/api";
import { toaster } from "@/components/ui/toaster";
import { FEATURE_PRICING, FEATURE_DAYS } from "@/lib/pricing";

export default function PromoteJobPage() {
  const { jobId } = useParams();
  const { user } = useAuth();
  const router = useRouter();
  const [hasCredit, setHasCredit] = useState(false);
  const [busy, setBusy] = useState(false);

  // Optional: if the employer has a plan with featured credits left, offer to use one.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    authedFetch("/api/promote/entitlements")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setHasCredit(!!data.plan && data.featured_remaining !== 0);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user]);

  const featureWithPlan = async () => {
    setBusy(true);
    try {
      const res = await authedFetch(`/api/promote/plan/feature/${jobId}`, { method: "POST" });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toaster.create({
          title: typeof body?.detail === "string" ? body.detail : "Couldn't feature this listing",
          type: "error",
        });
        return;
      }
      toaster.create({ title: "Listing featured", type: "success" });
      router.push("/dashboard");
    } catch {
      toaster.create({ title: "Something went wrong. Please try again.", type: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box maxW="500px" mx="auto" mt={20} px={4} textAlign="center">
      <Heading size="md" mb={3}>Feature this listing</Heading>
      <Text color="fg.muted" mb={6}>
        Pin your job to the top of search results for {FEATURE_DAYS} days — {FEATURE_PRICING.mpesa.display}.
      </Text>

      {hasCredit && (
        <Box mb={6}>
          <Button colorPalette="brand" w="full" loading={busy} onClick={featureWithPlan}>
            Feature with your plan
          </Button>
          <Text fontSize="sm" color="fg.muted" mt={2}>
            Uses one of your monthly featured listings. Or pay for this listing below.
          </Text>
        </Box>
      )}

      <PromotePaymentOptions jobId={jobId as string} />
    </Box>
  );
}