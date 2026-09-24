// frontend/app/candidates/[id]/page.tsx
"use client";
import { Box, Heading, Text, Button, Stack, Badge } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { authedFetch } from "@/lib/api";
import { toaster } from "@/components/ui/toaster";

type ApplicantProfile = {
  id: string; first_name: string; last_name: string; job_title: string;
  cv_url: string | null; cv_filename: string | null;
};

export default function CandidateProfilePage() {
  const { id } = useParams();
  const [profile, setProfile] = useState<ApplicantProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authedFetch(`/api/applicants/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then(setProfile)
      .catch(() => toaster.create({ title: "Couldn't load candidate profile", type: "error" }))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return null;
  if (!profile) {
    return (
      <Box maxW="600px" mx="auto" py={12} px={4}>
        <Text>Candidate not found.</Text>
      </Box>
    );
  }

  return (
    <Box maxW="600px" mx="auto" py={12} px={4}>
      <Heading size="lg" color="text" mb={1}>{profile.first_name} {profile.last_name}</Heading>
      <Badge colorPalette="brand" mb={4}>Applying for: {profile.job_title}</Badge>

      <Stack gap={4} mt={4}>
        {profile.cv_url ? (
          <Button asChild colorPalette="brand" size="lg" w="fit-content">
            <a href={profile.cv_url} target="_blank" rel="noopener noreferrer">
              Download CV{profile.cv_filename ? ` — ${profile.cv_filename}` : ""}
            </a>
          </Button>
        ) : (
          <Text color="gray.500">No CV uploaded yet.</Text>
        )}
      </Stack>
    </Box>
  );
}