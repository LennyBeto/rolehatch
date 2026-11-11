// frontend/components/PlanComparison.tsx
"use client";
import { Fragment } from "react";
import { Box, Heading, Text, Table, Icon, Badge } from "@chakra-ui/react";
import { LuCheck } from "react-icons/lu";
import {
  EMPLOYER_PLANS,
  EMPLOYER_PLAN_ORDER,
  FEATURE_PRICING,
  RECOMMENDED_PLAN,
  buildComparison,
  type ComparisonCell,
} from "@/lib/pricing";

const SECTIONS = buildComparison();

const COLUMNS = [
  { key: "payg", name: "Pay as you go", price: FEATURE_PRICING.card.display, note: "per listing", recommended: false },
  ...EMPLOYER_PLAN_ORDER.map((id) => ({
    key: id,
    name: EMPLOYER_PLANS[id].name,
    price: EMPLOYER_PLANS[id].display,
    note: "per month",
    recommended: id === RECOMMENDED_PLAN,
  })),
];

function CellValue({ value }: { value: ComparisonCell }) {
  if (value === true) {
    return (
      <Icon color="brand.fg" role="img" aria-label="Included"><LuCheck /></Icon>
    );
  }
  if (value === false) {
    return <Text as="span" color="fg.muted" role="img" aria-label="Not included">—</Text>;
  }
  return <Text as="span" fontSize="sm" color="text">{value}</Text>;
}

export default function PlanComparison() {
  return (
    <Box textAlign="left">
      <Heading as="h3" size="md" color="text" mb={4} textAlign="center">Compare plans</Heading>

      <Box overflowX="auto" border="1px solid" borderColor="line" borderRadius="lg" bg="surface">
        <Table.Root size="sm" minW="720px">
          <Table.Header>
            <Table.Row bg="background">
              <Table.ColumnHeader position="sticky" left={0} zIndex={1} bg="background" minW="200px">
                <Text as="span" fontSize="xs" color="fg.muted">What's included</Text>
              </Table.ColumnHeader>
              {COLUMNS.map((col) => (
                <Table.ColumnHeader
                  key={col.key}
                  textAlign="center"
                  bg={col.recommended ? "brand.subtle" : "background"}
                  py={4}
                >
                  <Text fontWeight="600" color="text">{col.name}</Text>
                  <Text fontSize="lg" fontWeight="700" color="brand.fg" lineHeight="1.2">{col.price}</Text>
                  <Text fontSize="xs" fontWeight="400" color="fg.muted">{col.note}</Text>
                </Table.ColumnHeader>
              ))}
            </Table.Row>
          </Table.Header>

          <Table.Body>
            {SECTIONS.map((section) => (
              <Fragment key={section.title}>
                <Table.Row>
                  <Table.Cell
                    colSpan={COLUMNS.length + 1}
                    bg="background"
                    fontSize="xs"
                    fontWeight="600"
                    textTransform="uppercase"
                    letterSpacing="wide"
                    color="fg.muted"
                  >
                    {section.title}
                  </Table.Cell>
                </Table.Row>

                {section.rows.map((row) => (
                  <Table.Row key={row.label}>
                    <Table.Cell position="sticky" left={0} zIndex={1} bg="surface" fontSize="sm" color="text">
                      {row.label}
                      {row.soon && (
                        <Badge
                          ml={2}
                          size="xs"
                          colorPalette="brand"
                          variant="subtle"
                          borderRadius="full"
                          verticalAlign="middle"
                        >
                          Soon
                        </Badge>
                      )}
                    </Table.Cell>
                    {row.cells.map((cell, i) => (
                      <Table.Cell
                        key={COLUMNS[i].key}
                        textAlign="center"
                        bg={COLUMNS[i].recommended ? "brand.subtle" : undefined}
                      >
                        <CellValue value={cell} />
                      </Table.Cell>
                    ))}
                  </Table.Row>
                ))}
              </Fragment>
            ))}
          </Table.Body>
        </Table.Root>
      </Box>

      <Text fontSize="xs" color="fg.muted" mt={3}>
        Reply times are targets on business days, not guarantees. Refreshes apply to listings posted
        directly on PerchRole. Enterprise featured listings and refreshes are fair-use capped; contact
        us if you need more.
      </Text>
    </Box>
  );
}