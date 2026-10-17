// frontend/components/JobAlertForm.tsx
"use client";
import { Box, Heading, Text, Input, Button, Flex, Select, Portal, createListCollection } from "@chakra-ui/react";
import { useState } from "react";
import { toaster } from "@/components/ui/toaster";

const FREQUENCIES = createListCollection({
  items: [
    { label: "Daily", value: "daily" },
    { label: "Weekly", value: "weekly" },
  ],
});

const linkStyles = {
  as: "button" as const,
  type: "button" as const,
  fontSize: "sm",
  fontWeight: "500",
  color: "brand.fg",
  textDecoration: "underline",
  textUnderlineOffset: "3px",
  cursor: "pointer",
  borderRadius: "sm",
  minH: "44px",
  px: 1,
  _hover: { color: "brand.600" },
  _focusVisible: { outline: "2px solid", outlineColor: "brand.500", outlineOffset: "2px" },
};

export default function JobAlertForm() {
  const [mode, setMode] = useState<"subscribe" | "unsubscribe">("subscribe");
  const [email, setEmail] = useState("");
  const [keyword, setKeyword] = useState("");
  const [frequency, setFrequency] = useState<string[]>(["daily"]);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/job-alerts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, keyword: keyword || null, frequency: frequency[0] }),
      });
      if (!res.ok) throw new Error();
      toaster.create({ title: "You're subscribed!", description: "We'll email you matching jobs.", type: "success" });
      setEmail("");
      setKeyword("");
    } catch {
      toaster.create({ title: "Couldn't subscribe", description: "Please check your email and try again.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnsubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/job-alerts/unsubscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error();
      toaster.create({ title: "You're unsubscribed", description: "You won't get any more job alert emails.", type: "success" });
      setEmail("");
      setMode("subscribe");
    } catch {
      toaster.create({ title: "Couldn't unsubscribe", description: "Please check your email and try again.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const isUnsub = mode === "unsubscribe";

  return (
    <Box
      bg="surface"
      p={{ base: 4, md: 6 }}
      borderRadius="lg"
      border="1px solid #E5E3DD"
      maxW="700px"
      mx={{ base: 4, md: "auto" }}
      my={10}
    >
      <Heading size="md" color="text" mb={1}>
        {isUnsub ? "Unsubscribe from job alerts" : "Never miss a matching role"}
      </Heading>
      <Text color="gray.600" fontSize="sm" mb={4}>
        {isUnsub
          ? "Enter the email you subscribed with and we'll stop sending alerts."
          : "Get new jobs emailed to you as soon as they're posted — free, unsubscribe anytime."}
      </Text>

      {isUnsub ? (
        <Box as="form" onSubmit={handleUnsubscribe}>
          <Flex direction={{ base: "column", md: "row" }} gap={3} w="full">
            <Input
              placeholder="you@email.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              minH="48px"
              flex={{ base: "none", md: 1 }}
              minW={0}
              w={{ base: "full", md: "auto" }}
            />
            <Button
              type="submit"
              colorPalette="brand"
              loading={submitting}
              minH="48px"
              flexShrink={0}
              w={{ base: "full", md: "auto" }}
            >
              Unsubscribe
            </Button>
          </Flex>
          <Box mt={2}>
            <Box {...linkStyles} onClick={() => setMode("subscribe")}>
              Back to subscribe
            </Box>
          </Box>
        </Box>
      ) : (
        <Box as="form" onSubmit={handleSubmit}>
          <Flex direction={{ base: "column", md: "row" }} gap={3} w="full">
            {/* flex ratios apply only in row mode (md+). In column mode they collapse the height. */}
            <Input
              placeholder="you@email.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              minH="48px"
              flex={{ base: "none", md: 2 }}
              minW={0}
              w={{ base: "full", md: "auto" }}
            />
            <Input
              placeholder="Keyword (optional)"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              minH="48px"
              flex={{ base: "none", md: 2 }}
              minW={0}
              w={{ base: "full", md: "auto" }}
            />
            <Select.Root
              collection={FREQUENCIES}
              value={frequency}
              onValueChange={(e) => setFrequency(e.value)}
              flex={{ base: "none", md: 1 }}
              minW={0}
              w={{ base: "full", md: "auto" }}
            >
              <Select.Control>
                <Select.Trigger minH="48px">
                  <Select.ValueText />
                </Select.Trigger>
              </Select.Control>
              <Portal>
                <Select.Positioner>
                  <Select.Content>
                    {FREQUENCIES.items.map((item) => (
                      <Select.Item key={item.value} item={item}>{item.label}</Select.Item>
                    ))}
                  </Select.Content>
                </Select.Positioner>
              </Portal>
            </Select.Root>
            <Button
              type="submit"
              colorPalette="brand"
              loading={submitting}
              minH="48px"
              flexShrink={0}
              w={{ base: "full", md: "auto" }}
            >
              Subscribe
            </Button>
          </Flex>
          <Flex mt={2} align="center" wrap="wrap" columnGap={1}>
            <Text as="span" fontSize="sm" color="gray.600">Already subscribed?</Text>
            <Box {...linkStyles} onClick={() => setMode("unsubscribe")}>
              Unsubscribe
            </Box>
          </Flex>
        </Box>
      )}
    </Box>
  );
}