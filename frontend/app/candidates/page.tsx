// frontend/app/candidates/page.tsx
"use client";
import { Box, Heading, Text, Stack, Input, Button } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { authedFetch } from "@/lib/api";
import { toaster } from "@/components/ui/toaster";

type ApplicantProfile = { id: string; first_name: string; last_name: string; job_title: string };

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<ApplicantProfile[]>([]);
  const [jobTitle, setJobTitle] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchCandidates = (filter?: string) => {
    setLoading(true);
    const params = filter ? `?job_title=${encodeURIComponent(filter)}` : "";
    authedFetch(`/api/applicants${params}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load candidates");
        return res.json();
      })
      .then(setCandidates)
      .catch(() => toaster.create({ title: "Couldn't load candidates", type: "error" }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCandidates(); }, []);

  return (
    <Box maxW="700px" mx="auto" py={12} px={4}>
      <Heading size="lg" color="text" mb={1}>Candidate Profiles</Heading>
      <Text color="gray.600" mb={6}>Browse applicants who've registered a public profile.</Text>

      <Stack direction="row" gap={3} mb={6}>
        <Input placeholder="Filter by job title" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
        <Button colorPalette="brand" onClick={() => fetchCandidates(jobTitle)} flexShrink={0}>Search</Button>
      </Stack>

      {!loading && candidates.length === 0 && <Text color="gray.500">No candidates found.</Text>}

      <Stack gap={3}>
        {candidates.map((c) => (
          <Box key={c.id} p={4} bg="surface" border="1px solid #E5E3DD" borderRadius="md">
            <Text fontWeight="600">{c.first_name} {c.last_name}</Text>
            <Text color="gray.600" fontSize="sm" mb={2}>Applying for: {c.job_title}</Text>
            <Link href={`/candidates/${c.id}`}>
              <Button size="sm" variant="outline" colorPalette="brand">View Profile</Button>
            </Link>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}