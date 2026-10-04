// frontend/app/blog/BlogIndexClient.tsx
"use client";
import { Box, Heading, Text, SimpleGrid, Badge, HStack, Link as ChakraLink } from "@chakra-ui/react";
import NextLink from "next/link";
import { BLOG_POSTS, readingTime } from "@/lib/blogPosts";

export default function BlogIndexClient() {
  const posts = BLOG_POSTS.slice().sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  return (
    <Box bg="background" minH="100vh">
      <Box maxW="1000px" mx="auto" px={4} py={12}>
        <Heading size="lg" color="text" mb={2}>PerchRole Blog</Heading>
        <Text color="gray.600" mb={10}>Notes on job search, hiring, and how PerchRole works.</Text>

        <SimpleGrid columns={{ base: 1, md: 2 }} gap={6}>
          {posts.map((post) => (
            <ChakraLink
              key={post.slug}
              asChild
              display="block"
              h="100%"
              _hover={{ textDecoration: "none" }}
            >
              <NextLink href={`/blog/${post.slug}`}>
                <Box
                  bg="surface"
                  p={6}
                  h="100%"
                  display="flex"
                  flexDirection="column"
                  borderRadius="lg"
                  border="1px solid #E5E3DD"
                  transition="box-shadow 0.15s ease, transform 0.15s ease"
                  _hover={{ boxShadow: "0 4px 16px rgba(0,0,0,0.08)", transform: "translateY(-2px)" }}
                >
                  <HStack justify="space-between" mb={3}>
                    <Badge colorPalette="brand" variant="subtle">{post.category}</Badge>
                    <Text fontSize="xs" color="gray.500">{readingTime(post.content)}</Text>
                  </HStack>
                  <Text fontSize="xs" color="gray.500" mb={2}>
                    {new Date(post.publishedAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </Text>
                  <Heading size="md" color="text" mb={2}>{post.title}</Heading>
                  <Text color="gray.600" fontSize="sm" flex={1}>{post.excerpt}</Text>
                  <Text color="brand.500" fontSize="sm" fontWeight="600" mt={4}>Read more →</Text>
                </Box>
              </NextLink>
            </ChakraLink>
          ))}
        </SimpleGrid>
      </Box>
    </Box>
  );
}