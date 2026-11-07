// frontend/components/FilterSidebar.tsx
"use client";
import {
  Box, Heading, CheckboxGroup, Checkbox, VStack, Slider, Text, Wrap,
} from "@chakra-ui/react";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const REMOTE_TYPES = [
  { label: "Remote", value: "remote" },
  { label: "Hybrid", value: "hybrid" },
  { label: "Onsite", value: "onsite" },
  { label: "Field", value: "field" },
];

// values must match the lowercase keywords stored in jobs.tech_stack (pipeline.TECH_KEYWORDS)
const LANGUAGES = [
  { label: "Python", value: "python" },
  { label: "JavaScript", value: "javascript" },
  { label: "TypeScript", value: "typescript" },
  { label: "Java", value: "java" },
  { label: "Go", value: "golang" },
  { label: "Rust", value: "rust" },
  { label: "C#", value: "c#" },
  { label: "Ruby", value: "ruby" },
  { label: "PHP", value: "php" },
  { label: "Swift", value: "swift" },
  { label: "Kotlin", value: "kotlin" },
  { label: "SQL", value: "sql" },
];

const SALARY_MIN = 0;
const SALARY_MAX = 300; // slider ceiling; at max the upper bound means "$300k+" (no cap)

export default function FilterSidebar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectedRemoteTypes = searchParams.get("remote_type")?.split(",").map((v) => v.trim().toLowerCase()).filter(Boolean) ?? [];
  // "languages" is canonical; "language" is read only so older bookmarked URLs still hydrate the checkboxes
  const selectedLanguages = (searchParams.get("languages") ?? searchParams.get("language"))
    ?.split(",").map((v) => v.trim().toLowerCase()).filter(Boolean) ?? [];
  const includeUnlisted = searchParams.get("hide_unlisted") !== "1";
  // Param names match the API (/api/jobs/search) so they can be forwarded as-is
  const openToAfrica = searchParams.get("open_to_africa") === "1";
  const visaSponsorship = searchParams.get("visa_sponsorship") === "1";

  // URL is the source of truth once a change is committed.
  const urlMin = Number(searchParams.get("salary_min") ?? SALARY_MIN);
  const urlMax = Number(searchParams.get("salary_max") ?? SALARY_MAX);
  const urlKey = `${urlMin}-${urlMax}`;

  // While dragging, the thumbs follow local state so they never lag or snap back.
  // The draft is tied to the URL it started from, so back/forward or chip
  // changes discard it automatically.
  const [draft, setDraft] = useState<{ base: string; value: number[] } | null>(null);
  const shown = draft && draft.base === urlKey ? draft.value : [urlMin, urlMax];

  const updateParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page"); // any filter change invalidates the current page position
    if ("languages" in updates) params.delete("language"); // drop legacy param so it can't keep filtering
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") params.delete(key);
      else params.set(key, value);
    }
    // Land on the results, not the header/hero
    router.push(`/?${params.toString()}#listings`);
  };

  const handleRemoteTypeChange = (values: string[]) => {
    const normalized = values.map((value) => value.trim().toLowerCase()).filter(Boolean);
    updateParams({ remote_type: normalized.length ? normalized.join(",") : null });
  };

  const handleLanguageChange = (values: string[]) => {
    const normalized = values.map((value) => value.trim().toLowerCase()).filter(Boolean);
    updateParams({ languages: normalized.length ? normalized.join(",") : null });
  };

  // Fires once, when the user releases a thumb — one search per gesture.
  const commitSalary = (value: number[]) => {
    updateParams({
      salary_min: value[0] > SALARY_MIN ? String(value[0]) : null,
      salary_max: value[1] < SALARY_MAX ? String(value[1]) : null,
    });
  };

  const maxLabel = shown[1] >= SALARY_MAX ? `$${SALARY_MAX}k+` : `$${shown[1]}k`;

  return (
    <Box bg="surface" p={4} borderRadius="md" borderWidth="1px" borderColor="line">
      <Heading size="sm" mb={3}>Environment</Heading>
      <CheckboxGroup
        colorPalette="brand"
        value={selectedRemoteTypes}
        onValueChange={handleRemoteTypeChange}
      >
        <VStack gap={2} mb={5} align="stretch">
          {REMOTE_TYPES.map((type) => (
            <Checkbox.Root key={type.value} value={type.value}>
              <Checkbox.HiddenInput />
              <Checkbox.Control />
              <Checkbox.Label>{type.label}</Checkbox.Label>
            </Checkbox.Root>
          ))}
        </VStack>
      </CheckboxGroup>

      <Heading size="sm" mb={3}>Region &amp; visa</Heading>
      <VStack gap={2} mb={1} align="stretch">
        <Checkbox.Root
          colorPalette="brand"
          checked={openToAfrica}
          onCheckedChange={(e) => updateParams({ open_to_africa: e.checked === true ? "1" : null })}
        >
          <Checkbox.HiddenInput />
          <Checkbox.Control />
          <Checkbox.Label>Open to Africa</Checkbox.Label>
        </Checkbox.Root>
        <Checkbox.Root
          colorPalette="brand"
          checked={visaSponsorship}
          onCheckedChange={(e) => updateParams({ visa_sponsorship: e.checked === true ? "1" : null })}
        >
          <Checkbox.HiddenInput />
          <Checkbox.Control />
          <Checkbox.Label>Visa sponsorship / relocation</Checkbox.Label>
        </Checkbox.Root>
      </VStack>
      <Text fontSize="xs" color="gray.600" mb={5}>
        Detected from each listing&apos;s location and description. Confirm with the employer.
      </Text>

      <Heading size="sm" mb={3}>Languages</Heading>
      <CheckboxGroup
        colorPalette="brand"
        value={selectedLanguages}
        onValueChange={handleLanguageChange}
      >
        <Wrap gap={3} mb={5}>
          {LANGUAGES.map((lang) => (
            <Checkbox.Root key={lang.value} value={lang.value}>
              <Checkbox.HiddenInput />
              <Checkbox.Control />
              <Checkbox.Label>{lang.label}</Checkbox.Label>
            </Checkbox.Root>
          ))}
        </Wrap>
      </CheckboxGroup>

      <Heading size="sm" mb={3}>Salary ($k/yr)</Heading>
      <Slider.Root
        colorPalette="brand"
        min={SALARY_MIN}
        max={SALARY_MAX}
        step={10}
        minStepsBetweenThumbs={1}
        value={shown}
        onValueChange={(e) => setDraft({ base: urlKey, value: e.value })}
        onValueChangeEnd={(e) => commitSalary(e.value)}
        mb={2}
      >
        <Slider.Control>
          <Slider.Track>
            <Slider.Range />
          </Slider.Track>
          <Slider.Thumb index={0}><Slider.HiddenInput /></Slider.Thumb>
          <Slider.Thumb index={1}><Slider.HiddenInput /></Slider.Thumb>
        </Slider.Control>
      </Slider.Root>
      <Text fontSize="sm" color="gray.600" mb={3}>${shown[0]}k – {maxLabel}</Text>

      <Checkbox.Root
        colorPalette="brand"
        checked={includeUnlisted}
        onCheckedChange={(e) => updateParams({ hide_unlisted: e.checked ? null : "1" })}
      >
        <Checkbox.HiddenInput />
        <Checkbox.Control />
        <Checkbox.Label fontSize="sm">Include jobs without a listed salary</Checkbox.Label>
      </Checkbox.Root>
    </Box>
  );
}