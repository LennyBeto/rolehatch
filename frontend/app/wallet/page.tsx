// frontend/app/wallet/page.tsx
"use client";
import { Box, Heading, Text, Stack, Button, Input, HStack, Badge, Flex, SimpleGrid } from "@chakra-ui/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { authedFetch } from "@/lib/api";
import { toaster } from "@/components/ui/toaster";

type Tx = {
  id: string; type: "deposit" | "withdrawal"; amount: number; status: string;
  receipt: string | null; created_at: string;
};
type WalletData = { balance: number; currency: string; phone_masked: string | null; transactions: Tx[] };

const MIN_AMOUNT = 10;
const MAX_AMOUNT = 150000;

const fmt = (amount: number, currency = "KES") =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);

const STATUS_COLORS: Record<string, string> = { completed: "green", pending: "orange", failed: "red" };

const errMessage = (err: unknown) =>
  err instanceof Error ? err.message : "Please try again.";

const validAmount = (value: string) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= MIN_AMOUNT && n <= MAX_AMOUNT;
};

export default function WalletPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [phone, setPhone] = useState("");
  const [mpesaAmt, setMpesaAmt] = useState("");
  const [paystackAmt, setPaystackAmt] = useState("");
  const [bachsAmt, setBachsAmt] = useState("");
  const [withdrawAmt, setWithdrawAmt] = useState("");
  const [bachsRate, setBachsRate] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const verifiedRef = useRef(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

  // `silent` suppresses the error toast so background polling doesn't spam the user.
  const load = useCallback(async (silent = false) => {
    try {
      const res = await authedFetch("/api/wallet");
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      setWallet(await res.json());
    } catch (err) {
      if (!silent) {
        toaster.create({
          title: "Couldn't load your wallet",
          description: errMessage(err),
          type: "error",
        });
      }
    }
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  // KES→USD rate, only used to preview the Bachs charge.
  useEffect(() => {
    if (!user) return;
    authedFetch("/api/wallet/bachs/rate")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setBachsRate(Number(data.kes_per_usd)))
      .catch(() => {});
  }, [user]);

  // Handles the redirect back from Paystack (?reference=) or Bachs (?checkout_id= / #bachs-cancelled).
  useEffect(() => {
    if (!user || verifiedRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const paystackRef = params.get("reference");
    const bachsCheckout = params.get("checkout_id");
    const bachsCancelled = window.location.hash === "#bachs-cancelled";
    if (!paystackRef && !bachsCheckout && !bachsCancelled) return;
    verifiedRef.current = true;

    const announce = (status: string, provider: string) => {
      if (status === "completed") {
        toaster.create({ title: "Deposit successful", description: "Your wallet has been credited.", type: "success" });
      } else if (status === "failed") {
        toaster.create({ title: "Payment failed", description: "No money was taken. Please try again.", type: "error" });
      } else {
        toaster.create({ title: "Payment pending", description: `We'll update your balance once ${provider} confirms.`, type: "info" });
      }
    };

    (async () => {
      try {
        if (paystackRef) {
          const res = await authedFetch(`/api/wallet/paystack/verify/${encodeURIComponent(paystackRef)}`);
          if (!res.ok) throw new Error(`Verification failed (${res.status})`);
          announce((await res.json()).status, "Paystack");
        } else if (bachsCheckout) {
          // Bachs confirms via webhook only (a redirect alone isn't proof of payment);
          // the pending-transaction poll below picks up the credit when it lands.
          toaster.create({
            title: "Confirming your payment",
            description: "Bachs is confirming it — your balance will update in a moment.",
            type: "info",
          });
        } else if (bachsCancelled) {
          await authedFetch("/api/wallet/bachs/cancel", { method: "POST" });
          toaster.create({ title: "Payment cancelled", description: "You weren't charged.", type: "info" });
        }
      } catch (err) {
        toaster.create({ title: "Couldn't verify payment", description: errMessage(err), type: "error" });
      } finally {
        window.history.replaceState({}, "", "/wallet");
        load();
      }
    })();
  }, [user, load]);

  // While anything is pending (PIN prompt / payout), poll until the callback lands.
  const hasPending = wallet?.transactions.some((t) => t.status === "pending") ?? false;
  useEffect(() => {
    if (!hasPending) return;
    const id = setInterval(() => load(true), 4000);
    return () => clearInterval(id);
  }, [hasPending, load]);

  // Catches network-level failures ("Failed to fetch") that authedFetch throws,
  // so they show a toast instead of crashing as an unhandled runtime error.
  const run = async (key: string, failTitle: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
    } catch (err) {
      toaster.create({ title: failTitle, description: errMessage(err), type: "error" });
    } finally {
      setBusy(null);
    }
  };

  const errorDetail = async (res: Response, fallback: string) => {
    const err = await res.json().catch(() => null);
    if (typeof err?.detail === "string") return err.detail;
    return err?.detail?.[0]?.msg ?? fallback;
  };

  const notifyInvalidAmount = () =>
    toaster.create({
      title: "Invalid amount",
      description: `Amount must be KES ${MIN_AMOUNT} – ${MAX_AMOUNT.toLocaleString()}.`,
      type: "error",
    });

  const depositMpesa = () => {
    if (!validAmount(mpesaAmt)) {
      notifyInvalidAmount();
      return;
    }
    return run("mpesa-deposit", "Couldn't start deposit", async () => {
      const res = await authedFetch("/api/wallet/deposit", {
        method: "POST", body: JSON.stringify({ amount: Number(mpesaAmt), phone }),
      });
      if (!res.ok) {
        toaster.create({
          title: "Couldn't start deposit",
          description: await errorDetail(res, `Amount must be KES ${MIN_AMOUNT} – ${MAX_AMOUNT.toLocaleString()}.`),
          type: "error",
        });
        return;
      }
      toaster.create({ title: "Check your phone", description: "Enter your M-Pesa PIN to complete the deposit.", type: "info" });
      setMpesaAmt("");
      load();
    });
  };

  const depositPaystack = () => {
    if (!validAmount(paystackAmt)) {
      notifyInvalidAmount();
      return;
    }
    return run("paystack-deposit", "Couldn't start Paystack checkout", async () => {
      const res = await authedFetch("/api/wallet/paystack/initialize", {
        method: "POST", body: JSON.stringify({ amount: Math.round(Number(paystackAmt)) }),
      });
      if (!res.ok) {
        toaster.create({
          title: "Couldn't start Paystack checkout",
          description: await errorDetail(res, "Please try again."),
          type: "error",
        });
        return;
      }
      const { authorization_url } = await res.json();
      window.location.href = authorization_url;
    });
  };

  const depositBachs = () => {
    if (!validAmount(bachsAmt)) {
      notifyInvalidAmount();
      return;
    }
    return run("bachs-deposit", "Couldn't start Bachs checkout", async () => {
      const res = await authedFetch("/api/wallet/bachs/initialize", {
        method: "POST", body: JSON.stringify({ amount: Math.round(Number(bachsAmt)) }),
      });
      if (!res.ok) {
        toaster.create({
          title: "Couldn't start Bachs checkout",
          description: await errorDetail(res, "Please try again."),
          type: "error",
        });
        return;
      }
      const { checkout_url } = await res.json();
      window.location.href = checkout_url;
    });
  };

  const withdraw = () => {
    if (!validAmount(withdrawAmt)) {
      notifyInvalidAmount();
      return;
    }
    return run("withdraw", "Couldn't withdraw", async () => {
      const res = await authedFetch("/api/wallet/withdraw", {
        method: "POST", body: JSON.stringify({ amount: Number(withdrawAmt) }),
      });
      if (!res.ok) {
        toaster.create({
          title: "Couldn't withdraw",
          description: await errorDetail(res, `Amount must be KES ${MIN_AMOUNT} – ${MAX_AMOUNT.toLocaleString()}.`),
          type: "error",
        });
        return;
      }
      toaster.create({ title: "Withdrawal requested", description: "Funds will arrive on your phone shortly.", type: "success" });
      setWithdrawAmt("");
      load();
    });
  };

  if (loading || !user) return null;

  const bachsUsdPreview =
    bachsRate && validAmount(bachsAmt) ? (Math.ceil((Number(bachsAmt) / bachsRate) * 100) / 100).toFixed(2) : null;

  return (
    <Box maxW="1200px" mx="auto" mt={12} px={4}>
      <Heading size="lg" mb={1}>Wallet</Heading>
      <Text color="gray.600" mb={6}>Add funds with M-Pesa, card/bank, or Bachs. Withdraw to M-Pesa.</Text>

      <Box p={5} bg="surface" border="1px solid #E5E3DD" borderRadius="lg" mb={6}>
        <Text fontSize="sm" color="gray.600">Available balance</Text>
        <Heading size="2xl" color="brand.500">{wallet ? fmt(wallet.balance, wallet.currency) : "—"}</Heading>
      </Box>

      <SimpleGrid columns={{ base: 1, md: 3 }} gap={6} mb={8} alignItems="stretch">
        {/* ── M-Pesa card ── */}
        <Box p={5} bg="surface" border="1px solid #E5E3DD" borderRadius="lg" h="100%">
          <Flex justify="space-between" align="center" mb={1} gap={2}>
            <Heading size="md">M-Pesa</Heading>
            <Badge colorPalette="green" variant="subtle">Deposit &amp; Withdraw</Badge>
          </Flex>
          <Text fontSize="sm" color="gray.600" mb={4}>Pay with an STK push to your phone.</Text>

          <Heading size="xs" textTransform="uppercase" color="gray.500" mb={2}>Deposit</Heading>
          <Stack gap={3} mb={5}>
            <Input type="tel" placeholder="M-Pesa number, e.g. 0712345678" value={phone}
              onChange={(e) => setPhone(e.target.value)} />
            <HStack>
              <Input flex="1" minW={0} type="number" min={MIN_AMOUNT} max={MAX_AMOUNT} step={1}
                placeholder="Amount (KES)" value={mpesaAmt} onChange={(e) => setMpesaAmt(e.target.value)} />
              <Button colorPalette="brand" onClick={depositMpesa} loading={busy === "mpesa-deposit"}
                disabled={!mpesaAmt || !phone} flexShrink={0}>
                Deposit
              </Button>
            </HStack>
          </Stack>

          <Box borderTop="1px solid #E5E3DD" pt={4}>
            <Heading size="xs" textTransform="uppercase" color="gray.500" mb={2}>Withdraw</Heading>
            {wallet?.phone_masked ? (
              <>
                <Text fontSize="sm" color="gray.600" mb={3}>Sent to {wallet.phone_masked}</Text>
                <HStack>
                  <Input flex="1" minW={0} type="number" min={MIN_AMOUNT} max={MAX_AMOUNT} step={1}
                    placeholder="Amount (KES)" value={withdrawAmt} onChange={(e) => setWithdrawAmt(e.target.value)} />
                  <Button colorPalette="brand" onClick={withdraw} loading={busy === "withdraw"}
                    disabled={!withdrawAmt} flexShrink={0}>
                    Withdraw
                  </Button>
                </HStack>
              </>
            ) : (
              <Text fontSize="sm" color="gray.600">
                Make an M-Pesa deposit first. Withdrawals go to the M-Pesa number you deposit from.
              </Text>
            )}
          </Box>
        </Box>

        {/* ── Paystack card ── */}
        <Box p={5} bg="surface" border="1px solid #E5E3DD" borderRadius="lg" h="100%">
          <Flex justify="space-between" align="center" mb={1} gap={2}>
            <Heading size="md">Paystack</Heading>
            <Badge colorPalette="blue" variant="subtle">Deposit only</Badge>
          </Flex>
          <Text fontSize="sm" color="gray.600" mb={4}>Pay by card or bank through Paystack's secure checkout.</Text>

          <Heading size="xs" textTransform="uppercase" color="gray.500" mb={2}>Deposit</Heading>
          <Stack gap={3}>
            <HStack>
              <Input flex="1" minW={0} type="number" min={MIN_AMOUNT} max={MAX_AMOUNT} step={1}
                placeholder="Amount (KES)" value={paystackAmt} onChange={(e) => setPaystackAmt(e.target.value)} />
              <Button colorPalette="brand" onClick={depositPaystack} loading={busy === "paystack-deposit"}
                disabled={!paystackAmt} flexShrink={0}>
                Pay
              </Button>
            </HStack>
            <Text fontSize="xs" color="gray.500">
              You'll be redirected to Paystack to complete payment, then brought back here.
            </Text>
          </Stack>
        </Box>

        {/* ── Bachs card ── */}
        <Box p={5} bg="surface" border="1px solid #E5E3DD" borderRadius="lg" h="100%">
          <Flex justify="space-between" align="center" mb={1} gap={2}>
            <Heading size="md">Bachs</Heading>
            <Badge colorPalette="orange" variant="subtle">Deposit only</Badge>
          </Flex>
          <Text fontSize="sm" color="gray.600" mb={4}>
            Pay by card, bank transfer, mobile money or crypto on Bachs's hosted checkout. Priced in USD.
          </Text>

          <Heading size="xs" textTransform="uppercase" color="gray.500" mb={2}>Deposit</Heading>
          <Stack gap={3}>
            <HStack>
              <Input flex="1" minW={0} type="number" min={MIN_AMOUNT} max={MAX_AMOUNT} step={1}
                placeholder="Amount (KES)" value={bachsAmt} onChange={(e) => setBachsAmt(e.target.value)} />
              <Button colorPalette="brand" onClick={depositBachs} loading={busy === "bachs-deposit"}
                disabled={!bachsAmt} flexShrink={0}>
                Pay
              </Button>
            </HStack>
            <Text fontSize="xs" color="gray.500">
              {bachsUsdPreview
                ? `Priced at $${bachsUsdPreview} USD (1 USD ≈ KES ${bachsRate}); you can pay in your local currency at checkout. Your wallet is credited ${fmt(Number(bachsAmt))}.`
                : "Amounts are priced in USD. You'll be redirected to Bachs to pay, then brought back here."}
            </Text>
          </Stack>
        </Box>
      </SimpleGrid>

      <Heading size="sm" mb={3}>Transactions</Heading>
      <Stack gap={2}>
        {wallet?.transactions.map((t) => (
          <Flex key={t.id} p={3} bg="surface" border="1px solid #E5E3DD" borderRadius="md"
            justify="space-between" align="center">
            <Box>
              <Text fontWeight="600" textTransform="capitalize">{t.type}</Text>
              <Text fontSize="xs" color="gray.500">
                {new Date(t.created_at).toLocaleString()}{t.receipt ? ` · ${t.receipt}` : ""}
              </Text>
            </Box>
            <HStack>
              <Badge colorPalette={STATUS_COLORS[t.status] ?? "gray"}>{t.status}</Badge>
              <Text fontWeight="600">{t.type === "deposit" ? "+" : "−"}{fmt(t.amount, wallet.currency)}</Text>
            </HStack>
          </Flex>
        ))}
        {wallet && wallet.transactions.length === 0 && <Text color="gray.500">No transactions yet.</Text>}
      </Stack>
    </Box>
  );
}