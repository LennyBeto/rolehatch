// frontend/components/ApplicantSummaryCard.tsx
"use client";
import { Avatar, Badge, Box, Button, Flex, Heading, HStack, Text, Textarea } from "@chakra-ui/react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getApplicantSummary,
  saveApplicantSummary,
  SUMMARY_MAX_WORDS,
  SUMMARY_MIN_WORDS,
  type ApplicantSummary,
} from "@/lib/api";
import { toaster } from "@/components/ui/toaster";

type Props = {
  fullName: string;
  expertise: string; // first selected expertise
  avatarUrl: string | null;
  cvFilename: string | null;
};

const countWords = (text: string) => (text.trim() ? text.trim().split(/\s+/).length : 0);

async function errorMessage(res: Response, fallback: string) {
  const err = await res.json().catch(() => null);
  return typeof err?.detail === "string" ? err.detail : err?.detail?.[0]?.msg || fallback;
}

export default function ApplicantSummaryCard({ fullName, expertise, avatarUrl, cvFilename }: Props) {
  const [detail, setDetail] = useState<ApplicantSummary | null>(null);
  const [loaded, setLoaded] = useState(false); // NEW: avoids flashing the textbox before the summary has loaded
  const [editing, setEditing] = useState(false); // NEW: true after the user clicks "Edit summary"
  const [summary, setSummary] = useState("");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<"save" | "generate" | null>(null);
  const prevCvRef = useRef(cvFilename);

  useEffect(() => {
    getApplicantSummary()
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data: ApplicantSummary) => {
        setDetail(data);
        setSummary(data.summary);
      })
      .catch(() => toaster.create({ title: "Couldn't load your summary", type: "error" }))
      .finally(() => setLoaded(true)); // NEW
  }, []);

  // text === null -> backend generates the summary from the stored CV
  const submit = useCallback(
    async (text: string | null, mode: "save" | "generate") => {
      const name = fullName.trim();
      const exp = expertise.trim();
      if (!name || !exp) {
        toaster.create({ title: "Add your full name and expertise first", type: "error" });
        return;
      }
      setBusy(mode);
      try {
        const res = await saveApplicantSummary({ full_name: name, expertise: exp, summary: text });
        if (!res.ok) throw new Error(await errorMessage(res, "Couldn't save summary"));
        const data: ApplicantSummary = await res.json();
        setDetail(data);
        setSummary(data.summary);
        setDirty(false);
        setEditing(false); // NEW: saved -> hide the textbox
        toaster.create({
          title: "Summary saved",
          description: data.summary_source === "cv" ? "Generated from your CV." : undefined,
          type: "success",
        });
      } catch (err) {
        toaster.create({
          title: "Couldn't save summary",
          description: err instanceof Error ? err.message : "Please try again.",
          type: "error",
        });
      } finally {
        setBusy(null);
      }
    },
    [fullName, expertise]
  );

  // A newly uploaded CV regenerates the summary, unless the user is mid-edit.
  useEffect(() => {
    if (cvFilename === prevCvRef.current) return;
    prevCvRef.current = cvFilename;
    if (cvFilename && !dirty) void submit(null, "generate");
  }, [cvFilename, dirty, submit]);

  const handleSave = () => {
    const text = summary.trim();
    if (!text) {
      toaster.create({ title: "Type a summary or use Generate from CV", type: "error" });
      return;
    }
    const words = countWords(text);
    if (words < SUMMARY_MIN_WORDS || words > SUMMARY_MAX_WORDS) {
      toaster.create({
        title: `Summary must be ${SUMMARY_MIN_WORDS}-${SUMMARY_MAX_WORDS} words`,
        description: `Yours is ${words}.`,
        type: "error",
      });
      return;
    }
    void submit(text, "save");
  };

  // NEW: reopen the textbox pre-filled with the saved summary
  const startEditing = () => {
    setSummary(detail?.summary ?? "");
    setDirty(false);
    setEditing(true);
  };

  // NEW: discard edits and go back to the saved view
  const cancelEditing = () => {
    setSummary(detail?.summary ?? "");
    setDirty(false);
    setEditing(false);
  };

  const words = countWords(summary);
  const outOfRange = words > 0 && (words < SUMMARY_MIN_WORDS || words > SUMMARY_MAX_WORDS);
  const shownAvatar = avatarUrl ?? detail?.avatar_url ?? null;

  // NEW: the textbox shows only while editing, or when no summary is saved yet (first visit, or after a profile reset)
  const hasSaved = Boolean(detail?.summary);
  const showEditor = editing || !hasSaved;

  return (
    <Box bg="surface" border="1px solid #E5E3DD" borderRadius="lg" p={5} mb={6}>
      <Heading size="md" mb={4}>Profile Summary</Heading>

      {!loaded ? (
        <Text fontSize="sm" color="gray.500">Loading…</Text>
      ) : showEditor ? (
        <>
          <Textarea
            placeholder={`Professional summary (${SUMMARY_MIN_WORDS}-${SUMMARY_MAX_WORDS} words) — or generate it from your CV`}
            value={summary}
            onChange={(e) => {
              setSummary(e.target.value);
              setDirty(true);
            }}
            rows={4}
          />
          <Text fontSize="xs" mt={1} mb={3} color={outOfRange ? "red.500" : "gray.500"}>
            {words} words (target {SUMMARY_MIN_WORDS}-{SUMMARY_MAX_WORDS})
          </Text>

          <HStack gap={3}>
            <Button colorPalette="brand" size="sm" onClick={handleSave} loading={busy === "save"} disabled={busy !== null}>
              Save Summary
            </Button>
            <Button
              variant="outline"
              colorPalette="brand"
              size="sm"
              onClick={() => void submit(null, "generate")}
              loading={busy === "generate"}
              disabled={!cvFilename || busy !== null}
            >
              Generate from CV
            </Button>
            {hasSaved && (
              <Button variant="ghost" size="sm" onClick={cancelEditing} disabled={busy !== null}>
                Cancel
              </Button>
            )}
          </HStack>
        </>
      ) : (
        <>
          <Flex gap={3} align="center" mb={3}>
            <Avatar.Root size="lg">
              <Avatar.Fallback name={detail?.full_name || "?"} />
              {shownAvatar && <Avatar.Image src={shownAvatar} />}
            </Avatar.Root>
            <Box>
              <Text fontWeight="700">{detail?.headline}</Text>
              <HStack mt={1} gap={2}>
                {detail?.cv_filename && (
                  <Badge variant="subtle" colorPalette="brand">CV: {detail.cv_filename}</Badge>
                )}
                {detail?.summary_source === "cv" && <Badge variant="outline">Generated from CV</Badge>}
              </HStack>
            </Box>
          </Flex>
          <Text fontSize="xs" color="gray.500" textTransform="uppercase" fontWeight="600" mb={1}>
            Professional Summary
          </Text>
          <Text fontSize="sm">{detail?.summary}</Text>
          <Button size="sm" variant="outline" colorPalette="brand" mt={4} onClick={startEditing}>
            Edit summary
          </Button>
        </>
      )}
    </Box>
  );
}