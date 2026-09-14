// frontend/components/FilterSidebar.tsx
"use client";
import { Box, Heading, CheckboxGroup, Checkbox, Stack, RangeSlider,
  RangeSliderTrack, RangeSliderFilledTrack, RangeSliderThumb, Text } from "@chakra-ui/react";
import { useState } from "react";

const REMOTE_TYPES = ["Remote", "Hybrid", "Onsite", "Field"];

export default function FilterSidebar() {
  const [salary, setSalary] = useState([0, 200]);

  return (
    <Box bg="surface" p={4} borderRadius="md" border="1px solid #E5E3DD">
      <Heading size="sm" mb={3}>Environment</Heading>
      <CheckboxGroup colorScheme="brand">
        <Stack spacing={2} mb={5}>
          {REMOTE_TYPES.map((type) => (
            <Checkbox key={type} value={type.toLowerCase()}>{type}</Checkbox>
          ))}
        </Stack>
      </CheckboxGroup>

      <Heading size="sm" mb={3}>Salary ($k/yr)</Heading>
      <RangeSlider
        colorScheme="brand"
        min={0} max={300} step={10}
        value={salary}
        onChange={setSalary}
        mb={2}
      >
        <RangeSliderTrack><RangeSliderFilledTrack /></RangeSliderTrack>
        <RangeSliderThumb index={0} />
        <RangeSliderThumb index={1} />
      </RangeSlider>
      <Text fontSize="sm" color="gray.600">${salary[0]}k – ${salary[1]}k</Text>
    </Box>
  );
}