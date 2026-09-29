// frontend/app/applicant/dashboard/page.tsx
"use client";
import { Box, Heading, Text, Stack, Badge, Button, HStack, Center, Spinner } from "@chakra-ui/react";
import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { authedFetch, saveJob, markApplied, hideJob, getApplicantProfile, ApplicantProfile } from "@/lib/api";
import { toaster } from "@/components/ui/toaster";
import ApplicantProfileCard from "@/components/ApplicantProfileCard";
import CVUploadSection from "@/components/CVUploadSection";
import ApplicantSummaryCard from "@/components/ApplicantSummaryCard";
import ProfileManagementCard from "@/components/ProfileManagementCard"; // NEW

type SavedJobEntry = {
  id: string;
  user_id: string;
  job_id: string;
  status: "saved" | "applied" | "hidden";
  created_at: string;
};

type JobDetail = {
  id: string;
  title: string;
  location: string | null;
  company_name: string | null;
  source_url: string;
  remote_type: string | null;
};

type EnrichedEntry = SavedJobEntry & { job: JobDetail | null };

const TABS: { key: SavedJobEntry["status"]; label: string }[] = [
  { key: "saved", label: "Saved" },
  { key: "applied", label: "Applied" },
  { key: "hidden", label: "Hidden" },
];

