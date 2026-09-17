// frontend/components/JobActions.tsx
"use client";
import { Button, HStack } from "@chakra-ui/react";
import { useAuth } from "@/lib/AuthContext";
import { saveJob, markApplied, hideJob } from "@/lib/api";
import { useState } from "react";
import { toaster } from "@/components/ui/toaster";
import SignInModal from "./SignInModal";

export default function JobActions({ jobId }: { jobId: string }) {
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);

  const requireAuth = (fn: () => Promise<Response>) => async () => {
    if (!user) return setModalOpen(true);
    try {
      const res = await fn();
      if (!res.ok) throw new Error();
      toaster.create({ title: "Updated", type: "success" });
    } catch {
      toaster.create({ title: "Something went wrong", type: "error" });
    }
  };

  return (
    <>
      <HStack mt={2}>
        <Button size="sm" variant="outline" colorPalette="brand" onClick={requireAuth(() => saveJob(jobId))}>Save</Button>
        <Button size="sm" colorPalette="brand" onClick={requireAuth(() => markApplied(jobId))}>Mark Applied</Button>
        <Button size="sm" variant="ghost" onClick={requireAuth(() => hideJob(jobId))}>Hide</Button>
      </HStack>
      <SignInModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}