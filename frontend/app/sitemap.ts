// frontend/app/sitemap.ts
import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://perchrole.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "hourly", priority: 1 },
    { url: `${SITE_URL}/post-job`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/pricing`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/company`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/blog`, changeFrequency: "weekly", priority: 0.4 },
    { url: `${SITE_URL}/contact`, changeFrequency: "yearly", priority: 0.2 },
  ];

  try {
    // Revalidated hourly, and force-busted right after each scrape cycle via
    // /api/revalidate — so the sitemap Google fetches always reflects the
    // latest sync, not a stale one up to an hour old.
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/jobs/sitemap-data`, {
      next: { revalidate: 1800 },
    });
    if (!res.ok) return staticRoutes;

    const jobs: { id: string; updated_at: string | null }[] = await res.json();
    const jobRoutes: MetadataRoute.Sitemap = jobs.map((job) => ({
      url: `${SITE_URL}/jobs/${job.id}`,
      lastModified: job.updated_at ?? undefined,
      changeFrequency: "daily",
      priority: 0.8,
    }));

    return [...staticRoutes, ...jobRoutes];
  } catch {
    return staticRoutes;
  }
}