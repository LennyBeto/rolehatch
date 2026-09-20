// frontend/components/SearchBar.tsx
"use client";
import { Box, Input, Flex, Button } from "@chakra-ui/react";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function SearchBar() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("title") ?? "");
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    if (query) params.set("title", query);
    else params.delete("title");
    router.push(`/?${params.toString()}`);
  };

  return (
    <Box bg="surface" borderBottom="1px solid #E5E3DD" py={5}>
      <form onSubmit={handleSearch}>
        <Flex maxW="700px" mx="auto" px={4} gap={3}>
          <Input
            placeholder="Job title or keyword"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            bg="white"
            borderColor="gray.300"
            borderRadius="md"
            size="lg"
            _focus={{ borderColor: "brand.500", boxShadow: "0 0 0 1px #2F4F3F" }}
          />
          <Button type="submit" colorPalette="brand" size="lg" px={8} flexShrink={0}>
            Search Jobs
          </Button>
        </Flex>
      </form>
    </Box>
  );
}