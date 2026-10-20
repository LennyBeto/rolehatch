// frontend/app/post-job/page.tsx
"use client";
import {
  Box, Heading, Text, Input, Button, Stack, Select, Portal,
  createListCollection,
} from "@chakra-ui/react";
import { LuChevronDown } from "react-icons/lu";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { useNotifications } from "@/lib/NotificationContext";
import { authedFetch } from "@/lib/api";
import { toaster } from "@/components/ui/toaster";

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

const labelStyle = {
  fontSize: "sm",
  fontWeight: "600",
  color: "text",
  mb: 1.5,
} as const;

export default function PostJobPage() {
  const { user, loading } = useAuth();
  const { addNotification } = useNotifications();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const [companyName, setCompanyName] = useState("");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [remoteType, setRemoteType] = useState<string[]>([]);
  const [commitment, setCommitment] = useState<string[]>([]);
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [applyUrl, setApplyUrl] = useState("");

  useEffect(() => {
    if (loading || user) return;

    const timeoutId = setTimeout(() => {
      toaster.create({ title: "Please sign in to post a job", type: "info" });
      router.push("/");
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [loading, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await authedFetch("/api/employer/jobs", {
        method: "POST",
        body: JSON.stringify({
          company_name: companyName,
          title,
          location: location || null,
          remote_type: remoteType[0] || null,
          commitment: commitment[0] || null,
          salary_min: salaryMin ? Number(salaryMin) : null,
          salary_max: salaryMax ? Number(salaryMax) : null,
          apply_url: applyUrl,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail?.[0]?.msg || err?.detail || "Failed to post job");
      }
      toaster.create({ title: "Job posted!", description: "Your listing is now live.", type: "success" });
      addNotification(`"${title}" is now live on PerchRole.`);
      router.push("/dashboard");
    } catch (err) {
      toaster.create({
        title: "Couldn't post job",
        description: err instanceof Error ? err.message : "Please check your details and try again.",
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user) return null;

  return (
    <Box maxW="600px" mx="auto" py={{ base: 8, md: 12 }} px={4}>
      <Heading size="lg" color="text" mb={1}>Post a Job</Heading>
      <Text color="gray.600" mb={6}>
        Free to post. Sign in with your company email — your listing is tied to its domain,
        so personal addresses (Gmail, Outlook, Yahoo, etc.) can't post.
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
              <Text {...labelStyle}>Company name</Text>
              <Input
                placeholder="Company name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                size="lg"
                {...fieldStyle}
              />
            </Box>

            <Box as="label" display="block">
              <Text {...labelStyle}>Job title</Text>
              <Input
                placeholder="Job title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                size="lg"
                {...fieldStyle}
              />
            </Box>

            <Box as="label" display="block">
              <Text {...labelStyle}>Location</Text>
              <Input
                placeholder="Location (e.g. San Francisco, CA)"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                size="lg"
                {...fieldStyle}
              />
            </Box>

            <Select.Root
              collection={REMOTE_TYPES}
              value={remoteType}
              onValueChange={(e) => setRemoteType(e.value)}
              size="lg"
            >
              <Select.Label {...labelStyle}>Work environment</Select.Label>
              <Select.Control>
                <Select.Trigger {...fieldStyle}>
                  <Select.ValueText placeholder="Work environment" />
                  <Select.IndicatorGroup>
                    <Select.Indicator><LuChevronDown /></Select.Indicator>
                  </Select.IndicatorGroup>
                </Select.Trigger>
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

            <Select.Root
              collection={COMMITMENTS}
              value={commitment}
              onValueChange={(e) => setCommitment(e.value)}
              size="lg"
            >
              <Select.Label {...labelStyle}>Commitment type</Select.Label>
              <Select.Control>
                <Select.Trigger {...fieldStyle}>
                  <Select.ValueText placeholder="Commitment type" />
                  <Select.IndicatorGroup>
                    <Select.Indicator><LuChevronDown /></Select.Indicator>
                  </Select.IndicatorGroup>
                </Select.Trigger>
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
              <Box as="label" display="block" flex={1} minW={0}>
                <Text {...labelStyle}>Min salary</Text>
                <Input
                  placeholder="Min salary ($k)"
                  type="number"
                  value={salaryMin}
                  onChange={(e) => setSalaryMin(e.target.value)}
                  size="lg"
                  {...fieldStyle}
                />
              </Box>
              <Box as="label" display="block" flex={1} minW={0}>
                <Text {...labelStyle}>Max salary</Text>
                <Input
                  placeholder="Max salary ($k)"
                  type="number"
                  value={salaryMax}
                  onChange={(e) => setSalaryMax(e.target.value)}
                  size="lg"
                  {...fieldStyle}
                />
              </Box>
            </Stack>

            <Box as="label" display="block">
              <Text {...labelStyle}>Application URL</Text>
              <Input
                placeholder="Application URL (where candidates apply)"
                type="url"
                value={applyUrl}
                onChange={(e) => setApplyUrl(e.target.value)}
                required
                size="lg"
                {...fieldStyle}
              />
            </Box>

            <Button type="submit" colorPalette="brand" size="lg" loading={submitting}>
              Post Job — Free
            </Button>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}