// frontend/components/PaginationControls.tsx
"use client";
import { HStack, Button, IconButton, Text } from "@chakra-ui/react";
import { LuChevronLeft, LuChevronRight } from "react-icons/lu";

const WINDOW_SIZE = 10;

type Props = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export default function PaginationControls({ currentPage, totalPages, onPageChange }: Props) {
  if (totalPages <= 1) return null;

  // Center the 10-number window on the current page, clamped to valid bounds
  let windowStart = Math.max(1, currentPage - Math.floor(WINDOW_SIZE / 2));
  let windowEnd = Math.min(totalPages, windowStart + WINDOW_SIZE - 1);
  windowStart = Math.max(1, windowEnd - WINDOW_SIZE + 1);

  const pageNumbers = Array.from(
    { length: windowEnd - windowStart + 1 },
    (_, i) => windowStart + i
  );

  return (
    <HStack justify="center" pt={4} gap={1} flexWrap="wrap">
      <IconButton
        aria-label="Previous page"
        size="sm"
        variant="outline"
        colorPalette="brand"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        <LuChevronLeft />
      </IconButton>

      {windowStart > 1 && (
        <>
          <Button size="sm" variant="ghost" onClick={() => onPageChange(1)}>1</Button>
          {windowStart > 2 && <Text px={1} color="gray.400">…</Text>}
        </>
      )}

      {pageNumbers.map((num) => (
        <Button
          key={num}
          size="sm"
          variant={num === currentPage ? "solid" : "outline"}
          colorPalette="brand"
          onClick={() => onPageChange(num)}
        >
          {num}
        </Button>
      ))}

      {windowEnd < totalPages && (
        <>
          {windowEnd < totalPages - 1 && <Text px={1} color="gray.400">…</Text>}
          <Button size="sm" variant="ghost" onClick={() => onPageChange(totalPages)}>
            {totalPages}
          </Button>
        </>
      )}

      <IconButton
        aria-label="Next page"
        size="sm"
        variant="outline"
        colorPalette="brand"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        <LuChevronRight />
      </IconButton>
    </HStack>
  );
}