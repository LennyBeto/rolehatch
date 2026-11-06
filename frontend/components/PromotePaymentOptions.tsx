// frontend/components/PromotePaymentOptions.tsx
"use client";
import { useState, useRef, type CSSProperties } from "react";
import { Box, Button, Text, HStack, Input, Stack, Spinner, Center } from "@chakra-ui/react";
import { authedFetch } from "@/lib/api";
import { toaster } from "@/components/ui/toaster";
import { FEATURE_PRICING, getLivePaymentMethods, type PaymentMethodKey } from "@/lib/pricing";

type Props = { jobId: string };

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 90000;

const METHOD_COPY: Record<PaymentMethodKey, { title: string; hint: string }> = {
  card: { title: FEATURE_PRICING.card.label, hint: "Card, bank or mobile money on a secure hosted checkout" },
  mpesa: { title: FEATURE_PRICING.mpesa.label, hint: "Approve the payment on your phone" },
};

const hiddenInput: CSSProperties = {
  position: "absolute",
  opacity: 0,
  width: 1,
  height: 1,
  margin: 0,
  pointerEvents: "none",
};

export default function PromotePaymentOptions({ jobId }: Props) {
  const methods = getLivePaymentMethods();
  const [method, setMethod] = useState<PaymentMethodKey>(methods[0] ?? "card");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [polling, setPolling] = useState(false);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollTimer.current) clearInterval(pollTimer.current);
    pollTimer.current = null;
    setPolling(false);
  };

  const handlePaystackCheckout = async () => {
    setSubmitting(true);
    try {
      const res = await authedFetch("/api/employer/payment/paystack/checkout", {
        method: "POST",
        body: JSON.stringify({ job_id: jobId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.detail || "Could not start Paystack checkout");

      const url: string | undefined = data?.authorization_url;
      if (!url) throw new Error("Checkout link missing from the server response");
      window.location.href = url;
    } catch (err) {
      setSubmitting(false);
      toaster.create({
        title: "Couldn't start Paystack checkout",
        description: err instanceof Error ? err.message : "Please try again.",
        type: "error",
      });
    }
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
    <Box bg="surface" p={5} borderRadius="lg" borderWidth="1px" borderColor="line">
      {polling ? (
        <Center py={4}>
          <HStack>
            <Spinner size="sm" color="brand.focusRing" />
            <Text fontSize="sm" color="text" opacity={0.8}>
              Waiting for M-Pesa confirmation on your phone…
            </Text>
          </HStack>
        </Center>
      ) : (
        <>
          <Text fontWeight="600" color="text" mb={3}>Choose how to pay</Text>

          <Stack gap={2} role="radiogroup" aria-label="Payment method" mb={4}>
            {methods.map((key) => {
              const selected = key === method;
              return (
                <Box
                  as="label"
                  key={key}
                  position="relative"
                  display="flex"
                  alignItems="center"
                  gap={3}
                  p={3}
                  borderRadius="md"
                  borderWidth="1px"
                  borderColor={selected ? "brand.focusRing" : "line"}
                  bg={selected ? "brand.subtle" : "transparent"}
                  cursor={submitting ? "not-allowed" : "pointer"}
                  css={{
                    "&:has(input:focus-visible)": {
                      outline: "2px solid",
                      outlineColor: "brand.focusRing",
                      outlineOffset: "2px",
                    },
                  }}
                >
                  <input
                    type="radio"
                    name={`pay-method-${jobId}`}
                    value={key}
                    checked={selected}
                    disabled={submitting}
                    onChange={() => setMethod(key)}
                    style={hiddenInput}
                  />
                  <Box
                    aria-hidden
                    flexShrink={0}
                    w="18px"
                    h="18px"
                    borderRadius="full"
                    borderWidth="2px"
                    borderColor="brand.focusRing"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    {selected && <Box w="8px" h="8px" borderRadius="full" bg="brand.focusRing" />}
                  </Box>
                  <Box minW={0}>
                    <Text fontWeight="600" color="text">{METHOD_COPY[key].title}</Text>
                    <Text fontSize="xs" color="text" opacity={0.7}>{METHOD_COPY[key].hint}</Text>
                  </Box>
                </Box>
              );
            })}
          </Stack>

          {method === "card" && (
            <Stack gap={3}>
              <Text fontSize="sm" color="text" opacity={0.8}>
                You'll continue to Paystack's secure checkout, where {FEATURE_PRICING.card.display} is
                charged as {FEATURE_PRICING.mpesa.display}.
              </Text>
              <Button colorPalette="brand" onClick={handlePaystackCheckout} loading={submitting}>
                Pay with {FEATURE_PRICING.card.label} — {FEATURE_PRICING.card.display}
              </Button>
            </Stack>
          )}

          {method === "mpesa" && (
            <Stack gap={3}>
              <Input
                placeholder="07XX XXX XXX"
                aria-label="M-Pesa phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                type="tel"
              />
              <Text fontSize="xs" color="text" opacity={0.7}>
                Priced at {FEATURE_PRICING.card.display}. You'll be charged{" "}
                {FEATURE_PRICING.mpesa.display} on your phone.
              </Text>
              <Button colorPalette="brand" onClick={handleMpesaSubmit} loading={submitting} disabled={!phone}>
                Pay with {FEATURE_PRICING.mpesa.label} — {FEATURE_PRICING.card.display}
              </Button>
            </Stack>
          )}
        </>
      )}
    </Box>
  );
}