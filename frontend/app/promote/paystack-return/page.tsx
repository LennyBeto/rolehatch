// frontend/app/promote/paystack-return/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Box, Button, Heading, Spinner, Text } from "@chakra-ui/react";
import { authedFetch } from "@/lib/api";

type Phase = "checking" | "done" | "pending" | "failed" | "missing";

const POLL_MS = 3000;
const MAX_TRIES = 8;

const COPY: Record<Exclude<Phase, "checking">, { title: string; body: string }> = {
  done: {
    title: "Payment received",
    body: "Your listing is now featured for 14 days. Taking you back to your dashboard.",
  },
  pending: {
    title: "Still confirming your payment",
    body: "Paystack hasn't confirmed it yet. Your listing is featured automatically as soon as it does, usually within a minute. Check your dashboard shortly.",
  },
  failed: {
    title: "Payment not completed",
    body: "Paystack reported this payment as unsuccessful. You can try again from your dashboard.",
  },
  missing: {
    title: "We couldn't find that payment",
    body: "Open your dashboard to check the status of your listing.",
  },
};

export default function PaystackReturnPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("checking");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get("reference") || params.get("trxref") || "";
    if (!reference.startsWith("FTR")) {
      setPhase("missing");
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const check = async (attempt: number) => {
      try {
        const res = await authedFetch(
          `/api/employer/payment/paystack/verify/${encodeURIComponent(reference)}`
        );
        if (cancelled) return;
        if (res.ok) {
          const { status } = await res.json();
          if (status === "completed") {
            setPhase("done");
            timer = setTimeout(() => router.replace("/dashboard"), 2500);
            return;
          }
          if (status === "failed") {
            setPhase("failed");
            return;
          }
        }
      } catch {
        /* transient error: fall through and retry */
      }
      if (cancelled) return;
      if (attempt >= MAX_TRIES) {
        setPhase("pending");
        return;
      }
      timer = setTimeout(() => check(attempt + 1), POLL_MS);
    };

    check(1);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [router]);

  return (
    <Box maxW="480px" mx="auto" mt={{ base: 12, md: 20 }} px={4} textAlign="center">
      <Box
        bg="surface"
        borderWidth="1px"
        borderColor="line"
        borderRadius="lg"
        p={{ base: 6, md: 8 }}
        aria-live="polite"
      >
        {phase === "checking" ? (
          <>
            <Spinner size="md" color="brand.focusRing" mb={4} />
            <Heading size="md" color="text" mb={2}>Confirming your payment</Heading>
            <Text fontSize="sm" color="text" opacity={0.75}>
              This usually takes a few seconds. Please keep this page open.
            </Text>
          </>
        ) : (
          <>
            <Heading size="md" color="text" mb={2}>{COPY[phase].title}</Heading>
            <Text fontSize="sm" color="text" opacity={0.75} mb={5}>{COPY[phase].body}</Text>
            <Button asChild colorPalette="brand">
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
          </>
        )}
      </Box>
    </Box>
  );
}