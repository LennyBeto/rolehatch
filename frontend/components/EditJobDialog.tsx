// frontend/components/EditJobDialog.tsx
"use client";
import {
  Dialog, Input, Textarea, Button, Stack, Select, Portal, CloseButton,
  createListCollection,
} from "@chakra-ui/react";
import { useState } from "react";
import { updateEmployerJob } from "@/lib/api";
import { toaster } from "@/components/ui/toaster";
import type { EmployerJob } from "@/lib/types";

const REMOTE_TYPES = createListCollection({
  items: [
    { label: "Remote", value: "remote" },
    { label: "Hybrid", value: "hybrid" },
    { label: "Onsite", value: "onsite" },
    { label: "Field", value: "field" },
  ],
});

const COMMITMENTS = createListCollection({
  items: [
    { label: "Full-time", value: "full_time" },
    { label: "Part-time", value: "part_time" },
    { label: "Contract", value: "contract" },
  ],
});

type Props = {
  job: EmployerJob | null;
  onClose: () => void;
  onSaved: (updated: EmployerJob) => void;
};

function EditForm({ job, onClose, onSaved }: { job: EmployerJob } & Omit<Props, "job">) {
  const [title, setTitle] = useState(job.title);
  const [location, setLocation] = useState(job.location ?? "");
  const [remoteType, setRemoteType] = useState<string[]>(job.remote_type ? [job.remote_type] : []);
  const [commitment, setCommitment] = useState<string[]>(job.commitment ? [job.commitment] : []);
  const [salaryMin, setSalaryMin] = useState(job.salary_min?.toString() ?? "");
  const [salaryMax, setSalaryMax] = useState(job.salary_max?.toString() ?? "");
  const [description, setDescription] = useState(job.description ?? "");
  const [applyUrl, setApplyUrl] = useState(job.source_url);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await updateEmployerJob(job.id, {
        title,
        location: location || null,
        remote_type: remoteType[0] || null,
        commitment: commitment[0] || null,
        salary_min: salaryMin ? Number(salaryMin) : null,
        salary_max: salaryMax ? Number(salaryMax) : null,
        description: description || null,
        apply_url: applyUrl,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail?.[0]?.msg || err?.detail || "Failed to update listing");
      }
      const updated: EmployerJob = await res.json();
      toaster.create({ title: "Listing updated", type: "success" });
      onSaved(updated);
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
    <Dialog.Content>
      <Dialog.Header>Edit listing</Dialog.Header>
      <Dialog.CloseTrigger asChild><CloseButton size="sm" /></Dialog.CloseTrigger>
      <Dialog.Body>
        <Stack gap={3}>
          <Input placeholder="Job title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <Input placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} />

          <Select.Root collection={REMOTE_TYPES} value={remoteType} onValueChange={(e) => setRemoteType(e.value)}>
            <Select.Control>
              <Select.Trigger><Select.ValueText placeholder="Work environment" /></Select.Trigger>
            </Select.Control>
            <Portal>
              <Select.Positioner>
                <Select.Content>
                  {REMOTE_TYPES.items.map((item) => (
                    <Select.Item key={item.value} item={item}>{item.label}</Select.Item>
                  ))}
                </Select.Content>
              </Select.Positioner>
            </Portal>
          </Select.Root>

          <Select.Root collection={COMMITMENTS} value={commitment} onValueChange={(e) => setCommitment(e.value)}>
            <Select.Control>
              <Select.Trigger><Select.ValueText placeholder="Commitment type" /></Select.Trigger>
            </Select.Control>
            <Portal>
              <Select.Positioner>
                <Select.Content>
                  {COMMITMENTS.items.map((item) => (
                    <Select.Item key={item.value} item={item}>{item.label}</Select.Item>
                  ))}
                </Select.Content>
              </Select.Positioner>
            </Portal>
          </Select.Root>

          <Stack direction="row" gap={3}>
            <Input placeholder="Min salary ($k)" type="number" value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} />
            <Input placeholder="Max salary ($k)" type="number" value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)} />
          </Stack>

          <Input placeholder="Application URL" type="url" value={applyUrl} onChange={(e) => setApplyUrl(e.target.value)} required />
          <Textarea placeholder="Description (optional)" rows={6} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Stack>
      </Dialog.Body>
      <Dialog.Footer>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button colorPalette="brand" loading={saving} onClick={handleSave} disabled={!title || !applyUrl}>
          Save changes
        </Button>
      </Dialog.Footer>
    </Dialog.Content>
  );
}

export default function EditJobDialog({ job, onClose, onSaved }: Props) {
  return (
    <Dialog.Root open={!!job} onOpenChange={(e) => !e.open && onClose()} placement="center" scrollBehavior="inside">
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          {/* key remounts the form with fresh state for each job */}
          {job && <EditForm key={job.id} job={job} onClose={onClose} onSaved={onSaved} />}
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}