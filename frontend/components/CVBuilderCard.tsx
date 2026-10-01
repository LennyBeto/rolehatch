// frontend/components/CVBuilderCard.tsx
import { Box, Heading, Text, Button } from "@chakra-ui/react";
import Link from "next/link";

export default function CVBuilderCard() {
  return (
    <Box bg="surface" p={5} borderRadius="lg" border="1px solid #E5E3DD">
      <Heading size="sm" mb={1}>ATS-ready CV templates</Heading>
      <Text fontSize="sm" color="gray.600" mb={3}>
        Upload a PDF or Google Doc and convert it into one of 5 ATS-friendly templates.
      </Text>
      <Button asChild colorPalette="brand" size="sm">
        <Link href="/applicant/cv-templates">Build my CV</Link>
      </Button>
    </Box>
  );
}