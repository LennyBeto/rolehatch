// frontend/app/blog/[slug]/page.tsx
import { Box, Heading, Text, Stack } from "@chakra-ui/react";
import { notFound } from "next/navigation";
import { BLOG_POSTS } from "@/lib/blogPosts";

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  return { title: post ? `${post.title} — PerchRole Blog` : "Post not found" };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  if (!post) notFound();

  return (
    <Box maxW="700px" mx="auto" px={4} py={12}>
      <Text fontSize="sm" color="gray.500" mb={2}>
        {new Date(post.publishedAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
      </Text>
      <Heading size="lg" color="text" mb={6}>{post.title}</Heading>
      <Stack gap={4}>
        {post.content.split("\n\n").map((para, i) => (
          <Text key={i} color="text" fontSize="md" lineHeight="1.7">{para}</Text>
        ))}
      </Stack>
    </Box>
  );
}