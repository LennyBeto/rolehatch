// frontend/components/DatePostedFilter.tsx
"use client";
import { Box, Button, CloseButton, Dialog, Flex, Portal, Text, chakra } from "@chakra-ui/react";
import { useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LuCalendar } from "react-icons/lu";

type DateOptionItem = { value: string; label: string };

const DATE_OPTIONS: DateOptionItem[] = [
  { value: "all", label: "All time" },
  { value: "24h", label: "Past 24 hours" },
  { value: "3d", label: "3 days" },
  { value: "1w", label: "1 week" },
  { value: "2w", label: "2 weeks" },
  { value: "3w", label: "3 weeks" },
  { value: "3m", label: "3 months" },
  { value: "4m", label: "4 months" },
  { value: "5m", label: "5 months" },
  { value: "6m", label: "6 months" },
  { value: "1y", label: "1 year" },
  { value: "2y", label: "2 years" },
];

const LEFT_COLUMN = DATE_OPTIONS.slice(0, 6);
const RIGHT_COLUMN = DATE_OPTIONS.slice(6);
const VALID_VALUES = new Set<string>(DATE_OPTIONS.map((o) => o.value));

const parseDatePosted = (raw: string | null) => (raw && VALID_VALUES.has(raw) ? raw : "all");

// Reduced-motion preference, read safely on client and server
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia(REDUCED_MOTION_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
const getReducedMotion = () => window.matchMedia(REDUCED_MOTION_QUERY).matches;
const getServerReducedMotion = () => false;

function DateOption({
  value,
  label,
  checked,
  onSelect,
}: {
  value: string;
  label: string;
  checked: boolean;
  onSelect: (value: string) => void;
}) {
  return (
    <Box
      as="label"
      position="relative"
      display="flex"
      alignItems="center"
      gap={3}
      minH="44px"
      px={3}
      borderRadius="md"
      cursor="pointer"
      bg={checked ? { base: "brand.50", _dark: "brand.700" } : "transparent"}
      color={checked ? "text" : { base: "gray.700", _dark: "gray.300" }}
      fontWeight={checked ? "600" : "400"}
      transition="background 0.15s ease"
      _hover={checked ? undefined : { bg: { base: "blackAlpha.50", _dark: "whiteAlpha.100" } }}
      _motionReduce={{ transition: "none" }}
      css={{
        "&:has(input:focus-visible)": {
          outline: "2px solid",
          outlineColor: "brand.focusRing",
          outlineOffset: "2px",
        },
      }}
    >
      <chakra.input
        type="radio"
        name="date-posted"
        value={value}
        checked={checked}
        onChange={() => onSelect(value)}
        position="absolute"
        opacity={0}
        w="1px"
        h="1px"
        m={0}
        pointerEvents="none"
      />
      <Box
        aria-hidden
        flexShrink={0}
        boxSize="20px"
        borderRadius="full"
        display="flex"
        alignItems="center"
        justifyContent="center"
        color={checked ? { base: "brand.500", _dark: "brand.300" } : { base: "gray.400", _dark: "gray.500" }}
        boxShadow="inset 0 0 0 2px"
      >
        {checked && <Box boxSize="10px" borderRadius="full" bg="currentColor" />}
      </Box>
      <Text as="span" fontSize="sm">{label}</Text>
    </Box>
  );
}

export default function DatePostedFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reduceMotion = useSyncExternalStore(subscribeReducedMotion, getReducedMotion, getServerReducedMotion);

  const applied = parseDatePosted(searchParams.get("date_posted"));
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(applied);

  const isActive = applied !== "all";
  const appliedLabel = DATE_OPTIONS.find((o) => o.value === applied)?.label ?? "All time";

  const openPanel = () => {
    setDraft(applied);
    setOpen(true);
  };

  const commit = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page"); // any filter change invalidates the current page position
    if (value === "all") params.delete("date_posted");
    else params.set("date_posted", value);
    setOpen(false);
    router.push(`/?${params.toString()}#listings`);
  };

  return (
    <>
      <Button
        size="sm"
        borderRadius="full"
        colorPalette="brand"
        variant={isActive ? "solid" : "outline"}
        onClick={openPanel}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <LuCalendar />
        {isActive ? `Posted: ${appliedLabel}` : "Date posted"}
      </Button>

      <Dialog.Root
        open={open}
        onOpenChange={(e) => setOpen(e.open)}
        placement="center"
        scrollBehavior="inside"
        lazyMount
        unmountOnExit
        motionPreset={reduceMotion ? "none" : "scale"}
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content bg="surface" color="text" borderRadius="xl">
              <Dialog.Header
                justifyContent="space-between"
                alignItems="center"
                pe={12}
                borderBottom="1px solid"
                borderColor="line"
              >
                <Dialog.Title fontSize="md" fontWeight="700">Date posted</Dialog.Title>
                <Button size="xs" variant="ghost" onClick={() => setDraft("all")} disabled={draft === "all"}>
                  Clear
                </Button>
              </Dialog.Header>

              <Dialog.Body py={4}>
                <Flex
                  role="radiogroup"
                  aria-label="Date posted"
                  direction={{ base: "column", sm: "row" }}
                  gap={{ base: 1, sm: 4 }}
                >
                  <Flex direction="column" gap={1} flex="1">
                    {LEFT_COLUMN.map((o) => (
                      <DateOption key={o.value} value={o.value} label={o.label} checked={draft === o.value} onSelect={setDraft} />
                    ))}
                  </Flex>
                  <Flex direction="column" gap={1} flex="1">
                    {RIGHT_COLUMN.map((o) => (
                      <DateOption key={o.value} value={o.value} label={o.label} checked={draft === o.value} onSelect={setDraft} />
                    ))}
                  </Flex>
                </Flex>
              </Dialog.Body>

              <Dialog.Footer justifyContent="space-between" borderTop="1px solid" borderColor="line">
                <Button
                  variant="ghost"
                  onClick={() => commit("all")}
                  disabled={applied === "all" && draft === "all"}
                >
                  Clear all
                </Button>
                <Button colorPalette="brand" borderRadius="full" px={8} onClick={() => commit(draft)}>
                  Show results
                </Button>
              </Dialog.Footer>

              <Dialog.CloseTrigger asChild><CloseButton size="sm" /></Dialog.CloseTrigger>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </>
  );
}