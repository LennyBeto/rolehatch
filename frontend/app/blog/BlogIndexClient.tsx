// frontend/app/blog/BlogIndexClient.tsx
"use client";
import { Box, Heading, Text, Stack, Link as ChakraLink } from "@chakra-ui/react";
import NextLink from "next/link";
import { BLOG_POSTS } from "@/lib/blogPosts";

export default function BlogIndexClient() {
  return (
    <Box bg="background" minH="100vh">
      <Box maxW="700px" mx="auto" px={4} py={12}>
        <Heading size="lg" color="text" mb={2}>PerchRole Blog</Heading>
        <Text color="gray.600" mb={10}>Notes on job search, hiring, and how PerchRole works.</Text>

        <Stack gap={4}>
          {BLOG_POSTS.slice().reverse().map((post) => (
            <ChakraLink key={post.slug} asChild _hover={{ textDecoration: "none" }}>
              <NextLink href={`/blog/${post.slug}`}>
                <Box
                  bg="surface"
                  p={5}
                  borderRadius="lg"
                  border="1px solid #E5E3DD"
                  transition="box-shadow 0.15s ease"
                  _hover={{ boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}
                >
                  <Text fontSize="xs" color="gray.500" mb={2}>
                    {new Date(post.publishedAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
                  </Text>
                  <Heading size="md" color="text" mb={2}>{post.title}</Heading>
                  <Text color="gray.600" fontSize="sm">{post.excerpt}</Text>
                </Box>
              </NextLink>
            </ChakraLink>
          ))}
        </Stack>
      </Box>
    </Box>
  );
}