// frontend/app/dashboard/company/page.tsx
"use client";
import {
  Box, Heading, Text, Input, Textarea, Button, Stack, Field, Select, Portal,
  createListCollection,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { authedFetch } from "@/lib/api";
import { toaster } from "@/components/ui/toaster";

const SIZES = createListCollection({
  items: [
    { label: "Not specified", value: "" },
    { label: "1–10 people", value: "1-10" },
    { label: "11–50 people", value: "11-50" },
    { label: "51–200 people", value: "51-200" },
    { label: "201–1,000 people", value: "201-1000" },
    { label: "1,000+ people", value: "1000+" },
  ],
});

type MyCompany = {
  domain: string;
  company_exists: boolean;
  company_name: string | null;
  has_access: boolean;
  profile: {
    tagline: string | null;
    about: string | null;
    website_url: string | null;
    careers_url: string | null;
    headquarters: string | null;
    company_size: string | null;
  };
};

export default function EditCompanyPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [meta, setMeta] = useState<MyCompany | null>(null);
  const [saving, setSaving] = useState(false);

  const [tagline, setTagline] = useState("");
  const [about, setAbout] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [careersUrl, setCareersUrl] = useState("");
  const [headquarters, setHeadquarters] = useState("");
  const [size, setSize] = useState<string[]>([""]);

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    authedFetch("/api/companies/me/profile")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then((data: MyCompany) => {
        setMeta(data);
        setTagline(data.profile.tagline ?? "");
        setAbout(data.profile.about ?? "");
        setWebsiteUrl(data.profile.website_url ?? "");
        setCareersUrl(data.profile.careers_url ?? "");
        setHeadquarters(data.profile.headquarters ?? "");
        setSize([data.profile.company_size ?? ""]);
        setStatus("ready");
      })
      .catch(() => {
        setStatus("error");
        toaster.create({ title: "Couldn't load your company page", type: "error" });
      });
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await authedFetch("/api/companies/me/profile", {
        method: "PATCH",
        body: JSON.stringify({
          tagline,
          about,
          website_url: websiteUrl,
          careers_url: careersUrl,
          headquarters,
          company_size: size[0] || "",
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const detail = body?.detail;
        throw new Error(Array.isArray(detail) ? detail[0]?.msg : detail || "Couldn't save");
      }
      toaster.create({
        title: "Company page saved",
        description: "Changes can take a few minutes to appear publicly.",
        type: "success",
      });
    } catch (err) {
      toaster.create({
        title: "Couldn't save company page",
        description: err instanceof Error ? err.message : "Please check your details and try again.",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user || status === "loading") return null;

  if (status === "error" || !meta) {
    return (
      <Box maxW="600px" mx="auto" py={12} px={4}>
        <Text color="fg.muted">Something went wrong loading this page. Please refresh.</Text>
      </Box>
    );
  }

  if (!meta.has_access) {
    return (
      <Box maxW="600px" mx="auto" py={12} px={4}>
        <Heading size="lg" color="text" mb={2}>Company page</Heading>
        <Text color="fg.muted" mb={6}>
          Your own company page, with your story, links and open roles, is included with the Enterprise plan.
        </Text>
        <Button asChild colorPalette="brand" borderRadius="full">
          <Link href="/pricing">See plans</Link>
        </Button>
      </Box>
    );
  }

  if (!meta.company_exists) {
    return (
      <Box maxW="600px" mx="auto" py={12} px={4}>
        <Heading size="lg" color="text" mb={2}>Company page</Heading>
        <Text color="fg.muted" mb={6}>
          Post your first job and PerchRole will create your company page automatically.
        </Text>
        <Button asChild colorPalette="brand" borderRadius="full">
          <Link href="/post-job">Post a job</Link>
        </Button>
      </Box>
    );
  }

  return (
    <Box maxW="600px" mx="auto" py={12} px={4}>
      <Heading size="lg" color="text" mb={1}>Company page</Heading>
      <Text color="fg.muted" mb={2}>
        This is what candidates see on your PerchRole page for {meta.company_name}.
      </Text>
      <Button asChild variant="outline" colorPalette="brand" size="sm" borderRadius="full" mb={8}>
        <Link href={`/companies/${meta.domain}`}>View public page</Link>
      </Button>

      <Box as="form" onSubmit={handleSubmit}>
        <Stack gap={5}>
          <Field.Root>
            <Field.Label>Tagline</Field.Label>
            <Input
              value={tagline}
              maxLength={160}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="One line about what you do"
            />
            <Field.HelperText>{tagline.length}/160</Field.HelperText>
          </Field.Root>

          <Field.Root>
            <Field.Label>About</Field.Label>
            <Textarea
              value={about}
              maxLength={2000}
              rows={7}
              onChange={(e) => setAbout(e.target.value)}
              placeholder="Your story, mission and what it's like to work with you"
            />
            <Field.HelperText>{about.length}/2000</Field.HelperText>
          </Field.Root>

          <Field.Root>
            <Field.Label>Website</Field.Label>
            <Input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://yourcompany.com"
            />
          </Field.Root>

          <Field.Root>
            <Field.Label>Careers page</Field.Label>
            <Input
              type="url"
              value={careersUrl}
              onChange={(e) => setCareersUrl(e.target.value)}
              placeholder="https://yourcompany.com/careers"
            />
          </Field.Root>

          <Field.Root>
            <Field.Label>Headquarters</Field.Label>
            <Input
              value={headquarters}
              maxLength={120}
              onChange={(e) => setHeadquarters(e.target.value)}
              placeholder="Nairobi, Kenya"
            />
          </Field.Root>

          <Select.Root collection={SIZES} value={size} onValueChange={(e) => setSize(e.value)}>
            <Select.Label>Company size</Select.Label>
            <Select.Control>
              <Select.Trigger><Select.ValueText placeholder="Not specified" /></Select.Trigger>
            </Select.Control>
            <Portal>
              <Select.Positioner>
                <Select.Content>
                  {SIZES.items.map((item) => (
                    <Select.Item key={item.value} item={item}>{item.label}</Select.Item>
                  ))}
                </Select.Content>
              </Select.Positioner>
            </Portal>
          </Select.Root>

          <Button type="submit" colorPalette="brand" size="lg" loading={saving}>
            Save company page
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}