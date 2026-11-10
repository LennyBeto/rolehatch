// frontend/components/PlanSubscribeButton.tsx
"use client";
import { Button } from "@chakra-ui/react";
import { useState } from "react";
import { authedFetch } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { toaster } from "@/components/ui/toaster";
import SignInModal from "./SignInModal";

type Props = { planId: string; label: string; highlighted?: boolean };

export default function PlanSubscribeButton({ planId, label, highlighted = false }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const subscribe = async () => {
    if (!user) {
      setModalOpen(true);
      return;
    }
    setLoading(true);
    try {
      const res = await authedFetch(`/api/promote/subscribe/${planId}`, { method: "POST" });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(typeof body?.detail === "string" ? body.detail : "Couldn't start checkout");
      }
      window.location.href = body.checkout_url;
    } catch (err) {
      toaster.create({
        title: "Couldn't start subscription",
        description: err instanceof Error ? err.message : undefined,
        type: "error",
      });
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        colorPalette="brand"
        variant={highlighted ? "solid" : "outline"}
        w="full"
        borderRadius="full"
        loading={loading}
        onClick={subscribe}
      >
        {label}
      </Button>
      <SignInModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}