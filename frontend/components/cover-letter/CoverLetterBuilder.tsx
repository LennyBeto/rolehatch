// frontend/components/cover-letter/CoverLetterBuilder.tsx
"use client";
import { Box, Button, Flex, Heading, Input, Stack, Text, Textarea, Wrap } from "@chakra-ui/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { LuArrowLeft } from "react-icons/lu";
import { toaster } from "@/components/ui/toaster";
import { useAuth } from "@/lib/AuthContext";
import { getApplicantProfile, ApplicantProfile } from "@/lib/api";
import CoverLetterPreview from "./CoverLetterPreview";
import {
  COVER_LETTER_TEMPLATES, CoverLetterData, DEFAULT_TEMPLATE_ID, EMPTY_COVER_LETTER,
  SAMPLE_COVER_LETTER, isValidTemplateId, toPlainText,
} from "@/lib/coverLetterTemplates";

const storageKey = (userId: string) => `perchrole:cover-letter-draft:${userId}`;

const PRINT_CSS = `
@media print {
  @page { size: A4; margin: 16mm; }
  body * { visibility: hidden !important; }
  #cover-letter-paper, #cover-letter-paper * { visibility: visible !important; }
  #cover-letter-paper {
    position: absolute; left: 0; top: 0; width: 100% !important; max-width: none !important;
    min-height: 0 !important; padding: 0 !important; box-shadow: none !important; border: none !important;
  }
}`;

function todayString() {
  return new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box>
      <Text fontSize="xs" fontWeight="600" color="gray.600" mb={1}>{label}</Text>
      {children}
    </Box>
  );
}

