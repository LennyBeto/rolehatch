// frontend/components/HeroSection.tsx
"use client";
import {
  Box, Heading, Text, Input, Button, Flex, HStack, createListCollection,
  Select, Portal,
} from "@chakra-ui/react";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const CATEGORIES = createListCollection({
  items: [
    { label: "All Categories", value: "" },
    { label: "Backend", value: "backend" },
    { label: "Frontend", value: "frontend" },
    { label: "DevOps", value: "devops" },
    { label: "Data / ML", value: "data" },
    { label: "Product", value: "product" },
    { label: "Design", value: "design" },
  ],
});

export default function HeroSection() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [title, setTitle] = useState(searchParams.get("title") ?? "");
  const [location, setLocation] = useState(searchParams.get("location") ?? "");
  const [category, setCategory] = useState<string[]>(
    searchParams.get("category") ? [searchParams.get("category")!] : [""]
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Preserve existing params (quick_filter, remote_type, salary_min, etc.)
    // instead of dropping/merging them into the free-text title — folding
    // quick_filter into title reintroduced the broad word-split matching
    // that made the quick filter chips return too many results.
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");

    const combinedTitle = [title, category[0]].filter(Boolean).join(" ");
    if (combinedTitle) params.set("title", combinedTitle);
    else params.delete("title");

    if (location) params.set("location", location);
    else params.delete("location");

    router.push(`/?${params.toString()}#listings`);
  };

  return (
    <Box bg="background" py={{ base: 10, md: 20 }} px={4} textAlign="center">
      <Heading
        as="h1"
        fontSize={{ base: "2xl", md: "4xl" }}
        color="text"
        mb={4}
        fontWeight="700"
      >
        Find Verified Global Tech Jobs, Sourced Directly From Employers
      </Heading>
      <Text color="gray.600" fontSize={{ base: "md", md: "lg" }} mt={1} mb={8} maxW="600px" mx="auto">
        PerchRole pulls listings straight from company career pages — no reposts,
        no stale ads. Free for job seekers, always.
      </Text>

      <Box
        as="form"
        onSubmit={handleSearch}
        bg="surface"
        p={{ base: 3, md: 4 }}
        borderRadius="lg"
        boxShadow="0 4px 20px rgba(0,0,0,0.06)"
        maxW="900px"
        mx="auto"
        border="1px solid #E5E3DD"
      >
        <Flex direction={{ base: "column", md: "row" }} gap={3} w="full">
          {/* flex ratios apply only in row mode (md+). In column mode they collapse the height. */}
          <Input
            placeholder="Job title or keyword"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            size="lg"
            minH="48px"
            flex={{ base: "none", md: 2 }}
            minW={0}
            w={{ base: "full", md: "auto" }}
          />
          <Input
            placeholder="Location or Remote"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            size="lg"
            minH="48px"
            flex={{ base: "none", md: 1 }}
            minW={0}
            w={{ base: "full", md: "auto" }}
          />
          <Select.Root
            collection={CATEGORIES}
            value={category}
            onValueChange={(e) => setCategory(e.value)}
            size="lg"
            flex={{ base: "none", md: 1 }}
            minW={0}
            w={{ base: "full", md: "auto" }}
          >
            <Select.Control>
              <Select.Trigger minH="48px">
                <Select.ValueText placeholder="Category" />
              </Select.Trigger>
            </Select.Control>
            <Portal>
              <Select.Positioner>
                <Select.Content>
                  {CATEGORIES.items.map((item) => (
                    <Select.Item key={item.value} item={item}>
                      {item.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Positioner>
            </Portal>
          </Select.Root>
          <Button
            type="submit"
            colorPalette="brand"
            size="lg"
            px={8}
            minH="48px"
            w={{ base: "full", md: "auto" }}
            flexShrink={0}
          >
            Find Jobs
          </Button>
        </Flex>
      </Box>

      <HStack justify="center" gap={3} mt={8} flexWrap="wrap">
        <Button
          asChild
          variant="outline"
          colorPalette="brand"
          size={{ base: "md", md: "lg" }}
          borderRadius="full"
          px={8}
        >
          <Link href="/post-job">Post a Job</Link>
        </Button>
        <Button
          asChild
          colorPalette="brand"
          size={{ base: "md", md: "lg" }}
          borderRadius="full"
          px={8}
        >
          <a href="#listings">Browse All Jobs</a>
        </Button>
      </HStack>
    </Box>
  );
}