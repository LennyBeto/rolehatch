// frontend/components/CVUploadSection.tsx
"use client";
import { Box, Heading, Text, Button, Stack, Progress, HStack, Badge } from "@chakra-ui/react";
import { useRef, useState } from "react";
import { uploadApplicantCV, scanApplicantCV } from "@/lib/api";
import { toaster } from "@/components/ui/toaster";

type ScanResult = {
  overall_score: number;
  breakdown: Record<string, number>;
  suggestions: string[];
};

const BREAKDOWN_LABELS: Record<string, string> = {
  contact_info: "Contact Info",
  key_sections: "Key Sections",
  length: "Length",
  keyword_match: "Keyword Match",
  action_verbs: "Action Verbs",
};

export default function CVUploadSection({
  cvFilename,
  onCvUploaded,
}: {
  cvFilename: string | null;
  onCvUploaded: (filename: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);

  const handleFileSelect = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setResult(null);
    try {
      const res = await uploadApplicantCV(file);
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || "Upload failed");
      }
      toaster.create({ title: "CV uploaded", type: "success" });
      onCvUploaded(file.name);
    } catch (err) {
      toaster.create({
        title: "Couldn't upload CV",
        description: err instanceof Error ? err.message : undefined,
        type: "error",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleScan = async () => {
    setScanning(true);
    try {
      const res = await scanApplicantCV();
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || "Scan failed");
      }
      const data: ScanResult = await res.json();
      setResult(data);
    } catch (err) {
      toaster.create({
        title: "Couldn't scan CV",
        description: err instanceof Error ? err.message : undefined,
        type: "error",
      });
    } finally {
      setScanning(false);
    }
  };

  const scoreColor = (score: number) =>
    score >= 80 ? "green" : score >= 50 ? "orange" : "red";

  return (
    <Box bg="surface" p={6} borderRadius="lg" border="1px solid #E5E3DD" mb={8}>
      <Heading size="md" mb={1}>CV & ATS Screening</Heading>
      <Text color="gray.600" fontSize="sm" mb={4}>
        Upload your CV and run it through our ATS screening tool to see how well it matches
        applicant tracking systems used by employers.
      </Text>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.txt,.docx"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      <HStack gap={3} mb={4} flexWrap="wrap">
        <Button colorPalette="brand" variant="outline" onClick={handleFileSelect} loading={uploading}>
          {cvFilename ? "Replace CV" : "Upload CV"}
        </Button>
        {cvFilename && (
          <Text fontSize="sm" color="gray.600">
            Current file: <Text as="span" fontWeight="600">{cvFilename}</Text>
          </Text>
        )}
      </HStack>

      {cvFilename && (
        <Button colorPalette="brand" onClick={handleScan} loading={scanning} mb={4}>
          Run ATS Scan
        </Button>
      )}

      {result && (
        <Box mt={2} pt={4} borderTop="1px solid #E5E3DD">
          <HStack justify="space-between" mb={2}>
            <Text fontWeight="600">ATS Match Score</Text>
            <Badge colorPalette={scoreColor(result.overall_score)} fontSize="md" px={3} py={1} borderRadius="full">
              {result.overall_score}%
            </Badge>
          </HStack>

          <Stack gap={2} mb={4}>
            {Object.entries(result.breakdown).map(([key, value]) => (
              <Box key={key}>
                <HStack justify="space-between" mb={1}>
                  <Text fontSize="xs" color="gray.600">{BREAKDOWN_LABELS[key] ?? key}</Text>
                  <Text fontSize="xs" color="gray.600">{value}%</Text>
                </HStack>
                <Progress.Root value={value} size="sm" colorPalette={scoreColor(value)}>
                  <Progress.Track>
                    <Progress.Range />
                  </Progress.Track>
                </Progress.Root>
              </Box>
            ))}
          </Stack>

          {result.suggestions.length > 0 && (
            <Box>
              <Text fontSize="sm" fontWeight="600" mb={1}>Suggestions</Text>
              <Stack gap={1}>
                {result.suggestions.map((s, i) => (
                  <Text key={i} fontSize="sm" color="gray.700">• {s}</Text>
                ))}
              </Stack>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}