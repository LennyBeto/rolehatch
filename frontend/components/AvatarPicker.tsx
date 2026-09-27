// frontend/components/AvatarPicker.tsx
"use client";
import { SimpleGrid, Box } from "@chakra-ui/react";
import { AVATAR_OPTIONS } from "@/lib/avatars";

export default function AvatarPicker({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <SimpleGrid columns={{ base: 3, sm: 6 }} gap={3}>
      {AVATAR_OPTIONS.map((avatar) => {
        const isSelected = avatar.id === selectedId;
        return (
          <Box
            key={avatar.id}
            as="button"
            type="button"
            onClick={() => onSelect(avatar.id)}
            borderRadius="full"
            border="2px solid"
            borderColor={isSelected ? "brand.500" : "transparent"}
            p="2px"
            cursor="pointer"
            transition="border-color 0.15s ease"
            aria-label={avatar.label}
            title={avatar.label}
          >
            <Box borderRadius="full" overflow="hidden" boxSize="56px">
              {avatar.Svg}
            </Box>
          </Box>
        );
      })}
    </SimpleGrid>
  );
}