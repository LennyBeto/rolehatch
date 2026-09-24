// frontend/components/MyApplicationsTable.tsx
"use client";
import { Box, Heading, Text, Table, Link as ChakraLink } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { getMyApplications } from "@/lib/api";
import { toaster } from "@/components/ui/toaster";

type AppliedJob = {
  saved_job_id: string;
  job_id: string;
  title: string;
  company_name: string | null;
  location: string | null;
  source_url: string;
  applied_at: string;
};

export default function MyApplicationsTable() {
  const [applications, setApplications] = useState<AppliedJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyApplications()
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load applications");
        return res.json();
      })
      .then(setApplications)
      .catch(() => toaster.create({ title: "Couldn't load your applications", type: "error" }))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Box mt={10} pt={8} borderTop="1px solid #E5E3DD">
      <Heading size="md" color="text" mb={1}>My Applications</Heading>
      <Text color="gray.600" fontSize="sm" mb={4}>
        Jobs you&apos;ve marked as applied — {applications.length} total.
      </Text>

      {loading ? null : applications.length === 0 ? (
        <Text color="gray.500" fontSize="sm">
          You haven&apos;t marked any jobs as applied yet. Use &quot;Mark Applied&quot; on a listing to track it here.
        </Text>
      ) : (
        <Table.Root size="sm" variant="outline">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Job Title</Table.ColumnHeader>
              <Table.ColumnHeader>Company</Table.ColumnHeader>
              <Table.ColumnHeader>Location</Table.ColumnHeader>
              <Table.ColumnHeader>Applied On</Table.ColumnHeader>
              <Table.ColumnHeader>Link</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {applications.map((app) => (
              <Table.Row key={app.saved_job_id}>
                <Table.Cell fontWeight="600">{app.title}</Table.Cell>
                <Table.Cell>{app.company_name ?? "—"}</Table.Cell>
                <Table.Cell>{app.location ?? "—"}</Table.Cell>
                <Table.Cell>
                  {new Date(app.applied_at).toLocaleDateString(undefined, {
                    year: "numeric", month: "short", day: "numeric",
                  })}
                </Table.Cell>
                <Table.Cell>
                  <ChakraLink href={app.source_url} target="_blank" rel="noopener noreferrer" color="brand.500">
                    View Posting
                  </ChakraLink>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      )}
    </Box>
  );
}