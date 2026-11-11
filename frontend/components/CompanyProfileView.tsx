// frontend/components/CompanyProfileView.tsx
"use client";
import { Box, Heading, Text, Stack, Flex, HStack, Wrap, Badge, Button, Image } from "@chakra-ui/react";
import JobCard from "./JobCard";

type Job = Parameters<typeof JobCard>[0]["job"];

export type CompanyPageData = {
  name: string;
  domain: string;
  industry: string | null;
  open_roles: number;
  profile: {
    tagline: string | null;
    about: string | null;
    website_url: string | null;
    careers_url: string | null;
    headquarters: string | null;
    company_size: string | null;
  } | null;
  jobs: Job[];
};

export default function CompanyProfileView({ company }: { company: CompanyPageData }) {
  const { profile } = company;
  const logoUrl = `https://www.google.com/s2/favicons?domain=${company.domain}&sz=64`;

  const facts = [
    profile?.headquarters,
    profile?.company_size ? `${profile.company_size} people` : null,
    company.industry,
  ].filter((f): f is string => Boolean(f));

  return (
    <Box bg="background" minH="60vh" py={{ base: 8, md: 12 }} px={4}>
      <Box maxW="900px" mx="auto">
        <Flex
          gap={4}
          align={{ base: "center", sm: "flex-start" }}
          direction={{ base: "column", sm: "row" }}
          textAlign={{ base: "center", sm: "left" }}
          mb={6}
        >
          <Image src={logoUrl} alt={`${company.name} logo`} boxSize="64px" borderRadius="lg" flexShrink={0} />
          <Box flex="1" minW={0}>
            <HStack gap={3} justify={{ base: "center", sm: "flex-start" }} wrap="wrap">
              <Heading as="h1" size="xl" color="text">{company.name}</Heading>
              {profile && (
                <Badge colorPalette="brand" variant="subtle" borderRadius="full" px={3}>
                  Hiring partner
                </Badge>
              )}
            </HStack>
            {profile?.tagline && (
              <Text color="fg.muted" mt={1}>{profile.tagline}</Text>
            )}
            {facts.length > 0 && (
              <Wrap gap={2} mt={3} justify={{ base: "center", sm: "flex-start" }}>
                {facts.map((fact) => (
                  <Badge key={fact} variant="outline">{fact}</Badge>
                ))}
              </Wrap>
            )}
            {(profile?.website_url || profile?.careers_url) && (
              <HStack gap={3} mt={4} wrap="wrap" justify={{ base: "center", sm: "flex-start" }}>
                {profile.website_url && (
                  <Button asChild size="sm" colorPalette="brand" borderRadius="full">
                    <a href={profile.website_url} target="_blank" rel="noopener noreferrer">Visit website</a>
                  </Button>
                )}
                {profile.careers_url && (
                  <Button asChild size="sm" variant="outline" colorPalette="brand" borderRadius="full">
                    <a href={profile.careers_url} target="_blank" rel="noopener noreferrer">Careers site</a>
                  </Button>
                )}
              </HStack>
            )}
          </Box>
        </Flex>

        {profile?.about && (
          <Box bg="surface" border="1px solid" borderColor="line" borderRadius="lg" p={{ base: 4, md: 6 }} mb={8}>
            <Heading as="h2" size="md" color="text" mb={2}>About {company.name}</Heading>
            <Text color="text" fontSize="sm" lineHeight="1.7" whiteSpace="pre-wrap">{profile.about}</Text>
          </Box>
        )}

        <Heading as="h2" size="md" color="text" mb={4}>
          Open roles ({company.open_roles})
        </Heading>
        {company.jobs.length > 0 ? (
          <Stack gap={4}>
            {company.jobs.map((job) => <JobCard key={job.id} job={job} />)}
          </Stack>
        ) : (
          <Text color="fg.muted">No open roles right now. Check back soon.</Text>
        )}
      </Box>
    </Box>
  );
}