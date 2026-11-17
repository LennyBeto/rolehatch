// frontend/components/PromoteReturnHandler.tsx
"use client";
import { useEffect, useRef } from "react";
import { authedFetch } from "@/lib/api";
import { toaster } from "@/components/ui/toaster";

export default function PromoteReturnHandler({ onDone }: { onDone?: () => void }) {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    const p = new URLSearchParams(window.location.search);
    const ref = p.get("reference") || p.get("trxref");
    if (p.get("paid") !== "1" || !ref) return;
    ran.current = true;
    window.history.replaceState(null, "", "/dashboard");

    (async () => {
      try {
        const res = await authedFetch(`/api/promote/verify/${encodeURIComponent(ref)}`);
        const data = await res.json().catch(() => null);
        if (res.ok && data?.featured) {
          toaster.create({ title: "Listing featured", description: "Pinned to the top for 14 days.", type: "success" });
          if (onDone) onDone();
          else setTimeout(() => window.location.reload(), 1200);
        } else {
          toaster.create({ title: "Payment not confirmed yet", description: "If you were charged, it will activate shortly.", type: "info" });
        }
      } catch {
        toaster.create({ title: "Couldn't confirm payment", description: "Refresh in a minute.", type: "error" });
      }
    })();
  }, [onDone]);

  return null;
}