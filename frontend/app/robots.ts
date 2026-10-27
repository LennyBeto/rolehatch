// frontend/app/robots.ts
import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://perchrole.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Private, signed-in or transactional pages: nothing here should rank
      disallow: ["/dashboard", "/post-job", "/applicant/", "/promote/", "/auth/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}