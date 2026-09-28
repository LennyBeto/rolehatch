// frontend/components/PromotePaymentOptions.tsx
"use client";
import { useState, useRef } from "react";
import { Box, Button, Text, HStack, Input, Stack, Spinner, Center } from "@chakra-ui/react";
import { authedFetch } from "@/lib/api";
import { toaster } from "@/components/ui/toaster";
import { FEATURE_PRICING } from "@/lib/pricing";

type Props = { jobId: string };

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 90000;

export default function PromotePaymentOptions({ jobId }: Props) {
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [polling, setPolling] = useState(false);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollTimer.current) clearInterval(pollTimer.current);
    pollTimer.current = null;
    setPolling(false);
  };

  const handleMpesaSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await authedFetch("/api/employer/payment/mpesa/stk-push", {
        method: "POST",
        body: JSON.stringify({ job_id: jobId, phone_number: phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || "Could not start M-Pesa payment");

      toaster.create({ title: "Check your phone", description: data.message, type: "info" });
      setPolling(true);

      const startedAt = Date.now();
      pollTimer.current = setInterval(async () => {
        if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
          stopPolling();
          toaster.create({
            title: "Still waiting on M-Pesa",
            description: "Refresh the page once you've completed the payment.",
            type: "warning",
          });
          return;
        }
        const statusRes = await authedFetch(`/api/employer/payment/mpesa/status/${data.checkout_request_id}`);
        if (!statusRes.ok) return;
        const statusData = await statusRes.json();

        if (statusData.status === "completed") {
          stopPolling();
          toaster.create({ title: "Payment received", description: "Your listing is now featured.", type: "success" });
          window.location.reload();
        } else if (statusData.status === "failed" || statusData.status === "cancelled") {
          stopPolling();
          toaster.create({ title: "Payment not completed", description: statusData.result_desc || "Please try again.", type: "error" });
        }
      }, POLL_INTERVAL_MS);
    } catch (err) {
      toaster.create({
        title: "Couldn't start M-Pesa payment",
        description: err instanceof Error ? err.message : "Please try again.",
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box bg="surface" p={5} borderRadius="lg" border="1px solid #E5E3DD">
      <Text fontWeight="600" mb={3}>Pay with {FEATURE_PRICING.mpesa.label}</Text>

      {polling ? (
        <Center py={4}>
          <HStack>
            <Spinner size="sm" color="brand.500" />
            <Text fontSize="sm" color="gray.600">Waiting for M-Pesa confirmation on your phone…</Text>
          </HStack>
        </Center>
      ) : (
        <Stack gap={3}>
          <Input
            placeholder="07XX XXX XXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            type="tel"
          />
          <Button colorPalette="brand" onClick={handleMpesaSubmit} loading={submitting} disabled={!phone}>
            Pay with {FEATURE_PRICING.mpesa.label} — {FEATURE_PRICING.mpesa.display}
          </Button>
        </Stack>
      )}
    </Box>
  );
}