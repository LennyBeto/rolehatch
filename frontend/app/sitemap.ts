// frontend/app/sitemap.ts
import type { MetadataRoute } from "next";
import { BLOG_POSTS } from "@/lib/blogPosts";
import { SITE_URL } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "hourly", priority: 1 },
    { url: `${SITE_URL}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/company`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.4 },
    { url: `${SITE_URL}/contact`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.1 },
    { url: `${SITE_URL}/terms`, changeFrequency: "yearly", priority: 0.1 },
  ];

  const blogRoutes: MetadataRoute.Sitemap = BLOG_POSTS.map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.publishedAt),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const baseRoutes = [...staticRoutes, ...blogRoutes];

  try {
    // Cached for 30 minutes (1800s), and force-busted right after each scrape
    // cycle via /api/revalidate, so the sitemap Google fetches always reflects
    // the latest sync rather than a stale one.
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/jobs/sitemap-data`, {
      next: { revalidate: 1800 },
    });
    if (!res.ok) return baseRoutes;

    const jobs: { id: string; updated_at: string | null }[] = await res.json();
    const jobRoutes: MetadataRoute.Sitemap = jobs.map((job) => ({
      url: `${SITE_URL}/jobs/${job.id}`,
      lastModified: job.updated_at ?? undefined,
      changeFrequency: "daily",
      priority: 0.8,
    }));

    return [...baseRoutes, ...jobRoutes];
  } catch {
    return baseRoutes;
  }
}