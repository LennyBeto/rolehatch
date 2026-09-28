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
          <button
            key={avatar.id}
            type="button"
            onClick={() => onSelect(avatar.id)}
            style={{
              borderRadius: "9999px",
              border: isSelected ? "2px solid var(--chakra-colors-brand-500)" : "2px solid transparent",
              padding: "2px",
              cursor: "pointer",
              transition: "border-color 0.15s ease",
              background: "transparent",
            }}
            aria-label={avatar.label}
            title={avatar.label}
          >
            <Box borderRadius="full" overflow="hidden" boxSize="56px">
              {avatar.Svg}
            </Box>
          </button>
        );
      })}
    </SimpleGrid>
  );
}