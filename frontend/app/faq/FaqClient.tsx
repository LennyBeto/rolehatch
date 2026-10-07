// frontend/app/faq/FaqClient.tsx
"use client";
import { Box, Heading, Text, Stack, Accordion, Span } from "@chakra-ui/react";

const FAQS = [
  {
    q: "Is PerchRole really free for job seekers?",
    a: "Yes. Searching, filtering, saving jobs, tracking applications, and job alerts are free. We earn money only from optional featured listings that employers buy.",
  },
  {
    q: "Where do the jobs come from?",
    a: "Listings are pulled directly from company career pages and applicant tracking systems (Greenhouse, Lever, Workday, and BambooHR), plus jobs employers post directly on PerchRole.",
  },
  {
    q: "How often are listings updated?",
    a: "Listings sync hourly. When a role closes at the source, it is removed from PerchRole automatically.",
  },
  {
    q: "Why do I need to sign in to view a job?",
    a: "You can browse a preview without an account. Signing in is free and uses an emailed magic link, with no password. It unlocks full listings, job details, and save/apply tracking.",
  },
  {
    q: "How does sign-in work?",
    a: "Enter your email and we send you a one-time link. Click it and you're signed in. If the email doesn't arrive, check your spam folder and try again.",
  },
  {
    q: "How do I apply for a job?",
    a: "Click \"View Job\" on a listing. It opens the employer's original posting, where you apply directly. Use \"Mark Applied\" to track it on PerchRole.",
  },
  {
    q: "How do job alerts work?",
    a: "Enter your email, an optional keyword, and a daily or weekly frequency in the alert form on the home page. We email you matching jobs. You can unsubscribe at any time by contacting support.",
  },
  {
    q: "How do I post a job?",
    a: "Sign in with your company email, then open Post a Job. Posting is free. Your listings are tied to your email domain, so only people with an email at your company's domain can manage them.",
  },
  {
    q: "What does a featured listing cost?",
    a: "$49 per posting. It pins your job to the top of matching search results for 14 days. It is a one-time payment, not a subscription, processed securely by Stripe.",
  },
  {
    q: "Why can't I promote a listing?",
    a: "Only accounts whose email domain matches the company's verified domain can promote its listings. Sign in with your work email, or contact support if your domain isn't recognized.",
  },
  {
    q: "Is my data safe?",
    a: "We use verified authentication, row-level database security, and encrypted connections. We never see your card details and never sell your data. See our Privacy Policy for details.",
  },
  {
    q: "How can I delete my account or data?",
    a: "Contact us through the Contact Support page and we'll remove your saved jobs, alert subscriptions, and profile data.",
  },
];

export default function FaqClient() {
  return (
    <Box maxW="800px" mx="auto" px={4} py={12}>
      <Heading size="lg" color="text" mb={2}>Frequently Asked Questions</Heading>
      <Text color="gray.600" mb={8}>
        Quick answers about searching, applying, and posting on PerchRole.
      </Text>

      <Accordion.Root collapsible multiple variant="outline">
        {FAQS.map((item, i) => (
          <Accordion.Item key={item.q} value={`faq-${i}`}>
            <Accordion.ItemTrigger>
              <Span flex="1" fontWeight="600" color="text">{item.q}</Span>
              <Accordion.ItemIndicator />
            </Accordion.ItemTrigger>
            <Accordion.ItemContent>
              <Accordion.ItemBody>
                <Text fontSize="sm" color="gray.600">{item.a}</Text>
              </Accordion.ItemBody>
            </Accordion.ItemContent>
          </Accordion.Item>
        ))}
      </Accordion.Root>

      <Stack mt={10}>
        <Text fontSize="sm" color="gray.600">
          Still stuck? Use the Contact Support link in the footer and we'll help.
        </Text>
      </Stack>
    </Box>
  );
}