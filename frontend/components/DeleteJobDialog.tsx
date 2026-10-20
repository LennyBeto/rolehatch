// frontend/components/DeleteJobDialog.tsx
"use client";
import { Dialog, Button, Text, Portal, CloseButton } from "@chakra-ui/react";
import { useState } from "react";
import { deleteJob } from "@/lib/api";
import { toaster } from "@/components/ui/toaster";
import type { EmployerJob } from "./EditJobDialog";

type Props = {
  job: EmployerJob | null;
  onClose: () => void;
  onDeleted: (jobId: string) => void;
};

export default function DeleteJobDialog({ job, onClose, onDeleted }: Props) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!job) return;
    setDeleting(true);
    try {
      const res = await deleteJob(job.id);
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || "Failed to delete listing");
      }
      toaster.create({ title: "Listing deleted", type: "success" });
      onDeleted(job.id);
      onClose();
    } catch (err) {
      toaster.create({
        title: "Couldn't delete listing",
        description: err instanceof Error ? err.message : "Please try again.",
        type: "error",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog.Root open={!!job} onOpenChange={(e) => !e.open && onClose()} placement="center" role="alertdialog">
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Delete this listing?</Dialog.Title>
            </Dialog.Header>
            <Dialog.CloseTrigger asChild><CloseButton size="sm" /></Dialog.CloseTrigger>
            <Dialog.Body>
              <Text fontSize="sm" mb={2}>
                <strong>{job?.title}</strong> will be removed from PerchRole search immediately,
                along with any job seeker's saved copies. This can't be undone.
              </Text>
              {job?.is_featured && (
                <Text fontSize="sm" color="orange.600">
                  This listing is currently featured. Deleting it ends the paid placement without a refund.
                </Text>
              )}
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              <Button colorPalette="red" onClick={handleDelete} loading={deleting}>Delete</Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}