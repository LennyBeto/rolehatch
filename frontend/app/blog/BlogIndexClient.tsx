// frontend/app/blog/BlogIndexClient.tsx
import { Box, Heading, Text, Stack } from "@chakra-ui/react";
import NextLink from "next/link";
import { BLOG_POSTS } from "@/lib/blogPosts";

const formatPublishedDate = (dateString: string) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(dateString));

export default function BlogIndexClient() {
  return (
    <Box maxW="700px" mx="auto" px={4} py={12}>
      <Heading size="lg" color="text" mb={2}>PerchRole Blog</Heading>
      <Text color="gray.600" mb={8}>Notes on job search, hiring, and how PerchRole works.</Text>

      <Stack gap={8}>
        {BLOG_POSTS.slice().reverse().map((post) => (
          <Box key={post.slug} borderBottom="1px solid #E5E3DD" pb={6}>
            <Text fontSize="xs" color="gray.500" mb={1}>
              {formatPublishedDate(post.publishedAt)}
            </Text>
            <NextLink href={`/blog/${post.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
              <Heading size="md" color="text" mb={2}>{post.title}</Heading>
            </NextLink>
            <Text color="gray.600" fontSize="sm">{post.excerpt}</Text>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}