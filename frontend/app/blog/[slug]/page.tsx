// frontend/app/blog/[slug]/page.tsx
import { Box, Heading, Text, Stack, Badge, HStack, Link as ChakraLink } from "@chakra-ui/react";
import NextLink from "next/link";
import { notFound } from "next/navigation";
import { BLOG_POSTS, readingTime } from "@/lib/blogPosts";

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
  return {
    title: post ? `${post.title} — PerchRole Blog` : "Post not found",
    description: post?.excerpt,
  };
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
    <Box bg="background" minH="100vh">
      <Box maxW="700px" mx="auto" px={4} py={12}>
        <ChakraLink asChild fontSize="sm" color="brand.500" _hover={{ textDecoration: "none" }}>
          <NextLink href="/blog">← Back to blog</NextLink>
        </ChakraLink>

        <HStack mt={6} mb={3} gap={3}>
          <Badge colorPalette="brand" variant="subtle">{post.category}</Badge>
          <Text fontSize="sm" color="gray.500">
            {new Date(post.publishedAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
            {" · "}
            {readingTime(post.content)}
          </Text>
        </HStack>

        <Heading size="lg" color="text" mb={6}>{post.title}</Heading>
        <Stack gap={4}>
          {post.content.split("\n\n").map((para, i) => (
            <Text key={i} color="text" fontSize="md" lineHeight="1.7">{para}</Text>
          ))}
        </Stack>
      </Box>
    </Box>
  );
}