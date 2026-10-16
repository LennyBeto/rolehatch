// frontend/app/contact/page.tsx
"use client";
import { Box, Heading, Text, Input, Textarea, Button, Stack } from "@chakra-ui/react";
import { useState } from "react";
import { toaster } from "@/components/ui/toaster";

// Shared field styling: visible border, inset background, clear hover/focus states
const fieldStyle = {
  bg: "background",
  color: "text",
  border: "1px solid",
  borderColor: "brand.border",
  borderRadius: "md",
  px: 4,
  transition: "border-color 0.15s ease, box-shadow 0.15s ease",
  _motionReduce: { transition: "none" },
  _placeholder: { color: "gray.500" },
  _hover: { borderColor: "brand.400" },
  _focusVisible: {
    outline: "none",
    borderColor: "brand.focusRing",
    boxShadow: "0 0 0 1px {colors.brand.focusRing}",
  },
} as const;

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
    <Box maxW="600px" mx="auto" px={4} py={{ base: 8, md: 12 }}>
      <Heading size="lg" color="text" mb={1}>Contact Support</Heading>
      <Text color="gray.600" mb={6}>
        Questions, feedback, or issues with a listing — we read every message.
      </Text>

      <Box
        bg="surface"
        border="1px solid"
        borderColor="line"
        borderRadius="xl"
        boxShadow="0 4px 20px rgba(0,0,0,0.06)"
        p={{ base: 4, md: 6 }}
      >
        <Box as="form" onSubmit={handleSubmit}>
          <Stack gap={5}>
            <Box as="label" display="block">
              <Text fontSize="sm" fontWeight="600" color="text" mb={1.5}>Email</Text>
              <Input
                placeholder="you@email.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                size="lg"
                {...fieldStyle}
              />
            </Box>

            <Box as="label" display="block">
              <Text fontSize="sm" fontWeight="600" color="text" mb={1.5}>Subject</Text>
              <Input
                placeholder="What is this about?"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                size="lg"
                {...fieldStyle}
              />
            </Box>

            <Box as="label" display="block">
              <Text fontSize="sm" fontWeight="600" color="text" mb={1.5}>Message</Text>
              <Textarea
                placeholder="How can we help?"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                required
                resize="vertical"
                py={3}
                {...fieldStyle}
              />
            </Box>

            <Button type="submit" colorPalette="brand" size="lg" loading={submitting}>
              Send Message
            </Button>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}