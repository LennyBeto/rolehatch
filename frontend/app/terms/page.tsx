// frontend/app/terms/page.tsx
import { Box, Heading, Text, Stack } from "@chakra-ui/react";

export const metadata = { title: "Terms of Service — PerchRole" };

export default function TermsOfServicePage() {
  return (
    <Box maxW="800px" mx="auto" px={4} py={12}>
      <Heading size="lg" color="text" mb={2}>Terms of Service</Heading>
      <Text color="gray.500" fontSize="sm" mb={8}>Last updated: {new Date().toLocaleDateString()}</Text>

      <Stack gap={6} color="text">
        <Box>
          <Heading size="sm" mb={2}>1. Using PerchRole</Heading>
          <Text fontSize="sm">
            PerchRole is a free job search platform for job seekers. Browsing, searching, and applying
            to listings costs nothing. Creating an account lets you save jobs, track application status,
            and subscribe to job alerts.
          </Text>
        </Box>

        <Box>
          <Heading size="sm" mb={2}>2. Employer postings</Heading>
          <Text fontSize="sm">
            Posting a job is free. Employers may optionally pay to feature a listing for a fixed period,
            processed securely through Stripe. Job postings must accurately represent a real, currently
            open position. We reserve the right to remove listings that are fraudulent, discriminatory,
            or otherwise violate applicable employment law.
          </Text>
        </Box>

        <Box>
          <Heading size="sm" mb={2}>3. Account responsibility</Heading>
          <Text fontSize="sm">
            You're responsible for keeping access to your registered email address secure, since sign-in
            is handled via emailed magic links. Employer accounts are scoped to your email domain — we
            assume anyone with access to a company's email domain has authority to post on its behalf.
          </Text>
        </Box>

        <Box>
          <Heading size="sm" mb={2}>4. Third-party listings</Heading>
          <Text fontSize="sm">
            Some listings are aggregated from public employer career pages. PerchRole is not responsible
            for the accuracy, availability, or hiring practices of third-party employers whose listings
            appear on the platform. Always verify a role directly with the employer before applying.
          </Text>
        </Box>

        <Box>
          <Heading size="sm" mb={2}>5. No warranty</Heading>
          <Text fontSize="sm">
            PerchRole is provided "as is" without warranties of any kind. We do not guarantee job
            placement, response from employers, or uninterrupted availability of the service.
          </Text>
        </Box>

        <Box>
          <Heading size="sm" mb={2}>6. Changes to these terms</Heading>
          <Text fontSize="sm">
            We may update these terms as the platform evolves. Continued use of PerchRole after changes
            take effect constitutes acceptance of the revised terms.
          </Text>
        </Box>
      </Stack>
    </Box>
  );
}