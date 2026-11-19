// frontend/app/privacy/page.tsx
import { Box, Heading, Text, Stack, List, Link as ChakraLink } from "@chakra-ui/react";
import NextLink from "next/link";

export const metadata = { title: "Privacy Policy — PerchRole" };

const LAST_UPDATED = "November 19, 2026";

type Section = {
  title: string;
  body?: string[];
  items?: string[];
  after?: string;
  link?: { prefix: string; label: string; href: string };
};

const SECTIONS: Section[] = [
  {
    title: "1. Information we collect",
    body: ["Depending on how you use PerchRole, we collect:"],
    items: [
      "Account data: your email address, collected through Supabase Authentication (magic-link sign-in). We never see or store a password.",
      "Applicant profile: your full name, expertise, location and avatar, and, if you upload one, your CV and the headline and summary parsed from it.",
      "Job activity: jobs you save, mark as applied, or hide, tied to your account, plus how much of each allowance you have used (job views, ATS scans, CV and cover letter builds).",
      "Job alerts: your email, optional keyword, work-environment filter, and notification frequency.",
      "Applicant tool data: if you use the optional ATS screening, CV generation, or cover letter generation tools, the CV and profile details you provide so we can deliver those features.",
      "Perchie chats: the messages you send to our AI assistant.",
      "Employer data: company name, job details you submit (title, location, salary range, application URL), and the email domain of your account, which we use to verify ownership of listings. Personal free-mail addresses (such as Gmail or Yahoo) cannot post or promote listings.",
      "Payment data: when you pay for an optional feature, a membership or a featured listing, the transaction reference, amount, and status returned by our payment provider (Paystack, M-Pesa or Bachs), and the credits or membership the payment grants. We never see or store your card or mobile-money details.",
      "Support messages: the email, subject, and message you send through our Contact Support form.",
      "Technical data: IP address and request metadata, processed to operate the service, apply rate limits, and prevent abuse.",
    ],
  },
  {
    title: "2. How we use your information",
    items: [
      "To provide search, saved jobs, application tracking, and job alert emails.",
      "To deliver the optional ATS screening, CV generation, and cover letter generation tools you choose to use, and to generate Perchie's replies.",
      "To apply your usage allowances, credits and membership.",
      "To verify that employers only manage listings belonging to their email domain.",
      "To process payments and activate purchases and featured listings once payment is confirmed.",
      "To respond to support requests and protect the platform from spam and abuse.",
      "To maintain, secure, and improve the service.",
    ],
    after: "We do not sell your personal data and we do not use it for third-party advertising. Your profile and CV are not shown to employers.",
  },
  {
    title: "3. Job listing data",
    body: [
      "Job postings shown on PerchRole come from public company career pages and applicant tracking systems (such as Greenhouse, Lever, Workday, and BambooHR), or are posted directly by employers. We link to the employer's original posting and do not host your application data. Anything you submit to an employer is governed by that employer's own privacy policy.",
    ],
  },
  {
    title: "4. Payments",
    body: [
      "PerchRole is free to browse. Searching, filtering, saving jobs, tracking applications, and job alerts cost nothing. Some applicant features, such as ATS screening, CV and cover letter generation, and full job access, include a free allowance and then require a payment or membership. Employers may optionally pay to feature a listing.",
      "Payments are processed by Paystack, and wallet payments can also be made through M-Pesa or Bachs. We never see or store your card or mobile-money details. We keep only what is needed to credit your purchase and reconcile payments: the account that made the purchase, the transaction reference, amount and status, the credits or membership granted, and, for featured listings, the listing ID and featured-until date.",
    ],
  },
  {
    title: "5. Perchie and AI features",
    body: [
      "Messages you send to Perchie, and the CV and profile details you submit to the CV tools, are processed by Google AI Studio (Gemini) to produce replies and generated documents. Please do not share passwords, payment details, or other sensitive information in a chat. AI output can be wrong, so review it before you rely on it.",
    ],
  },
  {
    title: "6. Third-party services",
    body: ["We rely on the following providers to run PerchRole. Each handles data under its own privacy policy:"],
    items: [
      "Supabase: authentication and database hosting.",
      "Paystack: payment processing for optional applicant features, memberships, and featured job listings.",
      "M-Pesa and Bachs: wallet payment options.",
      "Upstash: temporary caching of search results and scraper data.",
      "Google AI Studio (Gemini): powers the Perchie assistant and the CV tools.",
      "Vercel, Google Cloud and Cloudflare: hosting, content delivery, and security for the website and API.",
      "Google's favicon service: displays company logos. Your browser requests each logo using the company's domain, so Google may receive your IP address.",
      "Discord: the PerchRole Tech Hub community, only if you choose to join.",
    ],
    after: "Because these providers operate internationally, your data may be processed outside your country.",
  },
  {
    title: "7. Cookies and local storage",
    body: [
      "We use your browser's local storage to remember your light/dark theme preference and to keep you signed in. Cloudflare may set security cookies to protect the site from abuse. We do not use advertising or cross-site tracking cookies.",
    ],
    link: {
      prefix: "A full list of what we store, and why, is in our ",
      label: "Cookie Policy",
      href: "/cookies",
    },
  },
  {
    title: "8. Data retention",
    body: [
      "We keep account data, saved jobs, and alert subscriptions while your account or subscription is active. Jobs you hide are deleted automatically five days after you hide them. Support messages are kept as long as needed to resolve your request and for record-keeping. Payment records may be retained longer where needed for accounting and legal obligations. Cached search data expires automatically within hours. When you ask us to delete your data, we remove your saved jobs, alert subscriptions, profile, CV and cover letters from our systems.",
    ],
  },
  {
    title: "9. Security",
    body: [
      "We protect data with encrypted connections, verified authentication tokens, row-level database security, and restricted access to secrets. No online service can guarantee absolute security, but we work to protect your information.",
    ],
  },
  {
    title: "10. Your rights",
    body: [
      "You can edit or delete your profile and CV from your dashboard. You may also request access to, correction of, or deletion of your personal data, or unsubscribe from job alerts, at any time through our Contact Support page. Depending on where you live, you may have additional rights under local data protection law, including Kenya's Data Protection Act, 2019.",
    ],
  },
  {
    title: "11. Children",
    body: ["PerchRole is not directed at children under 16, and we do not knowingly collect their personal data."],
  },
  {
    title: "12. Changes to this policy",
    body: [
      "We may update this policy as the platform evolves. The \"Last updated\" date above shows when it last changed. Continued use of PerchRole after an update means you accept the revised policy.",
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <Box maxW="800px" mx="auto" px={4} py={12}>
      <Heading size="lg" color="text" mb={2}>Privacy Policy</Heading>
      <Text color="fg.muted" fontSize="sm" mb={8}>Last updated: {LAST_UPDATED}</Text>

      <Stack gap={6} color="text">
        {SECTIONS.map((s) => (
          <Box key={s.title}>
            <Heading size="sm" mb={2}>{s.title}</Heading>
            {s.body?.map((p) => (
              <Text key={p} fontSize="sm" lineHeight="1.7" mb={s.items ? 2 : 0}>{p}</Text>
            ))}
            {s.items && (
              <List.Root fontSize="sm" lineHeight="1.7" gap={1} ps={4}>
                {s.items.map((i) => <List.Item key={i}>{i}</List.Item>)}
              </List.Root>
            )}
            {s.after && <Text fontSize="sm" lineHeight="1.7" mt={2}>{s.after}</Text>}
            {s.link && (
              <Text fontSize="sm" lineHeight="1.7" mt={2}>
                {s.link.prefix}
                <ChakraLink
                  asChild
                  color="brand.fg"
                  textDecoration="underline"
                  _focusVisible={{ outline: "2px solid", outlineColor: "brand.fg", outlineOffset: "2px", borderRadius: "sm" }}
                >
                  <NextLink href={s.link.href}>{s.link.label}</NextLink>
                </ChakraLink>
                .
              </Text>
            )}
          </Box>
        ))}

        <Box>
          <Heading size="sm" mb={2}>13. Contact</Heading>
          <Text fontSize="sm" lineHeight="1.7">
            Questions about this policy? Reach us through our{" "}
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