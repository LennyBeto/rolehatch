// frontend/components/ATSScanCard.tsx
"use client";
import { Box, Heading, Text, Textarea, Button, Stack, Badge, HStack } from "@chakra-ui/react";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  getAtsQuota, runAtsScan, startAtsCheckout, verifyAtsPayment,
  ATS_QUOTA_CHANGED_EVENT, notifyAtsQuotaChanged,
  type AtsQuota, type AtsScanResult,
} from "@/lib/api";
import { toaster } from "@/components/ui/toaster";

const BREAKDOWN_LABELS: Record<string, string> = {
  contact_info: "Contact info",
  key_sections: "Key sections",
  length: "Length",
  keyword_match: "Keyword match",
  action_verbs: "Action verbs",
};

const scoreColor = (n: number) => (n >= 80 ? "green.600" : n >= 50 ? "orange.600" : "red.600");

export default function ATSScanCard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [quota, setQuota] = useState<AtsQuota | null>(null);
  const [cvText, setCvText] = useState("");
  const [result, setResult] = useState<AtsScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [buying, setBuying] = useState(false);

  const loadQuota = useCallback(async () => {
    const res = await getAtsQuota();
    if (res.ok) setQuota(await res.json());
  }, []);

  useEffect(() => { loadQuota().catch(() => {}); }, [loadQuota]);

  // The stored-CV scan in CVUploadSection shares this quota: refresh the badge when it changes
  useEffect(() => {
    const refresh = () => { loadQuota().catch(() => {}); };
    window.addEventListener(ATS_QUOTA_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(ATS_QUOTA_CHANGED_EVENT, refresh);
  }, [loadQuota]);

  // Returning from Paystack: confirm payment and unlock immediately
  useEffect(() => {
    const reference = searchParams.get("reference");
    if (!reference || !reference.startsWith("ATS")) return;
    verifyAtsPayment(reference)
      .then(async (res) => {
        if (!res.ok) throw new Error();
        const status: AtsQuota = await res.json();
        setQuota(status);
        notifyAtsQuotaChanged();
        toaster.create({ title: "Payment confirmed", description: "3 ATS scans added.", type: "success" });
      })
      .catch(() => toaster.create({ title: "Couldn't confirm payment yet", description: "Refresh in a moment.", type: "error" }))
      .finally(() => router.replace("/applicant/dashboard"));
  }, [searchParams, router]);

  const handleScan = async () => {
    setScanning(true);
    try {
      const res = await runAtsScan(cvText);
      if (res.status === 402) {
        await loadQuota();
        toaster.create({ title: "ATS scans locked", description: "Buy 3 more scans to continue.", type: "info" });
        return;
      }
      if (!res.ok) throw new Error();
      const data: { result: AtsScanResult; quota: AtsQuota } = await res.json();
      setResult(data.result);
      setQuota(data.quota);
    } catch {
      toaster.create({ title: "Scan failed", description: "Your credit was not used.", type: "error" });
    } finally {
      setScanning(false);
    }
  };

  const handleBuy = async () => {
    setBuying(true);
    try {
      const res = await startAtsCheckout();
      if (!res.ok) throw new Error();
      const { authorization_url } = await res.json();
      window.location.href = authorization_url;
    } catch {
      toaster.create({ title: "Couldn't start checkout", type: "error" });
      setBuying(false);
    }
  };

  return (
    <Box bg="surface" p={6} borderRadius="lg" border="1px solid #E5E3DD">
      <HStack justify="space-between" mb={1}>
        <Heading size="md" color="text">ATS Scan</Heading>
        {quota && (
          <Badge colorPalette={quota.locked ? "red" : "brand"} variant="subtle">
            {quota.locked ? "Locked" : `${quota.remaining} scan${quota.remaining === 1 ? "" : "s"} left`}
          </Badge>
        )}
      </HStack>
      <Text color="gray.600" fontSize="sm" mb={1}>
        Your first scan is free. After that, {quota?.pack_scans ?? 3} more scans cost ${quota?.pack_price_usd ?? 3.99}.
      </Text>
      <Text color="gray.500" fontSize="xs" mb={4}>
        Scans are shared with the Run ATS Scan button in CV &amp; ATS Screening above.
      </Text>

      {quota?.locked ? (
        <Stack gap={3}>
          <Text fontSize="sm" color="text">You've used all your scans.</Text>
          <Button colorPalette="brand" onClick={handleBuy} loading={buying}>
            Buy {quota.pack_scans} scans — ${quota.pack_price_usd} (KES {quota.pack_price_kes})
          </Button>
        </Stack>
      ) : (
        <Stack gap={3}>
          <Textarea placeholder="Paste your CV text" rows={8} value={cvText} onChange={(e) => setCvText(e.target.value)} />
          <Button colorPalette="brand" onClick={handleScan} loading={scanning} disabled={cvText.trim().length < 50}>
            Run ATS Scan
          </Button>
        </Stack>
      )}

      {result && (
        <Box mt={5} pt={4} borderTop="1px solid #E5E3DD">
          <Heading size="lg" color={scoreColor(result.overall_score)} mb={3}>
            {result.overall_score}/100
          </Heading>
          <Stack gap={1} mb={4}>
            {Object.entries(result.breakdown).map(([key, value]) => (
              <HStack key={key} justify="space-between" fontSize="sm">
                <Text color="text">{BREAKDOWN_LABELS[key] ?? key}</Text>
                <Text fontWeight="600" color={scoreColor(value)}>{value}%</Text>
              </HStack>
            ))}
          </Stack>
          {result.suggestions.length > 0 ? (
            <Stack gap={2}>
              <Text fontSize="xs" color="gray.500" textTransform="uppercase" fontWeight="600">Suggestions</Text>
              {result.suggestions.map((s) => (
                <Text key={s} fontSize="sm" color="gray.700">• {s}</Text>
              ))}
            </Stack>
          ) : (
            <Text fontSize="sm" color="green.600">Your CV looks ATS-ready.</Text>
          )}
        </Box>
      )}
    </Box>
  );
}