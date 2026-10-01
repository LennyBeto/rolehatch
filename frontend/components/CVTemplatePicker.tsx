// frontend/components/CVTemplatePicker.tsx
"use client";
import { Box, Heading, Text, Stack, SimpleGrid, Input, Textarea, Button, HStack, Badge, Image } from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { toaster } from "@/components/ui/toaster";
import { fetchTemplates, parseCV, renderCV, type CVData, type CVTemplate } from "@/lib/cvApi";
import { SAMPLE_CV } from "@/lib/sampleCV";
import { cvReadiness } from "@/lib/cvReadiness";
import CVPreview from "./CVPreview";

export default function CVTemplatePicker() {
  const [templates, setTemplates] = useState<CVTemplate[]>([]);
  const [selected, setSelected] = useState("classic");
  const [source, setSource] = useState<"pdf" | "gdoc">("pdf");
  const [file, setFile] = useState<File | null>(null);
  const [docUrl, setDocUrl] = useState("");
  const [cv, setCv] = useState<CVData | null>(null);
  const [parsing, setParsing] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetchTemplates()
      .then(setTemplates)
      .catch(() => toaster.create({ title: "Couldn't load templates", type: "error" }));
  }, []);

  const update = (patch: Partial<CVData>) => setCv((prev) => (prev ? { ...prev, ...patch } : prev));
  const template = templates.find((t) => t.id === selected);
  const readiness = useMemo(() => (cv ? cvReadiness(cv) : null), [cv]); // live: updates as the applicant edits

  const handleParse = async () => {
    if (source === "pdf" && !file) return toaster.create({ title: "Choose a PDF first", type: "info" });
    if (source === "gdoc" && !docUrl.trim()) return toaster.create({ title: "Paste a Google Docs link", type: "info" });
    setParsing(true);
    try {
      const result = await parseCV(source === "pdf" ? { file: file! } : { googleDocUrl: docUrl.trim() });
      setCv(result.cv);
    } catch (err) {
      toaster.create({ title: "Couldn't read your CV", description: err instanceof Error ? err.message : undefined, type: "error" });
    } finally {
      setParsing(false);
    }
  };

  const handleDownload = async () => {
    if (!cv) return;
    setDownloading(true);
    try {
      const blob = await renderCV(selected, cv);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(cv.name || "cv").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${selected}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toaster.create({ title: "Couldn't generate PDF", description: err instanceof Error ? err.message : undefined, type: "error" });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Stack gap={8}>
      {/* Example CV */}
      <Box bg="surface" p={5} borderRadius="lg" border="1px solid #E5E3DD">
        <Heading size="sm" mb={1}>Example of an ATS-ready CV</Heading>
        <Text fontSize="sm" color="gray.600" mb={3}>
          Single column, standard headings, plain bullets and right-aligned dates. Every template below follows this structure.
        </Text>
        <Image
          src="/samples/cv-sample.jpg"
          alt="Example ATS-friendly CV for John Smith"
          w="full" maxW="420px" border="1px solid #E5E3DD" borderRadius="md"
        />
        <Button mt={3} size="sm" variant="outline" colorPalette="brand" onClick={() => setCv({ ...SAMPLE_CV })}>
          Try the templates with this sample
        </Button>
      </Box>

      {/* Step 1 — import */}
      <Box bg="surface" p={5} borderRadius="lg" border="1px solid #E5E3DD">
        <Heading size="sm" mb={3}>1. Import your CV</Heading>
        <HStack mb={3}>
          <Button size="sm" colorPalette="brand" variant={source === "pdf" ? "solid" : "outline"} onClick={() => setSource("pdf")}>PDF</Button>
          <Button size="sm" colorPalette="brand" variant={source === "gdoc" ? "solid" : "outline"} onClick={() => setSource("gdoc")}>Google Doc</Button>
        </HStack>
        {source === "pdf" ? (
          <Input type="file" accept="application/pdf,.pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        ) : (
          <>
            <Input placeholder="https://docs.google.com/document/d/..." value={docUrl} onChange={(e) => setDocUrl(e.target.value)} />
            <Text fontSize="xs" color="gray.500" mt={1}>Sharing must be set to “Anyone with the link can view”.</Text>
          </>
        )}
        <Button mt={4} colorPalette="brand" loading={parsing} onClick={handleParse}>Parse CV</Button>
      </Box>

      {/* Step 2 — template (always visible, each card previews the example CV) */}
      <Box>
        <Heading size="sm" mb={1}>2. Choose an ATS-friendly template</Heading>
        <Text fontSize="sm" color="gray.600" mb={3}>Previews show the example CV; your own details are applied once imported.</Text>
        <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap={4}>
          {templates.map((t) => (
            <Box
              key={t.id} role="radio" aria-checked={selected === t.id} tabIndex={0}
              onClick={() => setSelected(t.id)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSelected(t.id)}
              cursor="pointer" bg="surface" p={4} borderRadius="lg"
              border="2px solid" borderColor={selected === t.id ? "brand.500" : "#E5E3DD"}
            >
              <HStack justify="space-between" mb={1}>
                <Text fontWeight="600">{t.name}</Text>
                <Badge colorPalette="brand" variant="subtle">ATS-safe</Badge>
              </HStack>
              <Text fontSize="sm" color="gray.600" mb={3}>{t.description}</Text>
              <Box display="flex" justifyContent="center" pointerEvents="none">
                <CVPreview cv={SAMPLE_CV} template={t} scale={0.3} />
              </Box>
            </Box>
          ))}
        </SimpleGrid>
      </Box>

      {/* Step 3 — review + preview */}
      {cv && template && readiness && (
        <SimpleGrid columns={{ base: 1, lg: 2 }} gap={6}>
          <Stack gap={3}>
            <Heading size="sm">3. Review and complete your details</Heading>
            <Box bg="surface" p={4} borderRadius="lg" border="1px solid #E5E3DD">
              <HStack justify="space-between" mb={2}>
                <Text fontWeight="600">CV readiness</Text>
                <Badge colorPalette={readiness.score >= 95 ? "green" : "orange"} variant="solid">{readiness.score}%</Badge>
              </HStack>
              {readiness.checks.map((c) => (
                <Text key={c.label} fontSize="sm" color={c.passed ? "green.600" : "orange.600"}>
                  {c.passed ? "✓" : "!"} {c.passed ? c.label : c.hint}
                </Text>
              ))}
            </Box>
            <Input placeholder="Full name" value={cv.name} onChange={(e) => update({ name: e.target.value })} />
            <Input placeholder="Email" value={cv.email} onChange={(e) => update({ email: e.target.value })} />
            <Input placeholder="Phone" value={cv.phone} onChange={(e) => update({ phone: e.target.value })} />
            <Input placeholder="Location" value={cv.location} onChange={(e) => update({ location: e.target.value })} />
            <Textarea rows={5} placeholder="Professional summary (30–50 words)" value={cv.summary} onChange={(e) => update({ summary: e.target.value })} />
            <Button colorPalette="brand" size="lg" loading={downloading} onClick={handleDownload}>Download PDF</Button>
          </Stack>
          <Box overflowX="auto">
            <Text fontSize="xs" color="gray.500" mb={1}>Preview (page 1) — {template.name}</Text>
            <CVPreview cv={cv} template={template} scale={0.62} />
          </Box>
        </SimpleGrid>
      )}
    </Stack>
  );
}