// frontend/app/post-job/page.tsx
"use client";
import {
  Box, Heading, Text, Input, Button, Stack, Select, Portal,
  createListCollection,
} from "@chakra-ui/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
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

export default function PostJobPage() {
  const { user, loading } = useAuth();
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
    if (!loading && !user) {
      toaster.create({ title: "Please sign in to post a job", type: "info" });
      const timeoutId = setTimeout(() => {
        router.push("/");
      }, 0);
      return () => clearTimeout(timeoutId);
    }
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
    <Box maxW="600px" mx="auto" py={12} px={4}>
      <Heading size="lg" color="text" mb={1}>Post a Job</Heading>
      <Text color="gray.600" mb={8}>
        Free to post. Your listing is tied to your account's email domain.
      </Text>

      <Box as="form" onSubmit={handleSubmit}>
        <Stack gap={4}>
          <Input placeholder="Company name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
          <Input placeholder="Job title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <Input placeholder="Location (e.g. San Francisco, CA)" value={location} onChange={(e) => setLocation(e.target.value)} />

          <Select.Root collection={REMOTE_TYPES} value={remoteType} onValueChange={(e) => setRemoteType(e.value)}>
            <Select.Control>
              <Select.Trigger><Select.ValueText placeholder="Work environment" /></Select.Trigger>
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

          <Select.Root collection={COMMITMENTS} value={commitment} onValueChange={(e) => setCommitment(e.value)}>
            <Select.Control>
              <Select.Trigger><Select.ValueText placeholder="Commitment type" /></Select.Trigger>
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
            <Input placeholder="Min salary ($k)" type="number" value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} />
            <Input placeholder="Max salary ($k)" type="number" value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)} />
          </Stack>

          <Input
            placeholder="Application URL (where candidates apply)"
            type="url"
            value={applyUrl}
            onChange={(e) => setApplyUrl(e.target.value)}
            required
          />

          <Button type="submit" colorPalette="brand" size="lg" loading={submitting}>
            Post Job — Free
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}