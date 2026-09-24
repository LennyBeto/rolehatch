// frontend/app/applicant-profile/page.tsx
"use client";
import { Box, Heading, Text, Input, Button, Stack, Checkbox } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { upsertApplicantProfile, getMyApplicantProfile } from "@/lib/api";
import { toaster } from "@/components/ui/toaster";
import MyApplicationsTable from "@/components/MyApplicationsTable";

export default function ApplicantProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [cv, setCv] = useState<File | null>(null);
  const [existingCvName, setExistingCvName] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    getMyApplicantProfile()
      .then((res) => (res.ok ? res.json() : null))
      .then((profile) => {
        if (!profile) return;
        setFirstName(profile.first_name);
        setLastName(profile.last_name);
        setJobTitle(profile.job_title);
        setIsPublic(profile.is_public);
        setExistingCvName(profile.cv_filename);
      })
      .catch(() => {});
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await upsertApplicantProfile({ firstName, lastName, jobTitle, isPublic, cv });
      if (!res.ok) throw new Error();
      toaster.create({ title: "Profile saved", type: "success" });
    } catch {
      toaster.create({
        title: "Couldn't save profile",
        description: "Please check your details and try again.",
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user) return null;

    return (
    <Box maxW="700px" mx="auto" py={12} px={4}>
      <Heading size="lg" color="text" mb={1}>Your Applicant Profile</Heading>
      <Text color="gray.600" mb={8}>
        Register your profile so employers can find and view you directly.
      </Text>

      <Box as="form" onSubmit={handleSubmit}>
        <Stack gap={4}>
          <Input placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          <Input placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          <Input
            placeholder="Job title you're applying for"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            required
          />

          <Box>
            <Text fontSize="sm" color="gray.600" mb={2}>
              {existingCvName ? `Current CV: ${existingCvName}` : "Upload your CV (PDF or Word, max 5MB)"}
            </Text>
            <Input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => setCv(e.target.files?.[0] ?? null)}
              p={1}
            />
          </Box>

          <Checkbox.Root checked={isPublic} onCheckedChange={(e) => setIsPublic(!!e.checked)}>
            <Checkbox.HiddenInput />
            <Checkbox.Control />
            <Checkbox.Label>Make my profile visible to employers</Checkbox.Label>
          </Checkbox.Root>

          <Button type="submit" colorPalette="brand" size="lg" loading={submitting}>
            Save Profile
          </Button>
        </Stack>
      </Box>

      <MyApplicationsTable />
    </Box>
  );
}