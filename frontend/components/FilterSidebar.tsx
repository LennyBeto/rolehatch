// frontend/components/FilterSidebar.tsx
"use client";
import {
  Box, Heading, CheckboxGroup, Checkbox, VStack, Slider, Text,
} from "@chakra-ui/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "@/lib/useDebouncedCallback";

const REMOTE_TYPES = ["Remote", "Hybrid", "Onsite", "Field"];

export default function FilterSidebar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectedRemoteTypes = searchParams.get("remote_type")?.split(",").filter(Boolean) ?? [];
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
    updateParams({ remote_type: values.length ? values.join(",") : null });
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
            <Checkbox.Root key={type} value={type.toLowerCase()}>
              <Checkbox.HiddenInput />
              <Checkbox.Control />
              <Checkbox.Label>{type}</Checkbox.Label>
            </Checkbox.Root>
          ))}
        </VStack>
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