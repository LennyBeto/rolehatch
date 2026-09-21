// frontend/components/EmployerPricingPreview.tsx
"use client";
import { Box, Heading, Text, SimpleGrid, Stack, HStack, Button, Icon } from "@chakra-ui/react";
import { LuCheck } from "react-icons/lu";
import Link from "next/link";

const BENEFITS = [
  "Direct placement in front of engaged job seekers — no reposting delays",
  "Featured placement pins your listing to the top of search results for 14 days",
  "No recruiter agency fees — post directly, pay only for visibility you choose",
];

export default function EmployerPricingPreview() {
  return (
    <Box bg="surface" borderTop="1px solid #E5E3DD" py={12} px={4}>
      <Box maxW="900px" mx="auto" textAlign="center">
        <Heading size="lg" color="text" mb={2}>Reach candidates directly</Heading>
        <Text color="gray.600" mb={8}>
          Posting is always free. Pay only if you want a listing featured.
        </Text>

        <SimpleGrid columns={{ base: 1, md: 2 }} gap={8} textAlign="left" mb={8}>
          <Stack gap={3}>
            {BENEFITS.map((b) => (
              <HStack key={b} align="flex-start" gap={2}>
                <Icon color="brand.500" mt={1}><LuCheck /></Icon>
                <Text color="text" fontSize="sm">{b}</Text>
              </HStack>
            ))}
          </Stack>

          <Box bg="background" borderRadius="lg" border="1px solid #E5E3DD" p={6}>
            <Text fontSize="sm" color="gray.600" mb={1}>Featured Listing</Text>
            <Heading size="xl" color="brand.500" mb={1}>$49</Heading>
            <Text fontSize="sm" color="gray.600" mb={4}>per posting, 14 days</Text>
            <Text fontSize="sm" color="text">
              Pins your role above standard listings in every matching search.
            </Text>
          </Box>
        </SimpleGrid>

        <HStack justify="center" gap={4}>
          <Button as={Link} href="/dashboard" colorPalette="brand" size="lg" borderRadius="full" px={8}>
            Post a Job
          </Button>
          <Button as={Link} href="/pricing" variant="outline" colorPalette="brand" size="lg" borderRadius="full" px={8}>
            View Full Pricing
          </Button>
        </HStack>
      </Box>
    </Box>
  );
}