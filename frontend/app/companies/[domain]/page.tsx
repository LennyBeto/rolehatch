// frontend/app/companies/[domain]/page.tsx
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import CompanyProfileView, { type CompanyPageData } from "@/components/CompanyProfileView";

type Props = { params: Promise<{ domain: string }> };

async function getCompany(domain: string): Promise<CompanyPageData | null> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/companies/${encodeURIComponent(domain)}`,
    { next: { revalidate: 300 } }, // profile edits can take up to 5 minutes to appear
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to load company");
  return res.json();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { domain } = await params;
  const company = await getCompany(domain).catch(() => null);
  if (!company) return { title: "Company not found — PerchRole" };
  return {
    title: `${company.name} jobs — PerchRole`,
    description:
      company.profile?.tagline ??
      `Open roles at ${company.name}, listed directly from their career pages.`,
  };
}

export default async function CompanyPage({ params }: Props) {
  const { domain } = await params;
  const company = await getCompany(domain);
  if (!company) notFound();
  return <CompanyProfileView company={company} />;
}