// frontend/components/JobCard.tsx
"use client";
import { Box, Heading, Text, Badge, HStack, Button, Flex, Image, Collapsible, Wrap } from "@chakra-ui/react";
import { LuChevronDown, LuLock } from "react-icons/lu";
import { useState } from "react";
import { formatPostAge } from "@/lib/formatPostAge";
import { useAuth } from "@/lib/AuthContext";
import SignInModal from "./SignInModal";

type Job = {
  id: string; title: string; location: string | null;
  remote_type: string | null; commitment: string | null;
  level: string | null; tech_stack: string[]; description: string | null;
  salary_min: number | null; salary_max: number | null;
  source: string; source_url: string; is_featured: boolean;
  posted_at: string | null; company_name: string | null; company_domain: string | null;
};

const LEVEL_LABELS: Record<string, string> = {
  entry: "Entry Level",
  mid: "Mid Level",
  senior: "Senior Level",
};

export default function JobCard({ job }: { job: Job }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const logoUrl = job.company_domain
    ? `https://www.google.com/s2/favicons?domain=${job.company_domain}&sz=64`
    : null;

  const techStack = job.tech_stack ?? [];
  const hasDetails = Boolean(job.description) || techStack.length > 0;

  const requireAuth = (action: () => void) => () => {
    if (!user) {
      setModalOpen(true);
      return;
    }
    action();
  };

  const handleViewJob = requireAuth(() => {
    window.open(job.source_url, "_blank", "noopener,noreferrer");
  });

  const handleToggleDetails = requireAuth(() => setOpen((prev) => !prev));

  return (
    <Box
      bg="surface"
      p={5}
      borderRadius="lg"
      border="1px solid #E5E3DD"
      position="relative"
      transition="box-shadow 0.15s ease"
      _hover={{ boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}
    >
      {job.is_featured && (
        <Badge position="absolute" top={4} right={5} colorPalette="orange" variant="solid" borderRadius="full" px={3}>
          FEATURED
        </Badge>
      )}

      <Flex gap={3} align="flex-start" pr={job.is_featured ? "90px" : 0}>
        {logoUrl && (
          <Image src={logoUrl} alt={job.company_name ?? "Company logo"} boxSize="40px" borderRadius="md" mt={1} />
        )}
        <Box flex={1}>
          <Flex justify="space-between" align="flex-start">
            <Box>
              <Heading size="md" color="text" mb={1}>{job.title}</Heading>
              <Text color="gray.600" fontSize="sm">
                {job.company_name ?? "Company"} · {job.location ?? "Location unspecified"}
              </Text>
            </Box>
            {job.salary_min && (
              <Text fontSize="sm" fontWeight="600" color="text" whiteSpace="nowrap">
                ${job.salary_min}k – ${job.salary_max}k
              </Text>
            )}
          </Flex>

          <HStack gap={2} mt={3} flexWrap="wrap">
            {job.remote_type && <Badge colorPalette="brand" variant="subtle" textTransform="capitalize">{job.remote_type}</Badge>}
            {job.level && <Badge variant="outline">{LEVEL_LABELS[job.level] ?? job.level}</Badge>}
            {job.commitment && <Badge variant="outline">{job.commitment}</Badge>}
            <Badge variant="outline" textTransform="capitalize">{job.source}</Badge>
            <Text fontSize="xs" color="gray.500">{formatPostAge(job.posted_at)}</Text>
          </HStack>

          <HStack mt={4} gap={3}>
            <Button size="sm" colorPalette="brand" onClick={handleViewJob}>
              {user ? "View Job" : (
                <>
                  <LuLock style={{ marginRight: 6 }} /> Sign in to View
                </>
              )}
            </Button>
            {hasDetails && (
              <Button size="sm" variant="ghost" onClick={handleToggleDetails} aria-expanded={open}>
                Details
                <Box
                  as={LuChevronDown}
                  ml={1}
                  transform={open ? "rotate(180deg)" : "rotate(0deg)"}
                  transition="transform 0.15s ease"
                />
              </Button>
            )}
          </HStack>

          {hasDetails && user && (
            <Collapsible.Root open={open}>
              <Collapsible.Content>
                <Box mt={4} pt={4} borderTop="1px solid #E5E3DD">
                  {techStack.length > 0 && (
                    <Box mb={3}>
                      <Text fontSize="xs" color="gray.500" mb={1} textTransform="uppercase" fontWeight="600">
                        Tech Stack
                      </Text>
                      <Wrap gap={2}>
                        {techStack.map((tech) => (
                          <Badge key={tech} variant="subtle" colorPalette="gray" textTransform="capitalize">
                            {tech}
                          </Badge>
                        ))}
                      </Wrap>
                    </Box>
                  )}
                  {job.description && (
                    <Text fontSize="sm" color="gray.700" whiteSpace="pre-wrap">
                      {job.description}
                    </Text>
                  )}
                </Box>
              </Collapsible.Content>
            </Collapsible.Root>
          )}
        </Box>
      </Flex>

      <SignInModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </Box>
  );
}