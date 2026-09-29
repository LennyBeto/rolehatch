// frontend/components/ProfileManagementCard.tsx
"use client";
import { Box, Button, CloseButton, Dialog, Heading, HStack, Portal, Text } from "@chakra-ui/react";
import { useState } from "react";
import { deleteApplicantCV, resetApplicantProfile } from "@/lib/api";
import { toaster } from "@/components/ui/toaster";

type Action = "cv" | "reset";

const ACTIONS: Record<
  Action,
  { title: string; body: string; confirm: string; success: string; error: string; run: () => Promise<Response> }
> = {
  cv: {
    title: "Remove your CV?",
    body: "Your CV file and its match score will be deleted. Your profile details and saved summary are kept. You can upload a new CV at any time.",
    confirm: "Remove CV",
    success: "CV removed",
    error: "Couldn't remove your CV",
    run: deleteApplicantCV,
  },
  reset: {
    title: "Reset profile details?",
    body: "This clears your full name, expertise, professional summary and profile image. Your CV and visibility setting are kept. This can't be undone.",
    confirm: "Reset details",
    success: "Profile details reset",
    error: "Couldn't reset your profile",
    run: resetApplicantProfile,
  },
};

type Props = {
  cvFilename: string | null;
  onChanged: () => void; // parent re-fetches the profile
};

export default function ProfileManagementCard({ cvFilename, onChanged }: Props) {
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState<Action>("cv");
  const [busy, setBusy] = useState(false);

  const openConfirm = (next: Action) => {
    setAction(next);
    setOpen(true);
  };

  const current = ACTIONS[action];

  const handleConfirm = async () => {
    setBusy(true);
    try {
      const res = await current.run();
      if (!res.ok) throw new Error();
      toaster.create({ title: current.success, type: "success" });
      setOpen(false);
      onChanged();
    } catch {
      toaster.create({ title: current.error, description: "Please try again.", type: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box bg="surface" border="1px solid #E5E3DD" borderRadius="lg" p={5} mb={6}>
      <Heading size="md" mb={1}>Manage Profile</Heading>
      <Text fontSize="sm" color="gray.600" mb={4}>
        Remove your CV or reset your profile details. Use the sections above to edit or replace them.
      </Text>

      <HStack gap={3} flexWrap="wrap">
        <Button
          size="sm"
          variant="outline"
          colorPalette="red"
          disabled={!cvFilename}
          onClick={() => openConfirm("cv")}
        >
          Remove CV
        </Button>
        <Button size="sm" variant="outline" colorPalette="red" onClick={() => openConfirm("reset")}>
          Reset profile details
        </Button>
      </HStack>

      <Dialog.Root
        open={open}
        onOpenChange={(e) => {
          if (!e.open && !busy) setOpen(false);
        }}
        placement="center"
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>{current.title}</Dialog.Title>
              </Dialog.Header>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" disabled={busy} />
              </Dialog.CloseTrigger>
              <Dialog.Body>
                <Text fontSize="sm">{current.body}</Text>
              </Dialog.Body>
              <Dialog.Footer>
                <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
                  Cancel
                </Button>
                <Button colorPalette="red" onClick={handleConfirm} loading={busy}>
                  {current.confirm}
                </Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </Box>
  );
}