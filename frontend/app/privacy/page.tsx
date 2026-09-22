// frontend/app/privacy/page.tsx
import { Box, Heading, Text, Stack, List } from "@chakra-ui/react";

export const metadata = { title: "Privacy Policy — PerchRole" };

export default function PrivacyPolicyPage() {
  return (
    <Box maxW="800px" mx="auto" px={4} py={12}>
      <Heading size="lg" color="text" mb={2}>Privacy Policy</Heading>
      <Text color="gray.500" fontSize="sm" mb={8}>Last updated: {new Date().toLocaleDateString()}</Text>

      <Stack gap={6} color="text">
        <Box>
          <Heading size="sm" mb={2}>1. What we collect</Heading>
          <Text fontSize="sm">
            When you create an account, we collect your email address via Supabase Authentication
            (magic-link sign-in — we never see or store a password). If you subscribe to job alerts,
            we store your email, search keyword, and notification frequency. If you post a job as an
            employer, we store the listing details and your account's email domain to verify ownership.
          </Text>
        </Box>

        <Box>
          <Heading size="sm" mb={2}>2. Job listing data</Heading>
          <Text fontSize="sm">
            Job postings shown on PerchRole are sourced from public company career pages and applicant
            tracking systems (such as Greenhouse and Lever). We link directly to the employer's original
            posting rather than hosting application data ourselves.
          </Text>
        </Box>

        <Box>
          <Heading size="sm" mb={2}>3. Third-party services</Heading>
          <List.Root fontSize="sm" gap={1} ps={4}>
            <List.Item>Supabase — authentication and database hosting</List.Item>
            <List.Item>Stripe — payment processing for featured job listings (we never see or store card details)</List.Item>
            <List.Item>Upstash — temporary caching of search results</List.Item>
            <List.Item>Google's favicon service — displaying company logos next to listings</List.Item>
          </List.Root>
        </Box>

        <Box>
          <Heading size="sm" mb={2}>4. Cookies and local storage</Heading>
          <Text fontSize="sm">
            We use your browser's local storage to remember your light/dark theme preference and to
            maintain your signed-in session. We do not use tracking or advertising cookies.
          </Text>
        </Box>

        <Box>
          <Heading size="sm" mb={2}>5. Your rights</Heading>
          <Text fontSize="sm">
            You may request access to, correction of, or deletion of your personal data at any time by
            contacting us through our Contact Support page. Deleting your account removes your saved
            jobs, alert subscriptions, and profile data from our systems.
          </Text>
        </Box>

        <Box>
          <Heading size="sm" mb={2}>6. Contact</Heading>
          <Text fontSize="sm">
            Questions about this policy can be directed to our Contact Support page.
          </Text>
        </Box>
      </Stack>
    </Box>
  );
}