export default function CoverLetterBuilder() {
  const { user, loading } = useAuth();
  const userId = user?.id ?? null;
  const userEmail = user?.email ?? "";
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlTemplate = searchParams.get("template");

  const [templateId, setTemplateId] = useState(isValidTemplateId(urlTemplate) ? urlTemplate : DEFAULT_TEMPLATE_ID);
  const [data, setData] = useState<CoverLetterData>(EMPTY_COVER_LETTER);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

  // Load the saved draft, or prefill from the applicant profile on first use
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const id = setTimeout(async () => {
      try {
        const saved = localStorage.getItem(storageKey(userId));
        if (saved) {
          const parsed = JSON.parse(saved);
          if (!cancelled) {
            setData({ ...EMPTY_COVER_LETTER, ...parsed });
            setHydrated(true);
          }
          return;
        }
      } catch {
        /* unreadable draft — fall through to a fresh one */
      }

      let base: CoverLetterData = { ...EMPTY_COVER_LETTER, date: todayString(), email: userEmail };
      try {
        const res = await getApplicantProfile();
        if (res.ok) {
          const p: ApplicantProfile = await res.json();
          const name = p.full_name ?? "";
          base = { ...base, fullName: name, signature: name, jobTitle: p.expertise ?? "" };
        }
      } catch {
        /* profile prefill is optional */
      }
      if (!cancelled) {
        setData(base);
        setHydrated(true);
      }
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [userId, userEmail]);

  // Autosave the draft per user
  useEffect(() => {
    if (!hydrated || !userId) return;
    try {
      localStorage.setItem(storageKey(userId), JSON.stringify(data));
    } catch {
      /* storage unavailable — editing still works */
    }
  }, [data, hydrated, userId]);

  const set =
    (key: keyof CoverLetterData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setData((d) => ({ ...d, [key]: e.target.value }));

  const chooseTemplate = (id: string) => {
    setTemplateId(id);
    router.replace(`/applicant/cover-letter-builder?template=${id}`, { scroll: false });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(toPlainText(data));
      toaster.create({ title: "Copied as plain text", type: "success" });
    } catch {
      toaster.create({ title: "Couldn't copy", type: "error" });
    }
  };

  const handleDownloadTxt = () => {
    const blob = new Blob([toPlainText(data)], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(data.fullName || "cover-letter").trim().replace(/\s+/g, "-").toLowerCase()}-cover-letter.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading || !user) return null;

  return (
    <Box py={8} px={4}>
      <style>{PRINT_CSS}</style>
      <Box maxW="1250px" mx="auto">
        <Flex justify="space-between" align="center" mb={6} wrap="wrap" gap={3}>
          <Box>
            <Heading size="lg" color="text">Build Your Cover Letter</Heading>
            <Text color="gray.600" fontSize="sm">Your draft saves automatically in this browser.</Text>
          </Box>
          <Wrap gap={2}>
            <Button asChild variant="outline" colorPalette="brand" size="sm">
              <Link href="/applicant/cover-letter-templates">Change template</Link>
            </Button>
            <Button asChild variant="outline" colorPalette="brand" size="sm">
              <Link href="/applicant/dashboard">
                <LuArrowLeft /> Back to Dashboard
              </Link>
            </Button>
          </Wrap>
        </Flex>

        <Flex direction={{ base: "column", lg: "row" }} gap={6} align="flex-start">
          {/* FORM */}
          <Stack gap={5} w={{ base: "100%", lg: "420px" }} flexShrink={0}>
            <Box bg="surface" border="1px solid #E5E3DD" borderRadius="lg" p={4}>
              <Text fontSize="xs" fontWeight="600" color="gray.600" mb={2}>Template</Text>
              <Wrap gap={2}>
                {COVER_LETTER_TEMPLATES.map((t) => (
                  <Button
                    key={t.id}
                    size="xs"
                    colorPalette="brand"
                    variant={t.id === templateId ? "solid" : "outline"}
                    onClick={() => chooseTemplate(t.id)}
                  >
                    {t.name}
                  </Button>
                ))}
              </Wrap>
            </Box>

            <Stack gap={3} bg="surface" border="1px solid #E5E3DD" borderRadius="lg" p={4}>
              <Heading size="sm">Your details</Heading>
              <Field label="Full name"><Input value={data.fullName} onChange={set("fullName")} /></Field>
              <Field label="Job title"><Input value={data.jobTitle} onChange={set("jobTitle")} /></Field>
              <Field label="Phone"><Input value={data.phone} onChange={set("phone")} /></Field>
              <Field label="Email"><Input type="email" value={data.email} onChange={set("email")} /></Field>
              <Field label="City"><Input value={data.location} onChange={set("location")} /></Field>
              <Field label="Date"><Input value={data.date} onChange={set("date")} /></Field>
            </Stack>

            <Stack gap={3} bg="surface" border="1px solid #E5E3DD" borderRadius="lg" p={4}>
              <Heading size="sm">Recipient</Heading>
              <Field label="Hiring manager name"><Input value={data.recipientName} onChange={set("recipientName")} /></Field>
              <Field label="Their title"><Input value={data.recipientTitle} onChange={set("recipientTitle")} /></Field>
              <Field label="Company"><Input value={data.company} onChange={set("company")} /></Field>
              <Field label="Company address (one line per row)">
                <Textarea rows={3} value={data.companyAddress} onChange={set("companyAddress")} />
              </Field>
            </Stack>

            <Stack gap={3} bg="surface" border="1px solid #E5E3DD" borderRadius="lg" p={4}>
              <Heading size="sm">Letter</Heading>
              <Field label="Salutation"><Input value={data.salutation} onChange={set("salutation")} /></Field>
              <Field label="Body — blank line = new paragraph, start a line with “- ” for a bullet">
                <Textarea rows={14} value={data.body} onChange={set("body")} />
              </Field>
              <Field label="Closing"><Input value={data.closing} onChange={set("closing")} /></Field>
              <Field label="Signature"><Input value={data.signature} onChange={set("signature")} /></Field>
              <Field label="P.S. (optional)">
                <Textarea rows={3} value={data.postscript} onChange={set("postscript")} />
              </Field>
            </Stack>
          </Stack>

          {/* PREVIEW */}
          <Box flex="1" minW={0} w="100%">
            <Wrap gap={2} mb={4}>
              <Button colorPalette="brand" size="sm" onClick={() => window.print()}>
                Print / Save as PDF
              </Button>
              <Button variant="outline" colorPalette="brand" size="sm" onClick={handleCopy}>
                Copy as text
              </Button>
              <Button variant="outline" colorPalette="brand" size="sm" onClick={handleDownloadTxt}>
                Download .txt
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setData({ ...SAMPLE_COVER_LETTER })}>
                Fill with sample
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setData({ ...EMPTY_COVER_LETTER, date: todayString(), email: userEmail })}
              >
                Clear
              </Button>
            </Wrap>

            <Box overflowX="auto" border="1px solid #E5E3DD" borderRadius="md" boxShadow="0 4px 20px rgba(0,0,0,0.06)">
              <CoverLetterPreview id="cover-letter-paper" data={data} templateId={templateId} />
            </Box>

            <Text fontSize="xs" color="gray.500" mt={3}>
              Tip: in the print dialog choose “Save as PDF” and turn off “Headers and footers”.
              The PDF keeps real, selectable text, which is what ATS parsers read.
            </Text>
          </Box>
        </Flex>
      </Box>
    </Box>
  );
}