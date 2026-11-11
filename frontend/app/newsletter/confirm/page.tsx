// frontend/app/newsletter/confirm/page.tsx
import { Suspense } from "react";
import NewsletterActionPage from "@/components/NewsletterActionPage";

export const metadata = {
  title: "Confirm subscription — PerchRole",
  robots: { index: false },
};

export default function ConfirmNewsletterPage() {
  return (
    <Suspense fallback={null}>
      <NewsletterActionPage action="confirm" />
    </Suspense>
  );
}