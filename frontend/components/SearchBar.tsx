// frontend/components/SearchBar.tsx
"use client";
import { Box, Input, Flex } from "@chakra-ui/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/?title=${encodeURIComponent(query)}`);
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