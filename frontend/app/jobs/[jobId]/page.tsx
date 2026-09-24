// frontend/app/jobs/[jobId]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Box, Heading, Text, Badge, HStack, Button, Flex, Image, Wrap, Container,
} from "@chakra-ui/react";
import JobActions from "@/components/JobActions";

type JobDetail = {
  id: string; title: string; location: string | null;
  remote_type: string | null; commitment: string | null;
  level: string | null; tech_stack: string[] | null; description: string | null;
  salary_min: number | null; salary_max: number | null;
  source: string; source_url: string; is_active: boolean;
  is_featured: boolean; posted_at: string | null;
  company_name: string | null; company_domain: string | null;
};

const LEVEL_LABELS: Record<string, string> = {
  entry: "Entry Level",
  mid: "Mid Level",
  senior: "Senior Level",
};

async function getJob(jobId: string): Promise<JobDetail | null> {
  try {
    // revalidate hourly — matches the scrape cycle, and is force-busted early
    // via /api/revalidate right after each sync run (see internal.py)
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/jobs/${jobId}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ jobId: string }> }
): Promise<Metadata> {
  const { jobId } = await params;
  const job = await getJob(jobId);
  if (!job) return { title: "Job not found — PerchRole" };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://perchrole.com";
  const title = `${job.title} at ${job.company_name ?? "a top company"} | PerchRole`;
  const description = job.description
    ? job.description.slice(0, 155)
    : `${job.title} — ${job.location ?? "Remote/On-site"}. Apply directly, sourced straight from ${job.company_name ?? "the employer"}'s career page.`;
  const canonical = `${siteUrl}/jobs/${job.id}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: "website" },
    twitter: { card: "summary", title, description },
    robots: job.is_active
      ? { index: true, follow: true }
      : { index: false, follow: false },
  };
}

export default async function JobDetailPage(
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const job = await getJob(jobId);
  if (!job) notFound();

  const logoUrl = job.company_domain
    ? `https://www.google.com/s2/favicons?domain=${job.company_domain}&sz=128`
    : null;

  // Google for Jobs structured data:
  // https://developers.google.com/search/docs/appearance/structured-data/job-posting
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org/",
    "@type": "JobPosting",
    title: job.title,
    description: job.description ?? job.title,
    ...(job.posted_at ? { datePosted: job.posted_at } : {}),
    ...(job.commitment ? { employmentType: job.commitment.toUpperCase() } : {}),
    hiringOrganization: {
      "@type": "Organization",
      name: job.company_name ?? "Unknown",
      ...(job.company_domain ? { sameAs: `https://${job.company_domain}` } : {}),
    },
    ...(job.location
      ? {
          jobLocation: {
            "@type": "Place",
            address: { "@type": "PostalAddress", addressLocality: job.location },
          },
        }
      : {}),
    ...(job.remote_type === "remote" ? { jobLocationType: "TELECOMMUTE" } : {}),
    ...(job.salary_min
      ? {
          baseSalary: {
            "@type": "MonetaryAmount",
            currency: "USD",
            value: {
              "@type": "QuantitativeValue",
              minValue: job.salary_min * 1000,
              maxValue: (job.salary_max ?? job.salary_min) * 1000,
              unitText: "YEAR",
            },
          },
        }
      : {}),
    directApply: true,
  };

  return (
    <Container maxW="800px" py={10}>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Text fontSize="sm" mb={4}>
        <Link href="/">← Back to all jobs</Link>
      </Text>

      <Flex gap={4} align="flex-start" mb={6}>
        {logoUrl && (
          <Image src={logoUrl} alt={`${job.company_name ?? "Company"} logo`} boxSize="56px" borderRadius="md" />
        )}
        <Box flex={1}>
          <Heading as="h1" size="lg" color="text" mb={1}>{job.title}</Heading>
          <Text color="gray.600">
            {job.company_name ?? "Company"} · {job.location ?? "Location unspecified"}
          </Text>
        </Box>
        {job.is_featured && (
          <Badge colorPalette="orange" variant="solid" borderRadius="full" px={3}>FEATURED</Badge>
        )}
      </Flex>

      <HStack gap={2} mb={6} flexWrap="wrap">
        {job.remote_type && <Badge colorPalette="brand" variant="subtle" textTransform="capitalize">{job.remote_type}</Badge>}
        {job.level && <Badge variant="outline">{LEVEL_LABELS[job.level] ?? job.level}</Badge>}
        {job.commitment && <Badge variant="outline">{job.commitment}</Badge>}
        <Badge variant="outline" textTransform="capitalize">{job.source}</Badge>
        {job.salary_min && (
          <Badge variant="outline">${job.salary_min}k – ${job.salary_max ?? job.salary_min}k</Badge>
        )}
      </HStack>

      {job.tech_stack && job.tech_stack.length > 0 && (
        <Wrap gap={2} mb={6}>
          {job.tech_stack.map((t) => (
            <Badge key={t} variant="subtle" colorPalette="gray" textTransform="capitalize">{t}</Badge>
          ))}
        </Wrap>
      )}

      {job.description && (
        <Box mb={8}>
          <Heading as="h2" size="sm" mb={2}>About this role</Heading>
          <Text whiteSpace="pre-wrap" color="text" fontSize="sm" lineHeight="1.7">{job.description}</Text>
        </Box>
      )}

      <HStack gap={3} mb={4}>
        <Button asChild colorPalette="brand" size="lg">
          <a href={job.source_url} target="_blank" rel="noopener noreferrer">
            Apply on {job.company_name ?? "employer site"}
          </a>
        </Button>
      </HStack>

      {/* Save / Mark Applied / Hide remain gated behind sign-in inside JobActions */}
      <JobActions jobId={job.id} />
    </Container>
  );
}