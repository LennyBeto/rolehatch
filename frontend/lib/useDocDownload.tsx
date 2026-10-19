// frontend/lib/useDocDownload.tsx
"use client";
import { Button, CloseButton, Dialog, Portal, Stack, Text } from "@chakra-ui/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  consumeDocCredit, getDocQuota, refundDocCredit, startDocCheckout,
  type DocKind, type DocQuota,
} from "@/lib/api";
import type { Authorized } from "@/lib/docActions";
import { toaster } from "@/components/ui/toaster";

const DASHBOARD_PATH = "/applicant/dashboard";
const POLL_INTERVAL_MS = 3000;
const POLL_MAX_MS = 10 * 60 * 1000;
const KIND_LABEL: Record<DocKind, string> = { cv: "CV", cover_letter: "cover letter" };

// Why the `authorized` promise rejected, so run() can react correctly
class LockedError extends Error {}
class ConsumeError extends Error {}

export function useDocDownload(kind: DocKind) {
  const router = useRouter();
  const [quota, setQuota] = useState<DocQuota | null>(null);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const [buying, setBuying] = useState(false);
  const [waiting, setWaiting] = useState(false); // checkout tab is open; waiting for payment
  const workingRef = useRef(false);

  const refreshQuota = useCallback(async (): Promise<DocQuota | null> => {
    try {
      const res = await getDocQuota();
      if (!res.ok) return null;
      const data: DocQuota = await res.json();
      setQuota(data);
      return data;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => { refreshQuota(); }, [refreshQuota]);

  const release = useCallback(() => {
    workingRef.current = false;
    setWorking(false);
  }, []);

  // Closes the paywall and tells the user to click download again once credits exist
  const checkUnlocked = useCallback(async () => {
    const q = await refreshQuota();
    if (q && !q[kind].locked) {
      setWaiting(false);
      setPaywallOpen(false);
      toaster.create({ title: "Downloads unlocked", description: "Click your download button again.", type: "success" });
    }
  }, [kind, refreshQuota]);

  // While the checkout tab is open, poll until the payment lands (max 10 minutes)
  useEffect(() => {
    if (!waiting) return;
    const poll = window.setInterval(() => { checkUnlocked(); }, POLL_INTERVAL_MS);
    const stop = window.setTimeout(() => setWaiting(false), POLL_MAX_MS);
    return () => {
      window.clearInterval(poll);
      window.clearTimeout(stop);
    };
  }, [waiting, checkUnlocked]);

  /**
   * Spend one download, run the browser action, then go back to the dashboard.
   *
   * The action is started immediately (still inside the user's click, which browsers need for
   * clipboard access) and receives an `authorized` promise that resolves once the server has
   * spent the download. Actions must await it before handing the document to the user.
   *
   * Locked -> paywall dialog (no redirect). Action failed -> credit refunded, stay on the page.
   * Pass `successTitle = null` to skip the success toast.
   */
  const run = useCallback(
    async (
      action: (authorized: Authorized) => void | Promise<void>,
      successTitle: string | null = "Download complete",
      errorTitle = "That didn't work"
    ) => {
      if (workingRef.current) return;
      workingRef.current = true;
      setWorking(true);

      const spent: { id?: string } = {};

      // No `await` before this point: the action must start inside the click gesture.
      const authorized: Authorized = (async () => {
        let res: Response;
        try {
          res = await consumeDocCredit(kind);
        } catch {
          throw new ConsumeError("consume failed");
        }
        if (res.status === 402) {
          await refreshQuota();
          setPaywallOpen(true);
          throw new LockedError("locked");
        }
        if (!res.ok) throw new ConsumeError("consume failed");
        try {
          const data: { consumption_id: string } = await res.json();
          spent.id = data.consumption_id;
        } catch {
          throw new ConsumeError("consume failed");
        }
      })();
      authorized.catch(() => {}); // handled below; avoids an unhandled-rejection warning

      try {
        await action(authorized);
        await authorized; // an action that never awaited it must still be authorized
      } catch (err) {
        // Prefer the real reason the credit check failed over whatever the action threw
        const reason = await authorized.then(() => null, (e: unknown) => e);

        if (reason instanceof LockedError) {
          release(); // paywall dialog is already open
          return;
        }
        if (reason instanceof ConsumeError) {
          toaster.create({ title: "Couldn't check your downloads", description: "Please try again.", type: "error" });
          release();
          return;
        }

        // Credit was spent but the action itself failed: give it back
        if (spent.id) refundDocCredit(spent.id).catch(() => {});
        toaster.create({
          title: errorTitle,
          description: "Your download was not used. Please try again.",
          type: "error",
        });
        await refreshQuota();
        release();
        return;
      }

      if (successTitle) toaster.create({ title: successTitle, type: "success" });
      router.push(DASHBOARD_PATH);
    },
    [kind, refreshQuota, release, router]
  );

  const buy = useCallback(async () => {
    setBuying(true);
    // Open the tab inside the click so popup blockers allow it, then point it at checkout.
    const tab = window.open("about:blank", "_blank");
    if (tab) tab.opener = null;
    try {
      const res = await startDocCheckout();
      if (!res.ok) throw new Error("checkout failed");
      const data: { authorization_url: string } = await res.json();
      if (tab) {
        tab.location.href = data.authorization_url;
        setWaiting(true);
      } else {
        window.location.href = data.authorization_url; // popup blocked: fall back to this tab
      }
    } catch {
      tab?.close();
      toaster.create({ title: "Couldn't start checkout", description: "Please try again.", type: "error" });
    } finally {
      setBuying(false);
    }
  }, []);

  const each = quota?.pack_downloads_each ?? 5;
  const priceUsd = quota?.pack_price_usd ?? 3.99;
  const priceKes = quota?.pack_price_kes;

  const paywall = (
    <Dialog.Root
      open={paywallOpen}
      onOpenChange={(e) => {
        if (!e.open) {
          setPaywallOpen(false);
          setWaiting(false);
        }
      }}
      placement="center"
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Download limit reached</Dialog.Title>
            </Dialog.Header>
            <Dialog.CloseTrigger asChild><CloseButton size="sm" /></Dialog.CloseTrigger>
            <Dialog.Body pb={6}>
              <Stack gap={3}>
                <Text fontSize="sm">You've used your free {KIND_LABEL[kind]} download.</Text>
                <Text fontSize="sm" color="gray.600">
                  Unlock {each} more CV and {each} more cover letter downloads for ${priceUsd}
                  {priceKes ? ` (KES ${priceKes})` : ""}. One payment covers both.
                </Text>
                {waiting ? (
                  <>
                    <Text fontSize="sm" color="gray.600">
                      Finish the payment in the new tab. This window unlocks automatically, and your work here is kept.
                    </Text>
                    <Button variant="outline" colorPalette="brand" onClick={checkUnlocked}>
                      I've paid, check again
                    </Button>
                  </>
                ) : (
                  <Button colorPalette="brand" onClick={buy} loading={buying}>
                    Unlock for ${priceUsd}
                  </Button>
                )}
              </Stack>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );

  return {
    run,
    paywall,
    working,
    remaining: quota ? quota[kind].remaining : null,
  };
}