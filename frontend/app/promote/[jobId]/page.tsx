// frontend/app/promote/[jobId]/page.tsx
"use client";
import { Box, Heading, Text, Button } from "@chakra-ui/react";
import { useParams } from "next/navigation";
import { authedFetch } from "@/lib/api";
import { toaster } from "@/components/ui/toaster";

export default function PromoteJobPage() {
  const { jobId } = useParams();

  const handleCheckout = async () => {
    const res = await authedFetch(`/api/promote/checkout/${jobId}`, { method: "POST" });
    if (!res.ok) {
      toaster.create({ title: "Couldn't start checkout", type: "error" });
      return;
    }
    const { checkout_url } = await res.json();
    window.location.href = checkout_url;
  };

  return (
    <Box maxW="500px" mx="auto" mt={20} textAlign="center">
      <Heading size="md" mb={3}>Feature this listing</Heading>
      <Text color="gray.600" mb={6}>
        Pin your job to the top of search results for 14 days — $49.
      </Text>
      <Button colorPalette="brand" onClick={handleCheckout}>Promote with Stripe</Button>
    </Box>
  );
}