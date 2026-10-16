// frontend/components/CVUploadSection.tsx
"use client";
import { Box, Heading, Text, Button, Stack, Progress, HStack, Badge, Textarea } from "@chakra-ui/react";
import { useRef, useState } from "react";
import { LuChevronDown } from "react-icons/lu";
import { uploadApplicantCV, scanApplicantCV, notifyAtsQuotaChanged } from "@/lib/api";
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
  const [detailsOpen, setDetailsOpen] = useState(true); // ATS score details minimize/maximize

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

      // ATS paywall: free scan used and no purchased scans left
      if (res.status === 402) {
        notifyAtsQuotaChanged(); // ATSScanCard refreshes and shows the buy button
        toaster.create({
          title: "ATS scans locked",
          description: "You've used your free scan. Buy 3 more for $3.99 in the ATS Scan card.",
          type: "info",
        });
        return;
      }

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(typeof err?.detail === "string" ? err.detail : "Scan failed");
      }
      const data: ScanResult = await res.json();
      setResult(data);
      setDetailsOpen(true); // a fresh result opens with full details
      notifyAtsQuotaChanged(); // a scan was spent: refresh the remaining-scans badge
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

  // Light green for strong scores; orange / red keep their warning meaning
  const scoreColor = (score: number) =>
    score >= 80 ? "green" : score >= 50 ? "orange" : "red";

  const focusRing = {
    outline: "2px solid",
    outlineColor: "brand.focusRing",
    outlineOffset: "2px",
  };

  return (
    <Box bg="surface" p={{ base: 4, md: 6 }} borderRadius="lg" border="1px solid" borderColor="line" mb={8}>
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
          _focusVisible={focusRing}
        >
          Upload File
        </Button>
        <Button
          size="xs"
          variant={pasteMode ? "solid" : "outline"}
          colorPalette="brand"
          onClick={() => setPasteMode(true)}
          _focusVisible={focusRing}
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
            borderColor="line"
            _focusVisible={{ borderColor: "brand.focusRing", boxShadow: "none", ...focusRing }}
          />
          <Button
            colorPalette="brand"
            variant="outline"
            onClick={handlePasteSubmit}
            loading={uploading}
            disabled={pastedText.trim().length < 50}
            alignSelf="flex-start"
            _focusVisible={focusRing}
          >
            Save Pasted Resume
          </Button>
        </Stack>
      ) : (
        <HStack gap={3} mb={4} flexWrap="wrap">
          <Button
            colorPalette="brand"
            variant="outline"
            onClick={handleFileSelect}
            loading={uploading}
            _focusVisible={focusRing}
          >
            {cvFilename ? "Replace CV" : "Upload CV"}
          </Button>
        </HStack>
      )}

      {cvFilename && (
        <HStack gap={3} mb={4} flexWrap="wrap">
          <Text fontSize="sm" color="gray.600" wordBreak="break-word">
            Current file: <Text as="span" fontWeight="600">{cvFilename}</Text>
          </Text>
          <Badge colorPalette={hasMatchScore ? "green" : "gray"} variant="subtle" px={2} py={0.5} borderRadius="full">
            {hasMatchScore ? "Match scoring live" : "Scan to enable match scoring"}
          </Badge>
        </HStack>
      )}

      {cvFilename && (
        <Button
          colorPalette="brand"
          onClick={handleScan}
          loading={scanning}
          mb={4}
          _focusVisible={focusRing}
        >
          Run ATS Scan
        </Button>
      )}

      {result && (
        <Box mt={2} pt={4} borderTop="1px solid" borderColor="line">
          <HStack justify="space-between" align="center" gap={3} flexWrap="wrap">
            <Text fontWeight="600">ATS Match Score</Text>

            <HStack gap={2}>
              <Badge
                colorPalette={scoreColor(result.overall_score)}
                fontSize="md"
                px={3}
                py={1}
                borderRadius="full"
                aria-label={`Overall ATS match score ${result.overall_score} percent`}
              >
                {result.overall_score}%
              </Badge>

              {/* Minimize / maximize the score details */}
              <Button
                size="xs"
                variant="ghost"
                colorPalette="brand"
                borderRadius="full"
                px={3}
                aria-expanded={detailsOpen}
                aria-controls="ats-score-details"
                onClick={() => setDetailsOpen((prev) => !prev)}
                _focusVisible={focusRing}
              >
                {detailsOpen ? "Hide details" : "Show details"}
                <Box
                  as={LuChevronDown}
                  ml={1}
                  transform={detailsOpen ? "rotate(180deg)" : "rotate(0deg)"}
                  transition="transform 0.15s ease"
                  _motionReduce={{ transition: "none" }}
                  aria-hidden
                />
              </Button>
            </HStack>
          </HStack>

          {/* Conditionally rendered: hidden = only the title + percentage remain */}
          {detailsOpen && (
            <Box id="ats-score-details" mt={3}>
              <Stack gap={2} mb={4}>
                {Object.entries(result.breakdown).map(([key, value]) => (
                  <Box key={key}>
                    <HStack justify="space-between" mb={1}>
                      <Text fontSize="xs" color="gray.600" _dark={{ color: "gray.300" }}>
                        {BREAKDOWN_LABELS[key] ?? key}
                      </Text>
                      <Text fontSize="xs" color="gray.600" _dark={{ color: "gray.300" }}>
                        {value}%
                      </Text>
                    </HStack>
                    <Progress.Root value={value} size="sm" colorPalette={scoreColor(value)}>
                      <Progress.Track>
                        <Progress.Range _motionReduce={{ transition: "none" }} />
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
                      <Text key={i} fontSize="sm" color="gray.700" _dark={{ color: "gray.300" }}>• {s}</Text>
                    ))}
                  </Stack>
                </Box>
              )}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}