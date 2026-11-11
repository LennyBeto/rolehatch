// frontend/app/newsletter/unsubscribe/page.tsx
import { Suspense } from "react";
import NewsletterActionPage from "@/components/NewsletterActionPage";

export const metadata = {
  title: "Unsubscribe — PerchRole",
  robots: { index: false },
};

export default function UnsubscribeNewsletterPage() {
  return (
    <Suspense fallback={null}>
      <NewsletterActionPage action="unsubscribe" />
    </Suspense>
  );
}