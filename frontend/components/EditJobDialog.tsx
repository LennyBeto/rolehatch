// frontend/components/EditJobDialog.tsx
"use client";
import {
  Dialog, Input, Textarea, Button, Stack, NativeSelect, Portal, CloseButton, HStack,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { updateJob } from "@/lib/api";
import { toaster } from "@/components/ui/toaster";

export type EmployerJob = {
  id: string;
  title: string;
  source: string;
  editable: boolean;
  location: string | null;
  remote_type: string | null;
  commitment: string | null;
  salary_min: number | null;
  salary_max: number | null;
  description: string | null;
  apply_url: string;
  is_featured: boolean;
  featured_until: string | null;
};

type Props = {
  job: EmployerJob | null;
  onClose: () => void;
  onSaved: (job: EmployerJob) => void;
};

export default function EditJobDialog({ job, onClose, onSaved }: Props) {
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [remoteType, setRemoteType] = useState("");
  const [commitment, setCommitment] = useState("");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [applyUrl, setApplyUrl] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!job) return;
    setTitle(job.title);
    setLocation(job.location ?? "");
    setRemoteType(job.remote_type ?? "");
    setCommitment(job.commitment ?? "");
    setSalaryMin(job.salary_min != null ? String(job.salary_min) : "");
    setSalaryMax(job.salary_max != null ? String(job.salary_max) : "");
    setApplyUrl(job.apply_url);
    setDescription(job.description ?? "");
  }, [job]);

  const handleSave = async () => {
    if (!job) return;
    setSaving(true);
    try {
      const res = await updateJob(job.id, {
        title,
        location: location || null,
        remote_type: remoteType || null,
        commitment: commitment || null,
        salary_min: salaryMin ? Number(salaryMin) : null,
        salary_max: salaryMax ? Number(salaryMax) : null,
        description: description || null,
        apply_url: applyUrl,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail?.[0]?.msg || err?.detail || "Failed to update listing");
      }
      const data = await res.json();
      toaster.create({ title: "Listing updated", type: "success" });
      onSaved(data.job);
      onClose();
    } catch (err) {
      toaster.create({
        title: "Couldn't update listing",
        description: err instanceof Error ? err.message : "Please try again.",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog.Root open={!!job} onOpenChange={(e) => !e.open && onClose()} placement="center" scrollBehavior="inside">
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Edit listing</Dialog.Title>
            </Dialog.Header>
            <Dialog.CloseTrigger asChild><CloseButton size="sm" /></Dialog.CloseTrigger>
            <Dialog.Body>
              <Stack gap={3}>
                <Input placeholder="Job title" value={title} onChange={(e) => setTitle(e.target.value)} />
                <Input placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} />

                <NativeSelect.Root>
                  <NativeSelect.Field value={remoteType} onChange={(e) => setRemoteType(e.target.value)}>
                    <option value="">Work environment</option>
                    <option value="remote">Remote</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="onsite">Onsite</option>
                    <option value="field">Field</option>
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>

                <NativeSelect.Root>
                  <NativeSelect.Field value={commitment} onChange={(e) => setCommitment(e.target.value)}>
                    <option value="">Commitment type</option>
                    <option value="full_time">Full-time</option>
                    <option value="part_time">Part-time</option>
                    <option value="contract">Contract</option>
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>

                <HStack gap={3}>
                  <Input placeholder="Min salary ($k)" type="number" value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} />
                  <Input placeholder="Max salary ($k)" type="number" value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)} />
                </HStack>

                <Input placeholder="Application URL" type="url" value={applyUrl} onChange={(e) => setApplyUrl(e.target.value)} />
                <Textarea placeholder="Description (optional)" rows={5} value={description} onChange={(e) => setDescription(e.target.value)} />
              </Stack>
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              <Button colorPalette="brand" onClick={handleSave} loading={saving} disabled={!title.trim() || !applyUrl.trim()}>
                Save changes
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}