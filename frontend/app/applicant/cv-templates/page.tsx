// frontend/app/applicant/cv-templates/page.tsx
"use client";
import { Box, Heading, Text } from "@chakra-ui/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import CVTemplatePicker from "@/components/CVTemplatePicker";

export default function CVTemplatesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

  if (loading || !user) return null;

  return (
    <Box maxW="1100px" mx="auto" px={4} py={12}>
      <Heading size="lg" color="text" mb={1}>CV Templates</Heading>
      <Text color="gray.600" mb={8}>
        Upload your CV, pick a template, and download a clean version that applicant tracking systems can read.
      </Text>
      <CVTemplatePicker />
    </Box>
  );
}