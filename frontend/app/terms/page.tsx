// frontend/app/terms/page.tsx
import { Box, Heading, Text, Stack, List, Link as ChakraLink } from "@chakra-ui/react";
import NextLink from "next/link";

export const metadata = { title: "Terms of Service — PerchRole" };

const LAST_UPDATED = "November 15, 2026";

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
      "PerchRole is a job search platform. Searching and filtering are open to everyone. Creating an account lets you view listing links, save jobs, track application status, use the applicant tools, and subscribe to job alerts. Searching, saving, tracking, and alerts are free. Some tools and full job access have usage allowances or fees, as described in section 5. You must be at least 16 years old to use the service.",
    ],
  },
  {
    title: "3. Accounts",
    body: [
      "Sign-in uses emailed magic links, so you are responsible for keeping access to your email address secure and for all activity under your account. Please keep your profile, CV, and listings accurate.",
      "Employer permissions are tied to your email domain: we treat anyone signed in with an email at a company's domain as authorized to post and promote listings on that company's behalf. Personal free-mail addresses (such as Gmail, Yahoo, or Outlook) cannot post or promote listings. Employers are responsible for who in their organization holds a company email address.",
    ],
  },
  {
    title: "4. Employer postings",
    body: [
      "Posting a job is free. Postings must describe a real, currently open position and include accurate details and a working application link. You may not post content that is fraudulent, misleading, discriminatory, or unlawful, that charges applicants a fee, or that collects sensitive personal data without a legitimate hiring purpose. We may remove any listing, or suspend any account, that violates these terms or applicable employment law.",
    ],
  },
  {
    title: "5. Payments, allowances, wallet, and membership",
    body: [
      "Applicants can use ATS screening, CV generation, cover letter generation, and job views up to a free allowance. After that you can buy more or, where offered, join a membership for fuller access. Current allowances, prices, and what each purchase includes are shown before you confirm. They can change, but changes do not affect purchases you have already made. If a paid build fails, the credit used for it is returned to you.",
      "Credits belong to your account and cannot be transferred or exchanged for cash. Each payment is credited once, based on the provider's transaction reference.",
      "Employers may pay a one-time fee to feature a listing at the top of relevant search results for 14 days. Featured placement improves visibility only. We do not guarantee views, applications, or hires.",
      "Payments are processed by Paystack, and wallet payments may also use M-Pesa, Bachs, or other providers shown in the wallet. Purchases are activated only after the provider confirms the payment, and by paying you also agree to the provider's terms. We never see or store your card or mobile-money details. Featured listings and credit packs are one-time charges. Where a monthly membership is offered, its price and renewal terms are shown at checkout. If a payment problem occurs or you believe you were charged in error, contact us through Contact Support with your transaction reference and we will review it.",
    ],
  },
  {
    title: "6. CVs, cover letters, ATS scans, and Perchie",
    items: [
      "You keep ownership of what you upload or create. You allow us to store and process it only to provide the service to you.",
      "ATS scores, templates, and generated CVs or cover letters are aids only. Employers use different systems, and nothing here guarantees an interview or a job.",
      "Perchie is an AI assistant and can be wrong. Its answers are not professional, legal, or career advice, so check important details yourself.",
      "Only upload content you have the right to use, and do not include other people's personal data without their permission.",
    ],
  },
  {
    title: "7. Third-party listings",
    body: [
      "Many listings are aggregated from public employer career pages and applicant tracking systems. PerchRole is not the employer and is not responsible for the accuracy, availability, or hiring practices of third-party employers. Listings may change or close at any time. Always verify a role with the employer before applying, and never pay money to apply for a job.",
    ],
  },
  {
    title: "8. Acceptable use",
    body: ["You agree not to:"],
    items: [
      "Scrape, crawl, or bulk-download PerchRole content except as permitted by our robots.txt or written permission.",
      "Attempt to bypass rate limits, authentication, usage allowances, paywalls, employer verification, or other security measures.",
      "Use the service to send spam, harass others, or submit false or malicious content.",
      "Interfere with or disrupt the platform or its infrastructure.",
      "Impersonate a company or person, or post on behalf of an employer you are not authorized to represent.",
    ],
  },
  {
    title: "9. Community (PerchRole Tech Hub)",
    body: [
      "PerchRole Tech Hub is our Discord community. Access may be limited to members. Please follow the server rules; we may remove members who break them. Jobs shared from partner platforms may include PerchRole referral links, which can earn us a reward if you sign up.",
    ],
  },
  {
    title: "10. Intellectual property",
    body: [
      "The PerchRole name, logo, design, and original content belong to PerchRole. Job listings and company names and logos belong to their respective owners and are displayed to help you find and reach the original posting. You keep ownership of content you submit, and you grant us a license to display it on the platform for as long as it is posted.",
    ],
  },
  {
    title: "11. No warranty",
    body: [
      "PerchRole is provided \"as is\" and \"as available\" without warranties of any kind. We do not guarantee job placement, responses from employers, or uninterrupted, error-free availability of the service. ATS screening results, Perchie replies, and generated CVs or cover letters are aids only, so please review them before use. They do not guarantee any hiring outcome.",
    ],
  },
  {
    title: "12. Limitation of liability",
    body: [
      "To the fullest extent permitted by law, PerchRole and its owners are not liable for any indirect, incidental, or consequential damages arising from your use of the service, including dealings with employers or other users. Our total liability for any claim is limited to the amount you paid us in the 12 months before the claim, or zero if you paid nothing.",
    ],
  },
  {
    title: "13. Termination",
    body: [
      "You may stop using PerchRole at any time and ask us to delete your account through Contact Support. We may suspend or terminate access, or remove content, if you violate these terms or put the platform or other users at risk.",
    ],
  },
  {
    title: "14. Governing law",
    body: ["These terms are governed by the laws of Kenya, and any dispute will be handled by the courts of Kenya."],
  },
  {
    title: "15. Changes to these terms",
    body: [
      "We may update these terms as the platform evolves. The \"Last updated\" date above shows the latest revision. Continued use of PerchRole after changes take effect means you accept the revised terms.",
    ],
  },
];

export default function TermsOfServicePage() {
  return (
    <Box maxW="800px" mx="auto" px={4} py={12}>
      <Heading size="lg" color="text" mb={2}>Terms of Service</Heading>
      <Text color="fg.muted" fontSize="sm" mb={8}>Last updated: {LAST_UPDATED}</Text>

      <Stack gap={6} color="text">
        {SECTIONS.map((s) => (
          <Box key={s.title}>
            <Heading size="sm" mb={2}>{s.title}</Heading>
            {s.body?.map((p) => (
              <Text key={p} fontSize="sm" lineHeight="1.7" mb={2}>{p}</Text>
            ))}
            {s.items && (
              <List.Root fontSize="sm" lineHeight="1.7" gap={1} ps={4}>
                {s.items.map((i) => <List.Item key={i}>{i}</List.Item>)}
              </List.Root>
            )}
          </Box>
        ))}

        <Box>
          <Heading size="sm" mb={2}>16. Contact</Heading>
          <Text fontSize="sm" lineHeight="1.7">
            Questions about these terms? Reach us through our{" "}
            <ChakraLink
              asChild
              color="brand.fg"
              textDecoration="underline"
              _focusVisible={{ outline: "2px solid", outlineColor: "brand.fg", outlineOffset: "2px", borderRadius: "sm" }}
            >
              <NextLink href="/contact">Contact Support</NextLink>
            </ChakraLink>{" "}
            page.
          </Text>
        </Box>
      </Stack>
    </Box>
  );
}