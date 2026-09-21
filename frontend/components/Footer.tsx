// frontend/components/Footer.tsx
"use client";
import { Box, SimpleGrid, Stack, Heading, Link as ChakraLink, Text, HStack } from "@chakra-ui/react";
import NextLink from "next/link";

const POPULAR_SEARCHES = [
  { label: "Backend Jobs", href: "/?title=backend" },
  { label: "Frontend Jobs", href: "/?title=frontend" },
  { label: "Python Jobs", href: "/?title=python" },
  { label: "Remote Jobs", href: "/?remote_type=remote" },
  { label: "DevOps Jobs", href: "/?title=devops" },
  { label: "Data Science Jobs", href: "/?title=data%20scientist" },
];

const COMPANY_LINKS = [
  { label: "About", href: "/company" },
  { label: "Blog", href: "/blog" },
  { label: "Post a Job", href: "/dashboard" },
  { label: "Pricing", href: "/pricing" },
];

const LEGAL_LINKS = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
  { label: "Contact Support", href: "/contact" },
];

export default function Footer() {
  return (
    <Box as="footer" bg="surface" borderTop="1px solid #E5E3DD" mt={12} py={10} px={4}>
      <SimpleGrid columns={{ base: 1, md: 3 }} gap={8} maxW="1200px"