export default function ApplicantDashboard() {
  const { user, loading } = useAuth();
  const userId = user?.id ?? null;
  const router = useRouter();
  const [entries, setEntries] = useState<EnrichedEntry[]>([]);
  const [fetching, setFetching] = useState(true);
  const [activeTab, setActiveTab] = useState<SavedJobEntry["status"]>("saved");

  const [profileLoading, setProfileLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [expertise, setExpertise] = useState<string[]>([]);
  const [avatarId, setAvatarId] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [cvFilename, setCvFilename] = useState<string | null>(null);
  const [hasMatchScore, setHasMatchScore] = useState(false);

  const profileInFlightRef = useRef(false);
  const savedJobsInFlightRef = useRef(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

  const loadProfile = useCallback(async () => {
    if (!userId || profileInFlightRef.current) return;
    profileInFlightRef.current = true;
    setProfileLoading(true);
    try {
      const res = await getApplicantProfile();
      if (!res.ok) throw new Error("Failed to load profile");
      const data: ApplicantProfile = await res.json();
      setFullName(data.full_name ?? "");
      setExpertise(data.expertise ? [data.expertise] : []);
      setAvatarId(data.avatar_id ?? null);
      setAvatarUrl(data.avatar_url ?? null);
      setCvFilename(data.cv_filename ?? null);
      setHasMatchScore(data.has_match_score ?? false);
    } catch {
      toaster.create({ title: "Couldn't load your profile", type: "error" });
    } finally {
      setProfileLoading(false);
      profileInFlightRef.current = false;
    }
  }, [userId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const loadSavedJobs = useCallback(async () => {
    if (!userId || savedJobsInFlightRef.current) return;
    savedJobsInFlightRef.current = true;
    setFetching(true);
    try {
      const res = await authedFetch("/api/saved-jobs");
      if (!res.ok) throw new Error("Failed to load saved jobs");
      const savedJobs: SavedJobEntry[] = await res.json();

      const enriched: EnrichedEntry[] = await Promise.all(
        savedJobs.map(async (entry) => {
          try {
            const jobRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/jobs/${entry.job_id}`);
            const job = jobRes.ok ? await jobRes.json() : null;
            return { ...entry, job };
          } catch {
            return { ...entry, job: null };
          }
        })
      );

      setEntries(enriched);
    } catch {
      toaster.create({ title: "Couldn't load your dashboard", type: "error" });
    } finally {
      setFetching(false);
      savedJobsInFlightRef.current = false;
    }
  }, [userId]);

  useEffect(() => {
    loadSavedJobs();
  }, [loadSavedJobs]);

  const handleStatusChange = async (jobId: string, action: "saved" | "applied" | "hidden") => {
    try {
      const res =
        action === "saved" ? await saveJob(jobId)
        : action === "applied" ? await markApplied(jobId)
        : await hideJob(jobId);

      if (!res.ok) throw new Error();
      toaster.create({ title: "Updated", type: "success" });
      loadSavedJobs();
    } catch {
      toaster.create({ title: "Something went wrong", type: "error" });
    }
  };

  const visibleEntries = entries.filter((e) => e.status === activeTab);

  if (loading || !user) return null;

  return (
    <Box maxW="800px" mx="auto" mt={12} px={4} pb={16}>
      <Heading size="lg" mb={1}>My Dashboard</Heading>
      <Text color="gray.600" mb={6}>Track the roles you've saved, applied to, or hidden.</Text>

      {!profileLoading && (
        <>
          <ApplicantProfileCard
            fullName={fullName}
            expertise={expertise}
            avatarId={avatarId}
            avatarUrl={avatarUrl}
            onFullNameChange={setFullName}
            onExpertiseChange={setExpertise}
            onAvatarChange={setAvatarId}
            onAvatarUrlChange={setAvatarUrl}
            onSaved={loadProfile}
          />

          <CVUploadSection
            cvFilename={cvFilename}
            hasMatchScore={hasMatchScore}
            onCvUploaded={setCvFilename}
            onMatchScoreUpdated={setHasMatchScore}
          />

          {/* headline + 30-50 word professional summary (typed or generated from CV) */}
          <ApplicantSummaryCard
            fullName={fullName}
            expertise={expertise[0] ?? ""}
            avatarUrl={avatarUrl}
            cvFilename={cvFilename}
          />

          {/* NEW: remove CV / reset profile details. loadProfile re-fetches and remounts the cards above with fresh data */}
          <ProfileManagementCard cvFilename={cvFilename} onChanged={loadProfile} />
        </>
      )}

      <HStack gap={2} mb={6}>
        {TABS.map((tab) => (
          <Button
            key={tab.key}
            size="sm"
            variant={activeTab === tab.key ? "solid" : "outline"}
            colorPalette="brand"
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label} ({entries.filter((e) => e.status === tab.key).length})
          </Button>
        ))}
      </HStack>

      {fetching ? (
        <Center py={16}><Spinner color="brand.500" /></Center>
      ) : visibleEntries.length === 0 ? (
        <Text color="gray.500">Nothing here yet.</Text>
      ) : (
        <Stack gap={3}>
          {visibleEntries.map((entry) => (
            <Box key={entry.id} p={4} bg="surface" border="1px solid #E5E3DD" borderRadius="md">
              <HStack justify="space-between" align="flex-start">
                <Box>
                  <Text fontWeight="600">{entry.job?.title ?? "Job no longer available"}</Text>
                  <Text fontSize="sm" color="gray.600">
                    {entry.job?.company_name ?? "Unknown company"}
                    {entry.job?.location ? ` · ${entry.job.location}` : ""}
                  </Text>
                  {entry.job?.remote_type && (
                    <Badge colorPalette="brand" variant="subtle" mt={1} textTransform="capitalize">
                      {entry.job.remote_type}
                    </Badge>
                  )}
                </Box>
                {entry.job?.source_url && (
                  <Button
                    size="sm"
                    variant="outline"
                    colorPalette="brand"
                    onClick={() => window.open(entry.job!.source_url, "_blank", "noopener,noreferrer")}
                  >
                    View
                  </Button>
                )}
              </HStack>

              <HStack mt={3} gap={2}>
                {activeTab !== "saved" && (
                  <Button size="xs" variant="ghost" onClick={() => handleStatusChange(entry.job_id, "saved")}>
                    Move to Saved
                  </Button>
                )}
                {activeTab !== "applied" && (
                  <Button size="xs" variant="ghost" onClick={() => handleStatusChange(entry.job_id, "applied")}>
                    Mark Applied
                  </Button>
                )}
                {activeTab !== "hidden" && (
                  <Button size="xs" variant="ghost" onClick={() => handleStatusChange(entry.job_id, "hidden")}>
                    Hide
                  </Button>
                )}
              </HStack>
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
}