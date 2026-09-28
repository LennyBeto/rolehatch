// frontend/components/CVUploadSection.tsx
"use client";
import { Box, Heading, Text, Button, Stack, Progress, HStack, Badge, Textarea } from "@chakra-ui/react";
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
  hasMatchScore,
  onCvUploaded,
  onMatchScoreUpdated,
}: {
  cvFilename: string | null;
  hasMatchScore: boolean;
  onCvUploaded: (filename: string) => void;
  onMatchScoreUpdated: (hasScore: boolean) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [pasteMode, setPasteMode] = useState(false);
  const [pastedText, setPastedText] = useState("");

  const handleFileSelect = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await doUpload(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePasteSubmit = async () => {
    if (pastedText.trim().length < 50) {
      toaster.create({ title: "Resume text is too short", description: "Paste at least 50 characters.", type: "error" });
      return;
    }
    const file = new File([pastedText], "resume.txt", { type: "text/plain" });
    await doUpload(file);
  };

  const doUpload = async (file: File) => {
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
      // A fresh upload invalidates any previous scan/embedding — the
      // backend already clears these server-side (see upload_cv), this
      // just keeps the UI's match-score badge from claiming a stale state.
      onMatchScoreUpdated(false);
    } catch (err) {
      toaster.create({
        title: "Couldn't upload CV",
        description: err instanceof Error ? err.message : undefined,
        type: "error",
      });
    } finally {
      setUploading(false);
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
      // A successful scan is also when the backend generates the resume
      // embedding used for job match-score sorting — see scan_cv.
      onMatchScoreUpdated(true);
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
        applicant tracking systems used by employers. Scanning also enables job match scoring —
        listings will show how well they fit your resume.
      </Text>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.txt,.docx"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      <HStack gap={2} mb={3}>
        <Button
          size="xs"
          variant={!pasteMode ? "solid" : "outline"}
          colorPalette="brand"
          onClick={() => setPasteMode(false)}
        >
          Upload File
        </Button>
        <Button
          size="xs"
          variant={pasteMode ? "solid" : "outline"}
          colorPalette="brand"
          onClick={() => setPasteMode(true)}
        >
          Paste Text
        </Button>
      </HStack>

      {pasteMode ? (
        <Stack gap={2} mb={4}>
          <Textarea
            placeholder="Paste your resume text here (minimum 50 characters)..."
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            rows={8}
          />
          <Button
            colorPalette="brand"
            variant="outline"
            onClick={handlePasteSubmit}
            loading={uploading}
            disabled={pastedText.trim().length < 50}
            alignSelf="flex-start"
          >
            Save Pasted Resume
          </Button>
        </Stack>
      ) : (
        <HStack gap={3} mb={4} flexWrap="wrap">
          <Button colorPalette="brand" variant="outline" onClick={handleFileSelect} loading={uploading}>
            {cvFilename ? "Replace CV" : "Upload CV"}
          </Button>
        </HStack>
      )}

      {cvFilename && (
        <HStack gap={3} mb={4} flexWrap="wrap">
          <Text fontSize="sm" color="gray.600">
            Current file: <Text as="span" fontWeight="600">{cvFilename}</Text>
          </Text>
          <Badge colorPalette={hasMatchScore ? "green" : "gray"} variant="subtle" px={2} py={0.5} borderRadius="full">
            {hasMatchScore ? "Match scoring live" : "Scan to enable match scoring"}
          </Badge>
        </HStack>
      )}

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