// frontend/components/SignInModal.tsx
"use client";
import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody,
  ModalCloseButton, Input, Button, Text, useToast } from "@chakra-ui/react";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function SignInModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const toast = useToast();

  const handleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      toast({ title: "Couldn't send link", description: error.message, status: "error" });
      return;
    }
    setSent(true);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Sign in to RoleHatch</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          {sent ? (
            <Text>Check your email for a sign-in link.</Text>
          ) : (
            <>
              <Input
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                mb={3}
              />
              <Button colorScheme="brand" w="full" onClick={handleSignIn}>
                Send magic link
              </Button>
            </>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}