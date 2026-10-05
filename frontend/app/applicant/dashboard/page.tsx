// frontend/app/applicant/dashboard/page.tsx
"use client";
import { Box, Heading, Text, Stack, Badge, Button, HStack, Center, Spinner } from "@chakra-ui/react";
import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import {
  authedFetch, saveJob, markApplied, hideJob, getApplicantProfile,
  getApplicantSummaryText, // NEW (summary)
  ApplicantProfile,
} from "@/lib/api";
import { toaster } from "@/components/ui/toaster";
import ApplicantProfileCard from "@/components/ApplicantProfileCard";
import CVUploadSection from "@/components/CVUploadSection";
import ApplicantSummaryCard from "@/components/ApplicantSummaryCard";
import ProfileManagementCard from "@/components/ProfileManagementCard";
import CVBuilderCard from "@/components/CVBuilderCard";
import CoverLetterBuilderCard from "@/components/CoverLetterBuilderCard";

type SavedJobEntry = {
  id: string;
  user_id: string;
  job_id: string;
  status: "saved" | "applied" | "hidden";
  hidden_at?: string | null; // NEW: set by the backend when a job is hidden
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

// NEW: keep in sync with HIDDEN_RETENTION_DAYS in backend/app/services/hidden_jobs.py
const HIDDEN_RETENTION_DAYS = 5;

// NEW: countdown shown on hidden jobs until they are auto-deleted
function hiddenRemovalNote(hiddenAt: string | null | undefined) {
  if (!hiddenAt) return null;
  const elapsedDays = (Date.now() - new Date(hiddenAt).getTime()) / 86_400_000;
  const daysLeft = Math.max(1, Math.ceil(HIDDEN_RETENTION_DAYS - elapsedDays));
  return `Removed automatically in ${daysLeft} ${daysLeft === 1 ? "day" : "days"}`;
}

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
  const [profileSummary, setProfileSummary] = useState(""); // NEW (summary)
  const [summaryMerged, setSummaryMerged] = useState(false);   // NEW (collapse): a saved summary lives inside My Profile
  const [profileEditing, setProfileEditing] = useState(false); // NEW (collapse): My Profile edit form is open

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

      // NEW (summary): the summary lives on its own endpoint. A failed fetch
      // returns null and leaves any summary already on screen untouched.
      const summaryText = await getApplicantSummaryText();
      if (summaryText !== null) {
        setProfileSummary(summaryText);
        setSummaryMerged(summaryText.trim().length > 0); // NEW (collapse): collapse when a summary exists, expand after a reset
      }
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

  // NEW (collapse): the Profile Summary card collapses into My Profile unless the profile is being edited
  const summaryCollapsed = summaryMerged && !profileEditing;

  // NEW (collapse): a saved or generated summary updates My Profile and collapses the summary card
  const handleSummarySaved = (text: string) => {
    setProfileSummary(text);
    setSummaryMerged(text.trim().length > 0);
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
            summary={profileSummary} // NEW (summary)
            onFullNameChange={setFullName}
            onExpertiseChange={setExpertise}
            onAvatarChange={setAvatarId}
            onAvatarUrlChange={setAvatarUrl}
            onSaved={loadProfile}
            onEditingChange={setProfileEditing} // NEW (collapse)
          />

          <CVUploadSection
            cvFilename={cvFilename}
            hasMatchScore={hasMatchScore}
            onCvUploaded={setCvFilename}
            onMatchScoreUpdated={setHasMatchScore}
          />

          {/* ATS-friendly CV templates (PDF / Google Doc → template) */}
          <Box mb={6}>
            <CVBuilderCard />
          </Box>

          {/* ATS-friendly cover letter templates */}
          <Box mb={6}>
            <CoverLetterBuilderCard />
          </Box>

          {/* headline + 30-50 word professional summary (typed or generated from CV) */}
          <ApplicantSummaryCard
            fullName={fullName}
            expertise={expertise[0] ?? ""}
            avatarUrl={avatarUrl}
            cvFilename={cvFilename}
            onSummarySaved={handleSummarySaved}         // CHANGED (collapse)
            hidden={summaryCollapsed}                   // NEW (collapse)
            onEditStart={() => setSummaryMerged(false)} // NEW (collapse)
          />

          {/* remove CV / reset profile details. loadProfile re-fetches and remounts the cards above with fresh data */}
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
                  {/* NEW: countdown until the hidden job is auto-deleted */}
                  {activeTab === "hidden" && hiddenRemovalNote(entry.hidden_at) && (
                    <Text fontSize="xs" color="gray.500" mt={1}>{hiddenRemovalNote(entry.hidden_at)}</Text>
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