// frontend/app/terms/page.tsx
import { Box, Heading, Text, Stack, List, Link as ChakraLink } from "@chakra-ui/react";
import NextLink from "next/link";

export const metadata = { title: "Terms of Service — PerchRole" };

const LAST_UPDATED = "October 7, 2026";

type Section = { title: string; body?: string[]; items?: string[] };

const SECTIONS: Section[] = [
  {
    title: "1. Acceptance of terms",
    body: [
      "By accessing or using PerchRole, you agree to these Terms of Service and our Privacy Policy. If you do not agree, please do not use the service.",
    ],
  },
  {
    title: "2. Using PerchRole",
    body: [
      "PerchRole is a free job search platform for job seekers. Searching and filtering are open to everyone. Creating an account lets you view listing links, save jobs, track application status, and subscribe to job alerts. You must be at least 16 years old to use the service.",
    ],
  },
  {
    title: "3. Accounts",
    body: [
      "Sign-in uses emailed magic links, so you are responsible for keeping access to your email address secure and for all activity under your account. Employer permissions are tied to your email domain: we treat anyone signed in with an email at a company's domain as authorized to post and promote listings on that company's behalf. Employers are responsible for who in their organization holds such an email address.",
    ],
  },
  {
    title: "4. Employer postings",
    body: [
      "Posting a job is free. Postings must describe a real, currently open position and include accurate details and a working application link. You may not post content that is fraudulent, misleading, discriminatory, or unlawful, that charges applicants a fee, or that collects sensitive personal data without a legitimate hiring purpose. We may remove any listing, or suspend any account, that violates these terms or applicable employment law.",
    ],
  },
  {
    title: "5. Featured listings and payments",
    body: [
      "Employers may pay a one-time fee to feature a listing at the top of relevant search results for 14 days. Payments are processed through Safaricom M-Pesa, and the feature is activated after payment is confirmed. Featured placement improves visibility only. We do not guarantee views, applications, or hires. Fees are one-time charges, not subscriptions. If a payment problem occurs or you believe you were charged in error, contact us through Contact Support with your M-Pesa transaction reference and we will review it.",
    ],
  },
  {
    title: "6. Third-party listings",
    body: [
      "Many listings are aggregated from public employer career pages and applicant tracking systems. PerchRole is not the employer and is not responsible for the accuracy, availability, or hiring practices of third-party employers. Listings may change or close at any time. Always verify a role with the employer before applying, and never pay money to apply for a job.",
    ],
  },
  {
    title: "7. Acceptable use",
    body: ["You agree not to:"],
    items: [
      "Scrape, crawl, or bulk-download PerchRole content except as permitted by our robots.txt or written permission.",
      "Attempt to bypass rate limits, authentication, or other security measures.",
      "Use the service to send spam, harass others, or submit false or malicious content.",
      "Interfere with or disrupt the platform or its infrastructure.",
      "Impersonate a company or person, or post on behalf of an employer you are not authorized to represent.",
    ],
  },
  {
    title: "8. Intellectual property",
    body: [
      "The PerchRole name, logo, design, and original content belong to PerchRole. Job listings and company names and logos belong to their respective owners and are displayed to help you find and reach the original posting. You keep ownership of content you submit, and you grant us a license to display it on the platform for as long as it is posted.",
    ],
  },
  {
    title: "9. No warranty",
    body: [
      "PerchRole is provided \"as is\" and \"as available\" without warranties of any kind. We do not guarantee job placement, responses from employers, or uninterrupted, error-free availability of the service.",
    ],
  },
  {
    title: "10. Limitation of liability",
    body: [
      "To the fullest extent permitted by law, PerchRole and its owners are not liable for any indirect, incidental, or consequential damages arising from your use of the service, including dealings with employers or other users. Our total liability for any claim is limited to the amount you paid us in the 12 months before the claim, or zero if you paid nothing.",
    ],
  },
  {
    title: "11. Termination",
    body: [
      "You may stop using PerchRole at any time and ask us to delete your account through Contact Support. We may suspend or terminate access, or remove content, if you violate these terms or put the platform or other users at risk.",
    ],
  },
  {
    title: "12. Governing law",
    body: ["These terms are governed by the laws of Kenya, and any dispute will be handled by the courts of Kenya."],
  },
  {
    title: "13. Changes to these terms",
    body: [
      "We may update these terms as the platform evolves. The \"Last updated\" date above shows the latest revision. Continued use of PerchRole after changes take effect means you accept the revised terms.",
    ],
  },
];

export default function TermsOfServicePage() {
  return (
    <Box maxW="800px" mx="auto" px={4} py={12}>
      <Heading size="lg" color="text" mb={2}>Terms of Service</Heading>
      <Text color="gray.500" fontSize="sm" mb={8}>Last updated: {LAST_UPDATED}</Text>

      <Stack gap={6} color="text">
        {SECTIONS.map((s) => (
          <Box key={s.title}>
            <Heading size="sm" mb={2}>{s.title}</Heading>
            {s.body?.map((p) => (
              <Text key={p} fontSize="sm" mb={s.items ? 2 : 0}>{p}</Text>
            ))}
            {s.items && (
              <List.Root fontSize="sm" gap={1} ps={4}>
                {s.items.map((i) => <List.Item key={i}>{i}</List.Item>)}
              </List.Root>
            )}
          </Box>
        ))}

        <Box>
          <Heading size="sm" mb={2}>14. Contact</Heading>
          <Text fontSize="sm">
            Questions about these terms? Reach us through our{" "}
            <ChakraLink asChild color="brand.500" textDecoration="underline">
              <NextLink href="/contact">Contact Support</NextLink>
            </ChakraLink>{" "}
            page.
          </Text>
        </Box>
      </Stack>
    </Box>
  );
}