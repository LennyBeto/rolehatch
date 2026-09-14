// frontend/app/page.tsx
import { Box, Flex } from "@chakra-ui/react";
import FilterSidebar from "@/components/FilterSidebar";
import JobList from "@/components/JobList";
import SearchBar from "@/components/SearchBar";

export default function HomePage() {
  return (
    <Box bg="background" minH="100vh">
      <SearchBar />
      <Flex maxW="1200px" mx="auto" gap={6} px={4} py={6}>
        <Box w="280px" flexShrink={0}>
          <FilterSidebar />
        </Box>
        <Box flex="1">
          <JobList />
        </Box>
      </Flex>
    </Box>
  );
}