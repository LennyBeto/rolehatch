// frontend/components/FilterSidebar.tsx
"use client";
import {
  Box, Heading, CheckboxGroup, Checkbox, VStack, Slider, Text, Wrap,
} from "@chakra-ui/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "@/lib/useDebouncedCallback";

const REMOTE_TYPES = [
  { label: "Remote", value: "remote" },
  { label: "Hybrid", value: "hybrid" },
  { label: "Onsite", value: "onsite" },
  { label: "Field", value: "field" },
];

const LANGUAGES = [
  { label: "Python", value: "python" },
  { label: "JavaScript", value: "javascript" },
  { label: "TypeScript", value: "typescript" },
  { label: "Java", value: "java" },
  { label: "Go", value: "go" },
  { label: "Rust", value: "rust" },
  { label: "C#", value: "c#" },
  { label: "Ruby", value: "ruby" },
  { label: "PHP", value: "php" },
  { label: "Swift", value: "swift" },
  { label: "Kotlin", value: "kotlin" },
  { label: "SQL", value: "sql" },
];

export default function FilterSidebar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectedRemoteTypes = searchParams.get("remote_type")?.split(",").map((v) => v.trim().toLowerCase()).filter(Boolean) ?? [];
  const selectedLanguages = searchParams.get("language")?.split(",").map((v) => v.trim().toLowerCase()).filter(Boolean) ?? [];
  const salaryMin = Number(searchParams.get("salary_min") ?? 0);
  const salaryMax = Number(searchParams.get("salary_max") ?? 200);

  const updateParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page"); // any filter change invalidates the current page position
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") params.delete(key);
      else params.set(key, value);
    }
    router.push(`/?${params.toString()}`);
  };

  const handleRemoteTypeChange = (values: string[]) => {
    const normalized = values.map((value) => value.trim().toLowerCase()).filter(Boolean);
    updateParams({ remote_type: normalized.length ? normalized.join(",") : null });
  };

  const handleLanguageChange = (values: string[]) => {
    const normalized = values.map((value) => value.trim().toLowerCase()).filter(Boolean);
    updateParams({ language: normalized.length ? normalized.join(",") : null });
  };

  const handleSalaryChange = (value: number[]) => {
    updateParams({ salary_min: String(value[0]), salary_max: String(value[1]) });
  };

  const debouncedSalaryUpdate = useDebouncedCallback((value: number[]) => {
  updateParams({ salary_min: String(value[0]), salary_max: String(value[1]) });
}, 400);

  return (
    <Box bg="surface" p={4} borderRadius="md" border="1px solid #E5E3DD">
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
        min={0}
        max={300}
        step={10}
        value={[salaryMin, salaryMax]}
        onValueChange={(e) => debouncedSalaryUpdate(e.value)}
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
      <Text fontSize="sm" color="gray.600">${salaryMin}k – ${salaryMax}k</Text>
    </Box>
  );
}