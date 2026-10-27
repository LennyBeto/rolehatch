// frontend/app/blog/page.tsx
import type { Metadata } from "next";
import BlogIndexClient from "./BlogIndexClient";
import JsonLd from "@/components/JsonLd";
import { BLOG_POSTS } from "@/lib/blogPosts";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

const TITLE = "Blog — PerchRole";
const DESCRIPTION =
  "Notes on job search, hiring, and how PerchRole sources verified tech jobs directly from employers.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/blog" },
  openGraph: {
    type: "website",
    title: TITLE,
    description: DESCRIPTION,
    url: "/blog",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: `${SITE_NAME} Blog`,
    description: DESCRIPTION,
    url: `${SITE_URL}/blog`,
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    blogPost: BLOG_POSTS.map((post) => ({
      "@type": "BlogPosting",
      headline: post.title,
      description: post.excerpt,
      datePublished: post.publishedAt,
      url: `${SITE_URL}/blog/${post.slug}`,
    })),
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
    ],
  },
];

export default function BlogIndexPage() {
  return (
    <>
      {structuredData.map((data, i) => (
        <JsonLd key={i} data={data} />
      ))}
      <BlogIndexClient />
    </>
  );
}