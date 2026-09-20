// frontend/components/SearchBar.tsx
"use client";
import { Box, Input, Flex } from "@chakra-ui/react";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function SearchBar() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("title") ?? "");
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (query) params.set("title", query);
    else params.delete("title");
    params.delete("page");
    router.push(`/?${params.toString()}`);
  };

  return (
    <Box bg="surface" borderBottom="1px solid #E5E3DD" py={4}>
      <form onSubmit={handleSearch}>
        <Flex maxW="700px" mx="auto" px={4}>
          <Input
            placeholder="Job title or keyword"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            bg="white"
            borderColor="gray.300"
            _focus={{ borderColor: "brand.500", boxShadow: "0 0 0 1px #2F4F3F" }}
          />
        </Flex>
      </form>
    </Box>
  );
}