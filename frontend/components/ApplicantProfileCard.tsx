// frontend/components/ApplicantProfileCard.tsx
"use client";
import {
  Box, Heading, Text, Input, Button, Stack, Select, Portal,
  createListCollection, HStack, Center, Image,
} from "@chakra-ui/react";
import { useRef, useState } from "react";
import AvatarPicker from "./AvatarPicker";
import { getAvatarById } from "@/lib/avatars";
import { updateApplicantProfile, uploadApplicantAvatar, deleteApplicantAvatar } from "@/lib/api";
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

const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp"];

type Props = {
  fullName: string;
  expertise: string[];
  avatarId: string | null;
  avatarUrl: string | null;
  onFullNameChange: (v: string) => void;
  onExpertiseChange: (v: string[]) => void;
  onAvatarChange: (v: string) => void;
  onAvatarUrlChange: (v: string | null) => void;
  onSaved: () => void;
};

export default function ApplicantProfileCard({
  fullName, expertise, avatarId, avatarUrl,
  onFullNameChange, onExpertiseChange, onAvatarChange, onAvatarUrlChange, onSaved,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedAvatar = getAvatarById(avatarId);
  const displayUrl = previewUrl ?? avatarUrl;

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      toaster.create({ title: "Unsupported file", description: "Use a PNG, JPG or WebP image.", type: "error" });
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toaster.create({ title: "Image too large", description: "Maximum size is 2 MB.", type: "error" });
      return;
    }

    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);
    setUploading(true);
    try {
      const res = await uploadApplicantAvatar(file);
      if (!res.ok) throw new Error();
      const data: { avatar_url: string } = await res.json();
      onAvatarUrlChange(data.avatar_url);
      toaster.create({ title: "Profile picture updated", type: "success" });
    } catch {
      toaster.create({ title: "Couldn't upload picture", type: "error" });
    } finally {
      URL.revokeObjectURL(preview);
      setPreviewUrl(null);
      setUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    try {
      const res = await deleteApplicantAvatar();
      if (!res.ok) throw new Error();
      onAvatarUrlChange(null);
      toaster.create({ title: "Photo removed", type: "success" });
    } catch {
      toaster.create({ title: "Couldn't remove photo", type: "error" });
    }
  };

  // Picking a preset avatar replaces any uploaded photo.
  const handleAvatarSelect = async (id: string) => {
    onAvatarChange(id);
    if (avatarUrl) {
      try {
        const res = await deleteApplicantAvatar();
        if (res.ok) onAvatarUrlChange(null);
      } catch {
        /* keep the uploaded photo if removal fails */
      }
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
            opacity={uploading ? 0.6 : 1}
          >
            {displayUrl ? (
              <Image src={displayUrl} alt="Profile picture" boxSize="100%" objectFit="cover" />
            ) : selectedAvatar ? (
              selectedAvatar.Svg
            ) : (
              <Center h="100%" color="gray.400" fontSize="xs">No avatar</Center>
            )}
          </Box>

          <Stack gap={1} mt={3} align="center">
            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_AVATAR_TYPES.join(",")}
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
            <Button
              size="xs"
              variant="outline"
              colorPalette="brand"
              loading={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              Upload photo
            </Button>
            {avatarUrl && (
              <Button size="xs" variant="ghost" onClick={handleRemovePhoto} disabled={uploading}>
                Remove photo
              </Button>
            )}
          </Stack>
        </Box>

        <Box flex="1" minW="260px">
          <Text fontSize="sm" fontWeight="600" mb={2}>Or choose an avatar</Text>
          <AvatarPicker selectedId={avatarUrl ? null : avatarId} onSelect={handleAvatarSelect} />
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