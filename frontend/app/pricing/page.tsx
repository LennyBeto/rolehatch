// frontend/app/pricing/page.tsx
import { Box, Heading, Text, Stack } from "@chakra-ui/react";
import EmployerPricingPreview from "@/components/EmployerPricingPreview";

export default function PricingPage() {
  return (
    <Box bg="background" minH="100vh" py={12}>
      <Box maxW="700px" mx="auto" px={4} textAlign="center" mb={8}>
        <Heading size="lg" color="text" mb={3}>Pricing for Employers</Heading>
        <Text color="gray.600">
          PerchRole is free to post on. Featured placement is the only paid option —
          simple, transparent, and pay-per-listing rather than a recurring subscription.
        </Text>
      </Box>
      <EmployerPricingPreview />
    </Box>
  );
}