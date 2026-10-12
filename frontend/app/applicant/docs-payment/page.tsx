// frontend/app/applicant/docs-payment/page.tsx — Paystack redirects the checkout tab here
"use client";
import { Box, Button, Center, Heading, Spinner, Text } from "@chakra-ui/react";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { verifyDocPayment } from "@/lib/api";

type State = "checking" | "done" | "pending" | "failed";
const MAX_ATTEMPTS = 4;
const RETRY_MS = 2500;

function DocsPaymentInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading } = useAuth();
  const userId = user?.id ?? null;
  const [state, setState] = useState<State>("checking");
  const reference = searchParams.get("reference") ?? searchParams.get("trxref");

  useEffect(() => {
    if (loading) return;
    if (!userId) { router.replace("/"); return; }
    if (!reference || !reference.startsWith("DOC")) { router.replace("/applicant/dashboard"); return; }

    let cancelled = false;
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    (async () => {
      for (let attempt = 0; attempt < MAX_ATTEMPTS && !cancelled; attempt++) {
        try {
          const res = await verifyDocPayment(reference);
          if (res.ok) {
            const data: { status: string } = await res.json();
            if (data.status === "completed") { if (!cancelled) setState("done"); return; }
            if (data.status === "failed") { if (!cancelled) setState("failed"); return; }
          } else if (res.status === 404) {
            if (!cancelled) setState("failed");
            return;
          }
        } catch {
          /* network blip: retry */
        }
        await sleep(RETRY_MS);
      }
      if (!cancelled) setState("pending");
    })();

    return () => { cancelled = true; };
  }, [loading, userId, reference, router]);

  return (
    <Box maxW="500px" mx="auto" mt={20} px={4} textAlign="center">
      {state === "checking" && (
        <Center flexDirection="column" gap={3}>
          <Spinner color="brand.500" />
          <Text color="gray.600">Confirming your payment…</Text>
        </Center>
      )}
      {state === "done" && (
        <>
          <Heading size="md" mb={2}>Payment confirmed</Heading>
          <Text color="gray.600" mb={6}>
            5 CV and 5 cover letter downloads were added. You can close this tab and go back to your builder,
            or open your dashboard.
          </Text>
          <Button colorPalette="brand" onClick={() => router.push("/applicant/dashboard")}>Go to dashboard</Button>
        </>
      )}
      {state === "pending" && (
        <>
          <Heading size="md" mb={2}>Still confirming</Heading>
          <Text color="gray.600" mb={6}>
            We haven't received the payment confirmation yet. Your downloads are added automatically once it
            arrives. You can close this tab.
          </Text>
          <Button variant="outline" colorPalette="brand" onClick={() => router.push("/applicant/dashboard")}>
            Go to dashboard
          </Button>
        </>
      )}
      {state === "failed" && (
        <>
          <Heading size="md" mb={2}>Payment not completed</Heading>
          <Text color="gray.600" mb={6}>No charge was applied to your downloads. You can try again from the builder.</Text>
          <Button variant="outline" colorPalette="brand" onClick={() => router.push("/applicant/dashboard")}>
            Go to dashboard
          </Button>
        </>
      )}
    </Box>
  );
}

export default function DocsPaymentPage() {
  return (
    <Suspense fallback={null}>
      <DocsPaymentInner />
    </Suspense>
  );
}