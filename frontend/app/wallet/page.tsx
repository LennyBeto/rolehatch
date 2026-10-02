// frontend/app/wallet/page.tsx
"use client";
import { Box, Heading, Text, Stack, Button, Input, HStack, Badge, Flex } from "@chakra-ui/react";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { authedFetch } from "@/lib/api";
import { toaster } from "@/components/ui/toaster";

type Tx = {
  id: string; type: "deposit" | "withdrawal"; amount: number; status: string;
  receipt: string | null; created_at: string;
};
type WalletData = { balance: number; currency: string; phone_masked: string | null; transactions: Tx[] };

const fmt = (amount: number, currency = "KES") =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);

const STATUS_COLORS: Record<string, string> = { completed: "green", pending: "orange", failed: "red" };

export default function WalletPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [phone, setPhone] = useState("");
  const [depositAmt, setDepositAmt] = useState("");
  const [withdrawAmt, setWithdrawAmt] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

  const load = useCallback(async () => {
    try {
      const res = await authedFetch("/api/wallet");
      if (!res.ok) throw new Error();
      setWallet(await res.json());
    } catch {
      toaster.create({ title: "Couldn't load your wallet", type: "error" });
    }
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  // While anything is pending (PIN prompt / payout), poll until the callback lands.
  const hasPending = wallet?.transactions.some((t) => t.status === "pending") ?? false;
  useEffect(() => {
    if (!hasPending) return;
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
  }, [hasPending, load]);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try { await fn(); } finally { setBusy(null); }
  };

  const errorDetail = async (res: Response, fallback: string) => {
    const err = await res.json().catch(() => null);
    if (typeof err?.detail === "string") return err.detail;
    return err?.detail?.[0]?.msg ?? fallback;
  };

  const deposit = () => run("deposit", async () => {
    const res = await authedFetch("/api/wallet/deposit", {
      method: "POST", body: JSON.stringify({ amount: Number(depositAmt), phone }),
    });
    if (!res.ok) {
      toaster.create({ title: "Couldn't start deposit", description: await errorDetail(res, "Amount must be KES 10 – 150,000."), type: "error" });
      return;
    }
    toaster.create({ title: "Check your phone", description: "Enter your M-Pesa PIN to complete the deposit.", type: "info" });
    setDepositAmt("");
    load();
  });

  const withdraw = () => run("withdraw", async () => {
    const res = await authedFetch("/api/wallet/withdraw", {
      method: "POST", body: JSON.stringify({ amount: Number(withdrawAmt) }),
    });
    if (!res.ok) {
      toaster.create({ title: "Couldn't withdraw", description: await errorDetail(res, "Amount must be KES 10 – 150,000."), type: "error" });
      return;
    }
    toaster.create({ title: "Withdrawal requested", description: "Funds will arrive on your phone shortly.", type: "success" });
    setWithdrawAmt("");
    load();
  });

  if (loading || !user) return null;

  return (
    <Box maxW="700px" mx="auto" mt={12} px={4}>
      <Heading size="lg" mb={1}>Wallet</Heading>
      <Text color="gray.600" mb={6}>Deposit and withdraw with M-Pesa.</Text>

      <Box p={5} bg="surface" border="1px solid #E5E3DD" borderRadius="lg" mb={6}>
        <Text fontSize="sm" color="gray.600">Available balance</Text>
        <Heading size="2xl" color="brand.500">{wallet ? fmt(wallet.balance, wallet.currency) : "—"}</Heading>
      </Box>

      <Stack gap={6} mb={8}>
        <Box p={5} bg="surface" border="1px solid #E5E3DD" borderRadius="lg">
          <Heading size="sm" mb={3}>Deposit</Heading>
          <Stack gap={3}>
            <Input type="tel" placeholder="M-Pesa number, e.g. 0712345678" value={phone}
              onChange={(e) => setPhone(e.target.value)} />
            <HStack>
              <Input type="number" min={10} max={150000} step={1} placeholder="Amount (KES)"
                value={depositAmt} onChange={(e) => setDepositAmt(e.target.value)} />
              <Button colorPalette="brand" onClick={deposit} loading={busy === "deposit"}
                disabled={!depositAmt || !phone}>
                Deposit
              </Button>
            </HStack>
          </Stack>
        </Box>

        <Box p={5} bg="surface" border="1px solid #E5E3DD" borderRadius="lg">
          <Heading size="sm" mb={3}>Withdraw</Heading>
          {wallet?.phone_masked ? (
            <>
              <Text fontSize="sm" color="gray.600" mb={3}>Sent to {wallet.phone_masked}</Text>
              <HStack>
                <Input type="number" min={10} max={150000} step={1} placeholder="Amount (KES)"
                  value={withdrawAmt} onChange={(e) => setWithdrawAmt(e.target.value)} />
                <Button colorPalette="brand" onClick={withdraw} loading={busy === "withdraw"} disabled={!withdrawAmt}>
                  Withdraw
                </Button>
              </HStack>
            </>
          ) : (
            <Text fontSize="sm" color="gray.600">
              Make a deposit first. Withdrawals go to the M-Pesa number you deposit from.
            </Text>
          )}
        </Box>
      </Stack>

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