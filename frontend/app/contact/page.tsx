// frontend/app/contact/page.tsx
"use client";
import { Box, Heading, Text, Input, Textarea, Button, Stack } from "@chakra-ui/react";
import { useState } from "react";
import { toaster } from "@/components/ui/toaster";

export default function ContactPage() {
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, subject, message }),
      });
      if (!res.ok) throw new Error();
      toaster.create({ title: "Message sent", description: "We'll get back to you soon.", type: "success" });
      setEmail(""); setSubject(""); setMessage("");
    } catch {
      toaster.create({ title: "Couldn't send message", description: "Please try again.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box maxW="600px" mx="auto" px={4} py={12}>
      <Heading size="lg" color="text" mb={1}>Contact Support</Heading>
      <Text color="gray.600" mb={8}>
        Questions, feedback, or issues with a listing — we read every message.
      </Text>

      <Box as="form" onSubmit={handleSubmit}>
        <Stack gap={4}>
          <Input
            placeholder="Your email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
          />
          <Textarea
            placeholder="How can we help?"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            required
          />
          <Button type="submit" colorPalette="brand" size="lg" loading={submitting}>
            Send Message
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}