// frontend/components/SalaryInsightsWidget.tsx
"use client";
import { Box, Text, HStack, Skeleton, Badge } from "@chakra-ui/react";
import { useEffect, useState } from "react";

type SalaryInsights = {
  title: string;
  company_domain: string | null;
  sample_size: number;
  low_confidence: boolean;
  salary_min: number | null;
  salary_median: number | null;
  salary_max: number | null;
};

export default function SalaryInsightsWidget({
  title,
  companyDomain,
  compact = false,
}: {
  title: string;
  companyDomain?: string | null;
  compact?: boolean;
}) {
  const [data, setData] = useState<SalaryInsights | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams({ title });
    if (companyDomain) params.set("company_domain", companyDomain);

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/jobs/salary-insights?${params.toString()}`)
      .then((res) => res.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [title, companyDomain]);

  if (compact) {
    if (loading) return <Skeleton height="16px" width="70px" borderRadius="sm" />;
    if (!data || data.sample_size === 0) return null;

    return (
      <Text fontSize="sm" fontWeight="600" color="text" whiteSpace="nowrap">
        ${data.salary_min}k – ${data.salary_max}k
        {data.low_confidence && (
          <Text as="span" fontSize="xs" color="gray.500" fontWeight="400" ml={1}>
            (est.)
          </Text>
        )}
      </Text>
    );
  }

  if (loading) return <Skeleton height="40px" borderRadius="md" />;
  if (!data || data.sample_size === 0) return null;

  return (
    <Box bg="background" p={3} borderRadius="md" border="1px solid #E5E3DD" mt={3}>
      <HStack justify="space-between" mb={1}>
        <Text fontSize="xs" color="gray.500" textTransform="uppercase" fontWeight="600">
          Salary Insights
        </Text>
        {data.low_confidence && (
          <Badge size="sm" variant="subtle" colorPalette="gray">
            Low sample
          </Badge>
        )}
      </HStack>
      <Text fontSize="sm" color="text" fontWeight="600">
        ${data.salary_min}k – ${data.salary_max}k
        <Text as="span" color="gray.500" fontWeight="400" ml={2}>
          (median ${data.salary_median}k)
        </Text>
      </Text>
      <Text fontSize="xs" color="gray.500" mt={1}>
        Based on {data.sample_size} listing{data.sample_size === 1 ? "" : "s"}
      </Text>
    </Box>
  );
}