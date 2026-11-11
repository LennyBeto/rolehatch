// frontend/components/NewsletterActionPage.tsx
"use client";
import { Box, Heading, Text, Button } from "@chakra-ui/react";
import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const COPY = {
  confirm: {
    title: "Confirm your subscription",
    body: "One tap and you're on the list.",
    button: "Confirm subscription",
    done: "You're subscribed. Welcome aboard!",
    path: "/api/newsletter/confirm",
  },
  unsubscribe: {
    title: "Unsubscribe",
    body: "You'll stop receiving the PerchRole newsletter.",
    button: "Unsubscribe",
    done: "You've been unsubscribed. We're sorry to see you go.",
    path: "/api/newsletter/unsubscribe",
  },
} as const;

export default function NewsletterActionPage({ action }: { action: keyof typeof COPY }) {
  const copy = COPY[action];
  const params = useSearchParams();
  const email = params.get("e");
  const token = params.get("t");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  const submit = async () => {
    if (!email || !token) return;
    setState("loading");
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}${copy.path}?e=${encodeURIComponent(email)}&t=${encodeURIComponent(token)}`,
        { method: "POST" },
      );
      if (!res.ok) throw new Error();
      setState("done");
    } catch {
      setState("error");
    }
  };

  return (
    <Box maxW="480px" mx="auto" py={16} px={4} textAlign="center">
      <Heading size="lg" color="text" mb={3}>{copy.title}</Heading>

      {!email || !token ? (
        <Text color="fg.muted">This link looks incomplete. Please use the link in your email.</Text>
      ) : state === "done" ? (
        <>
          <Text color="text" mb={6} role="status">{copy.done}</Text>
          <Button asChild colorPalette="brand" borderRadius="full">
            <Link href="/">Back to PerchRole</Link>
          </Button>
        </>
      ) : (
        <>
          <Text color="fg.muted" mb={6}>{copy.body}</Text>
          {state === "error" && (
            <Text color="text" fontSize="sm" mb={4} role="alert">
              That link didn't work. It may be invalid, so try the link in your latest email.
            </Text>
          )}
          <Button colorPalette="brand" borderRadius="full" loading={state === "loading"} onClick={submit}>
            {copy.button}
          </Button>
        </>
      )}
    </Box>
  );
}