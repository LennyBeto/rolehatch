// frontend/app/applicant/cover-letter-templates/page.tsx
"use client";
import { Box, Button, Heading, Text } from "@chakra-ui/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LuArrowLeft } from "react-icons/lu";
import { useAuth } from "@/lib/AuthContext";
import CoverLetterTemplatePicker from "@/components/cover-letter/CoverLetterTemplatePicker";

export default function CoverLetterTemplatesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

  if (loading || !user) return null;

  return (
    <Box maxW="1100px" mx="auto" px={4} py={12}>
      <Heading size="lg" color="text" mb={1}>Cover Letter Templates</Heading>
      <Text color="gray.600" mb={8}>
        Pick a template, fill in your details, and download a clean cover letter that applicant tracking
        systems can read. Every layout is single-column, text-only, and uses standard fonts.
      </Text>
      <CoverLetterTemplatePicker />

      <Box mt={10} pt={6} borderTop="1px solid #E5E3DD">
        <Button asChild variant="outline" colorPalette="brand" size="md">
          <Link href="/applicant/dashboard">
            <LuArrowLeft /> Back to Dashboard
          </Link>
        </Button>
      </Box>
    </Box>
  );
}