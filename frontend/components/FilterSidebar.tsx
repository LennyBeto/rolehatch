// frontend/components/FilterSidebar.tsx
"use client";
import {
  Box, Heading, CheckboxGroup, Checkbox, Stack, Slider, Text,
} from "@chakra-ui/react";
import { useState } from "react";

const REMOTE_TYPES = ["Remote", "Hybrid", "Onsite", "Field"];

export default function FilterSidebar() {
  const [salary, setSalary] = useState([0, 200]);

  return (
    <Box bg="surface" p={4} borderRadius="md" border="1px solid #E5E3DD">
      <Heading size="sm" mb={3}>Environment</Heading>
      <CheckboxGroup colorPalette="brand">
        <Stack spacing={2} mb={5}>
          {REMOTE_TYPES.map((type) => (
            <Checkbox.Root key={type} value={type.toLowerCase()}>
              <Checkbox.HiddenInput />
              <Checkbox.Control />
              <Checkbox.Label>{type}</Checkbox.Label>
            </Checkbox.Root>
          ))}
        </Stack>
      </CheckboxGroup>

      <Heading size="sm" mb={3}>Salary ($k/yr)</Heading>
      <Slider.Root
        colorPalette="brand"
        min={0}
        max={300}
        step={10}
        value={salary}
        onValueChange={(e) => setSalary(e.value)}
        mb={2}
      >
        <Slider.Control>
          <Slider.Track>
            <Slider.Range />
          </Slider.Track>
          <Slider.Thumb index={0}>
            <Slider.HiddenInput />
          </Slider.Thumb>
          <Slider.Thumb index={1}>
            <Slider.HiddenInput />
          </Slider.Thumb>
        </Slider.Control>
      </Slider.Root>
      <Text fontSize="sm" color="gray.600">${salary[0]}k – ${salary[1]}k</Text>
    </Box>
  );
}