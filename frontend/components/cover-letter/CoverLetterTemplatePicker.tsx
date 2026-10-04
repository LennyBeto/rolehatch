// frontend/components/cover-letter/CoverLetterTemplatePicker.tsx
import { Badge, Box, Button, Heading, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import Link from "next/link";
import CoverLetterPreview from "./CoverLetterPreview";
import { COVER_LETTER_TEMPLATES, SAMPLE_COVER_LETTER } from "@/lib/coverLetterTemplates";

const PREVIEW_SCALE = 0.32;

export default function CoverLetterTemplatePicker() {
  return (
    <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} gap={6}>
      {COVER_LETTER_TEMPLATES.map((t) => (
        <Stack key={t.id} gap={3} bg="surface" border="1px solid #E5E3DD" borderRadius="lg" p={4}>
          <Box
            position="relative"
            height="360px"
            overflow="hidden"
            borderRadius="md"
            border="1px solid #E5E3DD"
            bg="gray.100"
            aria-hidden="true"
          >
            <Box
              position="absolute"
              top={0}
              left="50%"
              width="794px"
              style={{
                transform: `translateX(-50%) scale(${PREVIEW_SCALE})`,
                transformOrigin: "top center",
                pointerEvents: "none",
              }}
            >
              <CoverLetterPreview data={SAMPLE_COVER_LETTER} templateId={t.id} />
            </Box>
          </Box>

          <Box>
            <Stack direction="row" align="center" justify="space-between" mb={1}>
              <Heading size="sm" color="text">{t.name}</Heading>
              <Badge colorPalette="brand" variant="subtle">ATS-friendly</Badge>
            </Stack>
            <Text fontSize="sm" color="gray.600">{t.description}</Text>
          </Box>

          <Button asChild colorPalette="brand" w="full">
            <Link href={`/applicant/cover-letter-builder?template=${t.id}`}>Use this template</Link>
          </Button>
        </Stack>
      ))}
    </SimpleGrid>
  );
}