// frontend/components/DeleteJobDialog.tsx
"use client";
import { Dialog, Button, Text, Portal, CloseButton } from "@chakra-ui/react";
import { useState } from "react";
import { deleteEmployerJob } from "@/lib/api";
import { toaster } from "@/components/ui/toaster";
import type { EmployerJob } from "@/lib/types";

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
      const res = await deleteEmployerJob(job.id);
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || "Failed to delete listing");
      }
      toaster.create({ title: "Listing deleted", type: "success" });
      onDeleted(job.id);
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
            <Dialog.Header>Delete this listing?</Dialog.Header>
            <Dialog.CloseTrigger asChild><CloseButton size="sm" /></Dialog.CloseTrigger>
            <Dialog.Body>
              <Text fontWeight="600" mb={2}>{job?.title}</Text>
              <Text fontSize="sm" color="gray.600">
                It will be removed from search results immediately.
                {job?.is_featured && " This listing is currently featured — deleting it forfeits the remaining promotion time."}
              </Text>
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              <Button colorPalette="red" loading={deleting} onClick={handleDelete}>Delete</Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}