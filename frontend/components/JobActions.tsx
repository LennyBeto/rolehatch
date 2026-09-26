// frontend/components/JobActions.tsx
"use client";
import { Button, HStack } from "@chakra-ui/react";
import { useAuth } from "@/lib/AuthContext";
import { useNotifications } from "@/lib/NotificationContext";
import { saveJob, markApplied, hideJob } from "@/lib/api";
import { useState } from "react";
import { toaster } from "@/components/ui/toaster";
import SignInModal from "./SignInModal";

type Props = { jobId: string; jobTitle?: string };

export default function JobActions({ jobId, jobTitle }: Props) {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const [modalOpen, setModalOpen] = useState(false);

  const label = jobTitle ? `"${jobTitle}"` : "This job";

  const requireAuth = (fn: () => Promise<Response>, notifyMessage: string) => async () => {
    if (!user) return setModalOpen(true);
    try {
      const res = await fn();
      if (!res.ok) throw new Error();
      toaster.create({ title: "Updated", type: "success" });
      addNotification(notifyMessage);
    } catch {
      toaster.create({ title: "Something went wrong", type: "error" });
    }
  };

  return (
    <>
      <HStack mt={2}>
        <Button
          size="sm"
          variant="outline"
          colorPalette="brand"
          onClick={requireAuth(() => saveJob(jobId), `${label} was saved to your list.`)}
        >
          Save
        </Button>
        <Button
          size="sm"
          colorPalette="brand"
          onClick={requireAuth(() => markApplied(jobId), `${label} was marked as applied.`)}
        >
          Mark Applied
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={requireAuth(() => hideJob(jobId), `${label} was hidden from your listings.`)}
        >
          Hide
        </Button>
      </HStack>
      <SignInModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}