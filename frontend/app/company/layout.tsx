// frontend/app/company/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About PerchRole — Jobs Sourced Directly From Employers",
  description:
    "PerchRole syncs hourly with company career pages and applicant tracking systems, so every listing is real, current and free for job seekers.",
  alternates: { canonical: "/company" },
};

export default function CompanyLayout({ children }: { children: React.ReactNode }) {
  return children;
}