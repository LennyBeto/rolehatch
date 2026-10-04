// frontend/components/CoverLetterBuilderCard.tsx
import { Box, Button, Heading, Text } from "@chakra-ui/react";
import Link from "next/link";
import { LuFileText } from "react-icons/lu";

export default function CoverLetterBuilderCard() {
  return (
    <Box bg="surface" border="1px solid #E5E3DD" borderRadius="md" p={5}>
      <Heading size="sm" mb={1}>Cover Letter Builder</Heading>
      <Text fontSize="sm" color="gray.600" mb={4}>
        Write an ATS-friendly cover letter from one of 5 clean templates, then save it as a PDF.
      </Text>
      <Button asChild colorPalette="brand" size="sm">
        <Link href="/applicant/cover-letter-templates">
          <LuFileText /> Build my Cover Letter
        </Link>
      </Button>
    </Box>
  );
}