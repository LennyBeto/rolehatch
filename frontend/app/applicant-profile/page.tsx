// frontend/app/applicant-profile/page.tsx
"use client";
import { Box, Heading, Text, Input, Button, Stack, Checkbox, Textarea, HStack, Badge, List } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import {
  getApplicantProfile, updateApplicantProfile, uploadApplicantCV, scanApplicantCV,
  type ApplicantProfile,
} from "@/lib/api";
import { toaster } from "@/components/ui/toaster";
import MyApplicationsTable from "@/components/MyApplicationsTable";

type ScanResult = {
  overall_score: number;
  breakdown: Record<string, number>;
  suggestions: string[];
};

export default function ApplicantProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [scanning, setScanning] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  const [resumeMode, setResumeMode] = useState<"file" | "paste">("file");
  const [cv, setCv] = useState<File | null>(null);
  const [pastedResume, setPastedResume] = useState("");

  const [existingCvName, setExistingCvName] = useState<string | null>(null);
  const [atsScore, setAtsScore] = useState<number | null>(null);
  const [hasMatchScore, setHasMatchScore] = useState(false);
  const [lastScanResult, setLastScanResult] = useState<ScanResult | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    getApplicantProfile()
      .then((res: Response) => (res.ok ? res.json() : null))
      .then((profile: ApplicantProfile | null) => {
        if (!profile) return;

        const fullName = profile.full_name ?? "";
        const parts = fullName.trim().split(/\s+/);
        setFirstName(parts[0] ?? "");
        setLastName(parts.slice(1).join(" "));
        setJobTitle(profile.expertise ?? "");
        setIsPublic(profile.is_public);
        setExistingCvName(profile.cv_filename ?? null);
        setAtsScore(profile.last_ats_score ?? null);
        setHasMatchScore(profile.has_match_score);
      })
      .catch(() => {});
  }, [user]);

  const runScan = async () => {
    setScanning(true);
    try {
      const res = await scanApplicantCV();
      if (!res.ok) throw new Error();
      const result: ScanResult = await res.json();
      setLastScanResult(result);
      setAtsScore(result.overall_score);
      setHasMatchScore(true);
      toaster.create({ title: "Resume scanned", description: "Job matches are now sorted by fit.", type: "success" });
    } catch {
      toaster.create({ title: "Couldn't scan your resume", type: "error" });
    } finally {
      setScanning(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let res = await updateApplicantProfile({
        full_name: [firstName, lastName].filter(Boolean).join(" ").trim() || undefined,
        expertise: jobTitle || undefined,
        is_public: isPublic,
      });

      if (!res.ok) throw new Error();

      let uploadedResume = false;

      if (resumeMode === "file" && cv) {
        res = await uploadApplicantCV(cv);
        if (!res.ok) throw new Error();
        setExistingCvName(cv.name);
        uploadedResume = true;
      } else if (resumeMode === "paste" && pastedResume.trim().length >= 50) {
        const pastedFile = new File([pastedResume], "resume.txt", { type: "text/plain" });
        res = await uploadApplicantCV(pastedFile);
        if (!res.ok) throw new Error();
        setExistingCvName("resume.txt");
        uploadedResume = true;
      }

      toaster.create({ title: "Profile saved", type: "success" });

      // Auto-scan right after a successful upload/paste — this is what
      // populates last_ats_score and the match-scoring embedding, and
      // nothing else in the app currently triggers a scan.
      if (uploadedResume) {
        await runScan();
      }
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

  const hasResumeOnFile = Boolean(existingCvName);

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
            <HStack mb={2} gap={2}>
              <Button
                size="xs"
                variant={resumeMode === "file" ? "solid" : "outline"}
                colorPalette="brand"
                onClick={() => setResumeMode("file")}
              >
                Upload File
              </Button>
              <Button
                size="xs"
                variant={resumeMode === "paste" ? "solid" : "outline"}
                colorPalette="brand"
                onClick={() => setResumeMode("paste")}
              >
                Paste Text
              </Button>
            </HStack>

            {resumeMode === "file" ? (
              <>
                <Text fontSize="sm" color="gray.600" mb={2}>
                  {existingCvName ? `Current CV: ${existingCvName}` : "Upload your CV (PDF or Word, max 5MB)"}
                </Text>
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setCv(e.target.files?.[0] ?? null)}
                  p={1}
                />
              </>
            ) : (
              <>
                <Text fontSize="sm" color="gray.600" mb={2}>
                  Paste your resume text below (minimum 50 characters)
                </Text>
                <Textarea
                  placeholder="Paste your resume text here..."
                  value={pastedResume}
                  onChange={(e) => setPastedResume(e.target.value)}
                  rows={10}
                />
              </>
            )}
          </Box>

          <Checkbox.Root checked={isPublic} onCheckedChange={(e) => setIsPublic(!!e.checked)}>
            <Checkbox.HiddenInput />
            <Checkbox.Control />
            <Checkbox.Label>Make my profile visible to employers</Checkbox.Label>
          </Checkbox.Root>

          <Button type="submit" colorPalette="brand" size="lg" loading={submitting || scanning}>
            Save Profile
          </Button>
        </Stack>
      </Box>

      {hasResumeOnFile && (
        <Box mt={10} pt={8} borderTop="1px solid #E5E3DD">
          <HStack justify="space-between" mb={3}>
            <Heading size="md" color="text">My Resume</Heading>
            <Button size="sm" variant="outline" colorPalette="brand" loading={scanning} onClick={runScan}>
              Re-check Match Score
            </Button>
          </HStack>

          <Text fontSize="sm" color="gray.600" mb={3}>{existingCvName}</Text>

          <HStack gap={3} mb={4} flexWrap="wrap">
            {atsScore !== null && (
              <Badge colorPalette="brand" variant="subtle" px={3} py={1} borderRadius="full">
                ATS Score: {atsScore}/100
              </Badge>
            )}
            <Badge
              colorPalette={hasMatchScore ? "green" : "gray"}
              variant="subtle"
              px={3}
              py={1}
              borderRadius="full"
            >
              {hasMatchScore
                ? "Match scoring is live — jobs will show your fit %"
                : "Run a check to enable job match scoring"}
            </Badge>
          </HStack>

          {lastScanResult && (
            <Box bg="surface" p={4} borderRadius="md" border="1px solid #E5E3DD">
              <Text fontSize="sm" fontWeight="600" mb={2}>Suggestions</Text>
              <List.Root fontSize="sm" gap={1} ps={4}>
                {lastScanResult.suggestions.map((s, i) => (
                  <List.Item key={i}>{s}</List.Item>
                ))}
              </List.Root>
            </Box>
          )}
        </Box>
      )}

      <MyApplicationsTable />
    </Box>
  );
}