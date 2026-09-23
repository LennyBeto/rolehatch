// frontend/app/blog/BlogIndexClient.tsx
"use client";
import { Box, Heading, Text, Stack, Link as ChakraLink } from "@chakra-ui/react";
import NextLink from "next/link";
import { BLOG_POSTS } from "@/lib/blogPosts";

export default function BlogIndexClient() {
  return (
    <Box maxW="700px" mx="auto" px={4} py={12}>
      <Heading size="lg" color="text" mb={2}>PerchRole Blog</Heading>
      <Text color="gray.600" mb={8}>Notes on job search, hiring, and how PerchRole works.</Text>

      <Stack gap={8}>
        {BLOG_POSTS.slice().reverse().map((post) => (
          <Box key={post.slug} borderBottom="1px solid #E5E3DD" pb={6}>
            <Text fontSize="xs" color="gray.500" mb={1}>
              {new Date(post.publishedAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
            </Text>
            <ChakraLink as={NextLink} href={`/blog/${post.slug}`}>
              <Heading size="md" color="text" mb={2}>{post.title}</Heading>
            </ChakraLink>
            <Text color="gray.600" fontSize="sm">{post.excerpt}</Text>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}