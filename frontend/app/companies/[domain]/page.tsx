// frontend/app/companies/[domain]/page.tsx
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import CompanyProfileView, { type CompanyPageData } from "@/components/CompanyProfileView";
import JsonLd from "@/components/JsonLd";
import { SITE_URL } from "@/lib/seo";

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

  const title = `${company.name} jobs — PerchRole`;
  const description =
    company.profile?.tagline ??
    `Open roles at ${company.name}, listed directly from their career pages.`;

  return {
    title,
    description,
    alternates: { canonical: `/companies/${company.domain}` },
    openGraph: { type: "website", title, description, url: `/companies/${company.domain}` },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function CompanyPage({ params }: Props) {
  const { domain } = await params;
  const company = await getCompany(domain);
  if (!company) notFound();

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: company.name,
      url: company.profile?.website_url ?? `https://${company.domain}`,
      ...(company.profile?.tagline ? { description: company.profile.tagline } : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        {
          "@type": "ListItem",
          position: 2,
          name: company.name,
          item: `${SITE_URL}/companies/${company.domain}`,
        },
      ],
    },
  ];

  return (
    <>
      {structuredData.map((data, i) => (
        <JsonLd key={i} data={data} />
      ))}
      <CompanyProfileView company={company} />
    </>
  );
}