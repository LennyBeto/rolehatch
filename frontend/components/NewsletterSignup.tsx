// frontend/components/NewsletterSignup.tsx
"use client";
import { Box, Heading, Text, Input, Button, Flex } from "@chakra-ui/react";
import { useState } from "react";
import { toaster } from "@/components/ui/toaster";

export default function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/newsletter/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error();
      setSent(true);
      setEmail("");
    } catch {
      toaster.create({
        title: "Couldn't subscribe",
        description: "Please check your email and try again.",
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      bg="surface"
      p={6}
      borderRadius="lg"
      border="1px solid"
      borderColor="line"
      maxW="700px"
      mx={{ base: 4, md: "auto" }}
      my={10}
    >
      <Heading size="md" color="text" mb={1}>The PerchRole newsletter</Heading>
      <Text color="fg.muted" fontSize="sm" mb={4}>
        Fresh tech roles in your inbox, plus featured hiring partners. Free, unsubscribe anytime.
      </Text>

      {sent ? (
        <Text color="text" fontSize="sm" role="status">
          Check your inbox and tap the confirmation link to finish subscribing.
        </Text>
      ) : (
        <Box as="form" onSubmit={handleSubmit}>
          <Flex direction={{ base: "column", sm: "row" }} gap={3}>
            <Input
              placeholder="you@email.com"
              type="email"
              aria-label="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              flex={1}
            />
            <Button type="submit" colorPalette="brand" loading={submitting} flexShrink={0}>
              Subscribe
            </Button>
          </Flex>
        </Box>
      )}
    </Box>
  );
}