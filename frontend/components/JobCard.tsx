// frontend/components/JobCard.tsx — action buttons added to the JobList item
"use client";
import { Button, HStack, useToast } from "@chakra-ui/react";
import { useAuth } from "@/lib/AuthContext";
import { saveJob, markApplied, hideJob } from "@/lib/api";
import { useState } from "react";
import SignInModal from "./SignInModal";

export default function JobActions({ jobId }: { jobId: string }) {
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const toast = useToast();

  const requireAuth = (fn: () => Promise<Response>) => async () => {
    if (!user) return setModalOpen(true);
    try {
      const res = await fn();
      if (!res.ok) throw new Error();
      toast({ title: "Updated", status: "success", duration: 1500 });
    } catch {
      toast({ title: "Something went wrong", status: "error" });
    }
  };

  return (
    <>
      <HStack mt={2}>
        <Button size="sm" variant="outline" colorScheme="brand" onClick={requireAuth(() => saveJob(jobId))}>Save</Button>
        <Button size="sm" colorScheme="brand" onClick={requireAuth(() => markApplied(jobId))}>Mark Applied</Button>
        <Button size="sm" variant="ghost" onClick={requireAuth(() => hideJob(jobId))}>Hide</Button>
      </HStack>
      <SignInModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}