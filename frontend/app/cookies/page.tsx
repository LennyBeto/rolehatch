// frontend/app/cookies/page.tsx
import { Box, Heading, Text, Stack, List, Table, Link as ChakraLink } from "@chakra-ui/react";
import NextLink from "next/link";

export const metadata = { title: "Cookie Policy — PerchRole" };

const LAST_UPDATED = "November 19, 2026";

const ITEMS = [
  {
    name: "Supabase session (sb-…-auth-token)",
    type: "Strictly necessary",
    where: "Local storage",
    purpose: "Keeps you signed in after you use your magic link.",
    duration: "Until you sign out or the session expires",
  },
  {
    name: "theme",
    type: "Preference",
    where: "Local storage",
    purpose: "Remembers your light, dark or system theme.",
    duration: "Until you clear your browser data",
  },
  {
    name: "Cloudflare security cookies (e.g. __cf_bm)",
    type: "Strictly necessary",
    where: "Cookie",
    purpose: "Bot protection and security from our network provider, Cloudflare.",
    duration: "Short-lived (about 30 minutes)",
  },
];

type Section = { title: string; body?: string[]; items?: string[] };

const BEFORE_TABLE: Section[] = [
  {
    title: "1. The short version",
    body: [
      "PerchRole does not use advertising, tracking or analytics cookies, and we do not sell your data. We use only the small amount of browser storage needed to keep you signed in, remember your theme and keep the site secure.",
    ],
  },
  {
    title: "2. What are cookies and local storage?",
    body: [
      "Cookies are small text files a website saves in your browser. Local storage is a similar browser feature that keeps data on your device. This policy covers both, and we use \"cookies\" to mean either.",
    ],
  },
];

const AFTER_TABLE: Section[] = [
  {
    title: "4. Third-party services",
    body: [
      "Some features load content from other companies, who may set their own cookies or receive your IP address under their own policies:",
    ],
    items: [
      "Paystack, M-Pesa and Bachs: only when you start a payment, on their own pages.",
      "Discord: only where the PerchRole Tech Hub community is shown or joined.",
      "Google's favicon service: loads company logos beside listings. It sets no cookie, but your browser requests each image from Google.",
      "Cloudflare, Vercel and Google Cloud: deliver and protect the site (see the table above).",
    ],
  },
  {
    title: "5. Consent",
    body: [
      "Strictly necessary storage does not need your consent because the site cannot work without it. We will not add analytics, advertising or other non-essential cookies without first asking for your consent and updating this page.",
    ],
  },
  {
    title: "6. Managing cookies",
    body: [
      "You can block or delete cookies and site data in your browser settings. If you do, you will be signed out, your theme preference will reset, and some features may not work.",
    ],
  },
];

const linkProps = {
  asChild: true,
  color: "brand.fg",
  textDecoration: "underline",
  _focusVisible: { outline: "2px solid", outlineColor: "brand.fg", outlineOffset: "2px", borderRadius: "sm" },
} as const;

function SectionBlock({ s }: { s: Section }) {
  return (
    <Box>
      <Heading size="sm" mb={2}>{s.title}</Heading>
      {s.body?.map((p) => (
        <Text key={p} fontSize="sm" lineHeight="1.7" mb={s.items ? 2 : 0}>{p}</Text>
      ))}
      {s.items && (
        <List.Root fontSize="sm" lineHeight="1.7" gap={1} ps={4}>
          {s.items.map((i) => <List.Item key={i}>{i}</List.Item>)}
        </List.Root>
      )}
    </Box>
  );
}

export default function CookiePolicyPage() {
  return (
    <Box maxW="800px" mx="auto" px={4} py={12}>
      <Heading size="lg" color="text" mb={2}>Cookie Policy</Heading>
      <Text color="fg.muted" fontSize="sm" mb={8}>Last updated: {LAST_UPDATED}</Text>

      <Stack gap={6} color="text">
        {BEFORE_TABLE.map((s) => <SectionBlock key={s.title} s={s} />)}

        <Box>
          <Heading size="sm" mb={2}>3. What we use</Heading>
          <Table.ScrollArea borderWidth="1px" borderColor="line" borderRadius="md" maxW="100%">
            <Table.Root size="sm" variant="line" minW="640px">
              <Table.Header>
                <Table.Row bg="surface">
                  {["Name", "Type", "Stored in", "Purpose", "Duration"].map((h) => (
                    <Table.ColumnHeader key={h} color="text">{h}</Table.ColumnHeader>
                  ))}
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {ITEMS.map((item) => (
                  <Table.Row key={item.name} bg="surface">
                    <Table.Cell color="text" fontWeight="600">{item.name}</Table.Cell>
                    <Table.Cell color="text">{item.type}</Table.Cell>
                    <Table.Cell color="text">{item.where}</Table.Cell>
                    <Table.Cell color="text">{item.purpose}</Table.Cell>
                    <Table.Cell color="text">{item.duration}</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Table.ScrollArea>
        </Box>

        {AFTER_TABLE.map((s) => <SectionBlock key={s.title} s={s} />)}

        <Box>
          <Heading size="sm" mb={2}>7. Changes and contact</Heading>
          <Text fontSize="sm" lineHeight="1.7">
            We will update this page, and its date, when our use of cookies changes. See our{" "}
            <ChakraLink {...linkProps}><NextLink href="/privacy">Privacy Policy</NextLink></ChakraLink>{" "}
            for how we handle personal data, or reach us through our{" "}
            <ChakraLink {...linkProps}><NextLink href="/contact">Contact Support</NextLink></ChakraLink>{" "}
            page.
          </Text>
        </Box>
      </Stack>
    </Box>
  );
}