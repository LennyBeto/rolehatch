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
  const [withdrawAmt, setWithdrawAmt] = useState("");
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

  // Paystack redirects back to /wallet?reference=...&trxref=... — verify once, then clean the URL.
  useEffect(() => {
    if (!user || verifiedRef.current) return;
    const reference = new URLSearchParams(window.location.search).get("reference");
    if (!reference) return;
    verifiedRef.current = true;
    (async () => {
      try {
        const res = await authedFetch(`/api/wallet/paystack/verify/${encodeURIComponent(reference)}`);
        if (!res.ok) throw new Error(`Verification failed (${res.status})`);
        const { status } = await res.json();
        if (status === "completed") {
          toaster.create({ title: "Deposit successful", description: "Your wallet has been credited.", type: "success" });
        } else if (status === "failed") {
          toaster.create({ title: "Payment failed", description: "No money was taken. Please try again.", type: "error" });
        } else {
          toaster.create({ title: "Payment pending", description: "We'll update your balance once Paystack confirms.", type: "info" });
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

  return (
    <Box maxW="900px" mx="auto" mt={12} px={4}>
      <Heading size="lg" mb={1}>Wallet</Heading>
      <Text color="gray.600" mb={6}>Add funds with M-Pesa or card/bank. Withdraw to M-Pesa.</Text>

      <Box p={5} bg="surface" border="1px solid #E5E3DD" borderRadius="lg" mb={6}>
        <Text fontSize="sm" color="gray.600">Available balance</Text>
        <Heading size="2xl" color="brand.500">{wallet ? fmt(wallet.balance, wallet.currency) : "—"}</Heading>
      </Box>

      <SimpleGrid columns={{ base: 1, md: 2 }} gap={6} mb={8} alignItems="start">
        {/* ── M-Pesa card ── */}
        <Box p={5} bg="surface" border="1px solid #E5E3DD" borderRadius="lg">
          <Flex justify="space-between" align="center" mb={1}>
            <Heading size="md">M-Pesa</Heading>
            <Badge colorPalette="green" variant="subtle">Deposit &amp; Withdraw</Badge>
          </Flex>
          <Text fontSize="sm" color="gray.600" mb={4}>Pay with an STK push to your phone.</Text>

          <Heading size="xs" textTransform="uppercase" color="gray.500" mb={2}>Deposit</Heading>
          <Stack gap={3} mb={5}>
            <Input type="tel" placeholder="M-Pesa number, e.g. 0712345678" value={phone}
              onChange={(e) => setPhone(e.target.value)} />
            <HStack>
              <Input type="number" min={MIN_AMOUNT} max={MAX_AMOUNT} step={1} placeholder="Amount (KES)"
                value={mpesaAmt} onChange={(e) => setMpesaAmt(e.target.value)} />
              <Button colorPalette="brand" onClick={depositMpesa} loading={busy === "mpesa-deposit"}
                disabled={!mpesaAmt || !phone}>
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
                  <Input type="number" min={MIN_AMOUNT} max={MAX_AMOUNT} step={1} placeholder="Amount (KES)"
                    value={withdrawAmt} onChange={(e) => setWithdrawAmt(e.target.value)} />
                  <Button colorPalette="brand" onClick={withdraw} loading={busy === "withdraw"}
                    disabled={!withdrawAmt}>
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
        <Box p={5} bg="surface" border="1px solid #E5E3DD" borderRadius="lg">
          <Flex justify="space-between" align="center" mb={1}>
            <Heading size="md">Paystack</Heading>
            <Badge colorPalette="blue" variant="subtle">Deposit only</Badge>
          </Flex>
          <Text fontSize="sm" color="gray.600" mb={4}>Pay by card or bank through Paystack's secure checkout.</Text>

          <Heading size="xs" textTransform="uppercase" color="gray.500" mb={2}>Deposit</Heading>
          <Stack gap={3}>
            <HStack>
              <Input type="number" min={MIN_AMOUNT} max={MAX_AMOUNT} step={1} placeholder="Amount (KES)"
                value={paystackAmt} onChange={(e) => setPaystackAmt(e.target.value)} />
              <Button colorPalette="brand" onClick={depositPaystack} loading={busy === "paystack-deposit"}
                disabled={!paystackAmt}>
                Pay
              </Button>
            </HStack>
            <Text fontSize="xs" color="gray.500">
              You'll be redirected to Paystack to complete payment, then brought back here.
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