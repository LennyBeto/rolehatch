// frontend/app/applicant/cover-letter-builder/page.tsx
import { Suspense } from "react";
import { Box } from "@chakra-ui/react";
import CoverLetterBuilder from "@/components/cover-letter/CoverLetterBuilder";

export const metadata = { title: "Build Your Cover Letter — PerchRole" };

export default function CoverLetterBuilderPage() {
  return (
    <Suspense fallback={<Box minH="60vh" />}>
      <CoverLetterBuilder />
    </Suspense>
  );
}