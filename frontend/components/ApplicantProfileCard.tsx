// frontend/components/ApplicantProfileCard.tsx
"use client";
import {
  Box, Heading, Text, Input, Button, Stack, Select, Portal,
  createListCollection, HStack, Center,
} from "@chakra-ui/react";
import { useState } from "react";
import AvatarPicker from "./AvatarPicker";
import { getAvatarById } from "@/lib/avatars";
import { updateApplicantProfile } from "@/lib/api";
import { toaster } from "@/components/ui/toaster";

const EXPERTISE_COLLECTION = createListCollection({
  items: [
    { label: "Frontend Engineer", value: "frontend_engineer" },
    { label: "Backend Engineer", value: "backend_engineer" },
    { label: "Full-Stack Engineer", value: "fullstack_engineer" },
    { label: "DevOps Engineer", value: "devops_engineer" },
    { label: "Data Scientist", value: "data_scientist" },
    { label: "Data Analyst", value: "data_analyst" },
    { label: "Product Manager", value: "product_manager" },
    { label: "UI/UX Designer", value: "ui_ux_designer" },
    { label: "QA Engineer", value: "qa_engineer" },
    { label: "Mobile Engineer", value: "mobile_engineer" },
    { label: "Cybersecurity Engineer", value: "cybersecurity_engineer" },
    { label: "Other", value: "other" },
  ],
});

type Props = {
  fullName: string;
  expertise: string[];
  avatarId: string | null;
  onFullNameChange: (v: string) => void;
  onExpertiseChange: (v: string[]) => void;
  onAvatarChange: (v: string) => void;
  onSaved: () => void;
};

export default function ApplicantProfileCard({
  fullName, expertise, avatarId,
  onFullNameChange, onExpertiseChange, onAvatarChange, onSaved,
}: Props) {
  const [saving, setSaving] = useState(false);
  const selectedAvatar = getAvatarById(avatarId);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await updateApplicantProfile({
        full_name: fullName,
        expertise: expertise[0],
        avatar_id: avatarId ?? undefined,
      });
      if (!res.ok) throw new Error();
      toaster.create({ title: "Profile saved", type: "success" });
      onSaved();
    } catch {
      toaster.create({ title: "Couldn't save profile", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box bg="surface" p={6} borderRadius="lg" border="1px solid #E5E3DD" mb={8}>
      <Heading size="md" mb={4}>My Profile</Heading>

      <HStack align="flex-start" gap={6} mb={5} flexWrap="wrap">
        <Box textAlign="center">
          <Text fontSize="sm" fontWeight="600" mb={2}>Profile Picture</Text>
          <Box
            boxSize="96px"
            borderRadius="full"
            overflow="hidden"
            border="2px solid"
            borderColor="brand.500"
            bg="background"
          >
            {selectedAvatar ? selectedAvatar.Svg : (
              <Center h="100%" color="gray.400" fontSize="xs">No avatar</Center>
            )}
          </Box>
        </Box>

        <Box flex="1" minW="260px">
          <Text fontSize="sm" fontWeight="600" mb={2}>Choose an avatar</Text>
          <AvatarPicker selectedId={avatarId} onSelect={onAvatarChange} />
        </Box>
      </HStack>

      <Stack gap={4} maxW="420px">
        <Box>
          <Text fontSize="sm" fontWeight="600" mb={1}>Full Name (as per CV)</Text>
          <Input
            placeholder="e.g. Lenny Suswa"
            value={fullName}
            onChange={(e) => onFullNameChange(e.target.value)}
          />
        </Box>

        <Box>
          <Text fontSize="sm" fontWeight="600" mb={1}>Expertise</Text>
          <Select.Root
            collection={EXPERTISE_COLLECTION}
            value={expertise}
            onValueChange={(e) => onExpertiseChange(e.value)}
          >
            <Select.Control>
              <Select.Trigger><Select.ValueText placeholder="Select your expertise" /></Select.Trigger>
            </Select.Control>
            <Portal>
              <Select.Positioner>
                <Select.Content>
                  {EXPERTISE_COLLECTION.items.map((item) => (
                    <Select.Item key={item.value} item={item}>{item.label}</Select.Item>
                  ))}
                </Select.Content>
              </Select.Positioner>
            </Portal>
          </Select.Root>
        </Box>

        <Button colorPalette="brand" onClick={handleSave} loading={saving} alignSelf="flex-start">
          Save Profile
        </Button>
      </Stack>
    </Box>
  );
}