// frontend/components/ATSMatchScore.tsx
"use client";
import { Box, Button, Collapsible, Flex, Heading, Stack, Text } from "@chakra-ui/react";
import { useState } from "react";
import { LuChevronDown } from "react-icons/lu";

export type ATSBreakdownItem = { label: string; value: number };

type Props = {
  overall: number;
  breakdown: ATSBreakdownItem[];
  defaultOpen?: boolean;
};

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export default function ATSMatchScore({ overall, breakdown, defaultOpen = true }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = "ats-score-details";

  return (
    <Box pt={5} borderTop="1px solid" borderColor="line">
      <Flex align="center" justify="space-between" gap={3} wrap="wrap">
        <Heading as="h3" size="md" color="text">
          ATS Match Score
        </Heading>

        <Flex align="center" gap={2}>
          <Box
            bg="brand.subtle"
            color="brand.fg"
            fontWeight="700"
            fontSize="md"
            px={3}
            py={1}
            borderRadius="full"
            aria-label={`Overall ATS match score ${clamp(overall)} percent`}
          >
            {clamp(overall)}%
          </Box>

          <Button
            size="xs"
            variant="ghost"
            color="brand.fg"
            borderRadius="full"
            px={3}
            aria-expanded={open}
            aria-controls={contentId}
            onClick={() => setOpen((prev) => !prev)}
            _hover={{ bg: "brand.subtle" }}
            _focusVisible={{
              outline: "2px solid",
              outlineColor: "brand.focusRing",
              outlineOffset: "2px",
            }}
          >
            {open ? "Hide details" : "Show details"}
            <Box
              as={LuChevronDown}
              ml={1}
              transform={open ? "rotate(180deg)" : "rotate(0deg)"}
              transition="transform 0.15s ease"
              _motionReduce={{ transition: "none" }}
              aria-hidden
            />
          </Button>
        </Flex>
      </Flex>

      <Collapsible.Root open={open}>
        <Collapsible.Content id={contentId} _motionReduce={{ animation: "none" }}>
          <Stack gap={4} pt={4}>
            {breakdown.map((item) => {
              const value = clamp(item.value);
              return (
                <Box key={item.label}>
                  <Flex justify="space-between" mb={1}>
                    <Text fontSize="sm" color="text" opacity={0.8}>
                      {item.label}
                    </Text>
                    <Text fontSize="sm" color="text" opacity={0.8}>
                      {value}%
                    </Text>
                  </Flex>
                  <Box
                    role="progressbar"
                    aria-label={item.label}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={value}
                    h="8px"
                    bg="brand.muted"
                    borderRadius="full"
                    overflow="hidden"
                  >
                    <Box
                      h="100%"
                      w={`${value}%`}
                      bg="brand.focusRing"
                      borderRadius="full"
                      transition="width 0.3s ease"
                      _motionReduce={{ transition: "none" }}
                    />
                  </Box>
                </Box>
              );
            })}
          </Stack>
        </Collapsible.Content>
      </Collapsible.Root>
    </Box>
  );
}