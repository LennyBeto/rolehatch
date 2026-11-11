// frontend/app/dashboard/newsletter/page.tsx
"use client";
import { Box, Heading, Text, Input, Textarea, Button, Stack, Field, Badge, Flex } from "@chakra-ui/react";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { authedFetch } from "@/lib/api";
import { toaster } from "@/components/ui/toaster";

type Slot = {
  id: string;
  headline: string;
  blurb: string;
  link_url: string;
  status: "pending" | "approved" | "sent" | "rejected";
  created_at: string | null;
};

type MySlots = { has_access: boolean; limit: number; used: number; slots: Slot[] };

const STATUS_LABEL: Record<Slot["status"], string> = {
  pending: "In review",
  approved: "Approved, goes out in the next issue",
  sent: "Sent",
  rejected: "Not approved",
};

export default function NewsletterSlotPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<MySlots | null>(null);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [headline, setHeadline] = useState("");
  const [blurb, setBlurb] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

  const load = useCallback(async () => {
    try {
      const res = await authedFetch("/api/newsletter/slots/mine");
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      setFailed(true);
      toaster.create({ title: "Couldn't load your newsletter feature", type: "error" });
    }
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await authedFetch("/api/newsletter/slots", {
        method: "POST",
        body: JSON.stringify({ headline, blurb, link_url: linkUrl }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const detail = body?.detail;
        throw new Error(Array.isArray(detail) ? detail[0]?.msg : detail || "Couldn't submit");
      }
      toaster.create({
        title: "Submitted for review",
        description: "We'll include it in an upcoming issue once approved.",
        type: "success",
      });
      setHeadline("");
      setBlurb("");
      setLinkUrl("");
      await load();
    } catch (err) {
      toaster.create({
        title: "Couldn't submit",
        description: err instanceof Error ? err.message : "Please check your details and try again.",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) return null;

  if (failed || !data) {
    return (
      <Box maxW="600px" mx="auto" py={12} px={4}>
        <Text color="fg.muted">{failed ? "Something went wrong. Please refresh." : "Loading…"}</Text>
      </Box>
    );
  }

  if (!data.has_access) {
    return (
      <Box maxW="600px" mx="auto" py={12} px={4}>
        <Heading size="lg" color="text" mb={2}>Newsletter feature</Heading>
        <Text color="fg.muted" mb={6}>
          Being featured in the PerchRole newsletter is included with the Enterprise plan.
        </Text>
        <Button asChild colorPalette="brand" borderRadius="full">
          <Link href="/pricing">See plans</Link>
        </Button>
      </Box>
    );
  }

  const quotaReached = data.used >= data.limit;

  return (
    <Box maxW="600px" mx="auto" py={12} px={4}>
      <Heading size="lg" color="text" mb={1}>Newsletter feature</Heading>
      <Text color="fg.muted" mb={6}>
        Get your company in front of PerchRole subscribers. Every submission is reviewed before it goes
        out and is labelled Sponsored. You've used {data.used} of {data.limit} this month.
      </Text>

      {quotaReached ? (
        <Text color="text" mb={8}>You've used this month's feature. You can submit another next month.</Text>
      ) : (
        <Box as="form" onSubmit={handleSubmit} mb={10}>
          <Stack gap={5}>
            <Field.Root>
              <Field.Label>Headline</Field.Label>
              <Input value={headline} maxLength={80} required onChange={(e) => setHeadline(e.target.value)} />
              <Field.HelperText>{headline.length}/80</Field.HelperText>
            </Field.Root>
            <Field.Root>
              <Field.Label>Short description</Field.Label>
              <Textarea value={blurb} maxLength={300} rows={4} required onChange={(e) => setBlurb(e.target.value)} />
              <Field.HelperText>{blurb.length}/300</Field.HelperText>
            </Field.Root>
            <Field.Root>
              <Field.Label>Link</Field.Label>
              <Input
                type="url"
                value={linkUrl}
                required
                placeholder="https://yourcompany.com/careers"
                onChange={(e) => setLinkUrl(e.target.value)}
              />
            </Field.Root>
            <Button type="submit" colorPalette="brand" size="lg" loading={saving}>
              Submit for review
            </Button>
          </Stack>
        </Box>
      )}

      {data.slots.length > 0 && (
        <Stack gap={3}>
          <Heading size="sm" color="text">Your submissions</Heading>
          {data.slots.map((s) => (
            <Box key={s.id} bg="surface" border="1px solid" borderColor="line" borderRadius="md" p={4}>
              <Flex justify="space-between" align="flex-start" gap={3} wrap="wrap">
                <Text fontWeight="600" color="text">{s.headline}</Text>
                <Badge
                  colorPalette={s.status === "approved" || s.status === "sent" ? "brand" : "gray"}
                  variant="subtle"
                >
                  {STATUS_LABEL[s.status]}
                </Badge>
              </Flex>
              <Text fontSize="sm" color="fg.muted" mt={1}>{s.blurb}</Text>
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
}