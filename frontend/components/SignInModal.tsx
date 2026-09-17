// frontend/components/SignInModal.tsx
"use client";
import { Dialog, Input, Button, Text, Portal, CloseButton } from "@chakra-ui/react";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toaster } from "@/components/ui/toaster";

export default function SignInModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const handleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      toaster.create({ title: "Couldn't send link", description: error.message, type: "error" });
      return;
    }
    setSent(true);
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && onClose()} placement="center">
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>Sign in to PerchRole</Dialog.Header>
            <Dialog.CloseTrigger asChild><CloseButton size="sm" /></Dialog.CloseTrigger>
            <Dialog.Body pb={6}>
              {sent ? (
                <Text>Check your email for a sign-in link.</Text>
              ) : (
                <>
                  <Input placeholder="you@email.com" value={email}
                    onChange={(e) => setEmail(e.target.value)} type="email" mb={3} />
                  <Button colorPalette="brand" w="full" onClick={handleSignIn}>
                    Send magic link
                  </Button>
                </>
              )}
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}