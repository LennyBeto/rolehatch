// frontend/app/blog/[slug]/page.tsx
import { Box, Heading, Text, Stack, Badge, HStack, Link as ChakraLink } from "@chakra-ui/react";
import type { Metadata } from "next";
import NextLink from "next/link";
import { notFound } from "next/navigation";
import { BLOG_POSTS, readingTime } from "@/lib/blogPosts";
import JsonLd from "@/components/JsonLd";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);

  if (!post) {
    return { title: "Post not found — PerchRole Blog", robots: { index: false, follow: false } };
  }

  const title = `${post.title} — PerchRole Blog`;
  return {
    title,
    description: post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      url: `/blog/${post.slug}`,
      publishedTime: post.publishedAt,
      section: post.category,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  if (!post) notFound();

  const postUrl = `${SITE_URL}/blog/${post.slug}`;

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: post.excerpt,
      articleSection: post.category,
      datePublished: post.publishedAt,
      dateModified: post.publishedAt,
      mainEntityOfPage: postUrl,
      url: postUrl,
      author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
      publisher: {
        "@type": "Organization",
        name: SITE_NAME,
        logo: { "@type": "ImageObject", url: `${SITE_URL}/logo.svg` },
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
        { "@type": "ListItem", position: 3, name: post.title, item: postUrl },
      ],
    },
  ];

  return (
    <Box bg="background" minH="100vh">
      {structuredData.map((data, i) => (
        <JsonLd key={i} data={data} />
      ))}
      <Box maxW="700px" mx="auto" px={4} py={12}>
        <ChakraLink asChild fontSize="sm" color="brand.500" _hover={{ textDecoration: "none" }}>
          <NextLink href="/blog">← Back to blog</NextLink>
        </ChakraLink>

        <HStack mt={6} mb={3} gap={3}>
          <Badge colorPalette="brand" variant="subtle">{post.category}</Badge>
          <Text fontSize="sm" color="gray.500">
            <time dateTime={post.publishedAt}>
              {new Date(post.publishedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </time>
            {" · "}
            {readingTime(post.content)}
          </Text>
        </HStack>

        {/* as="h1": same visual size, but gives the page a real H1 for search engines and screen readers */}
        <Heading as="h1" size="lg" color="text" mb={6}>{post.title}</Heading>
        <Stack gap={4}>
          {post.content.split("\n\n").map((para, i) => (
            <Text key={i} color="text" fontSize="md" lineHeight="1.7">{para}</Text>
          ))}
        </Stack>
      </Box>
    </Box>
  );
}