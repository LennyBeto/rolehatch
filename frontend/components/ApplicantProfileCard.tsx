// frontend/components/ApplicantProfileCard.tsx
"use client";
import {
  Box, Heading, Text, Input, Button, Stack, Select, Portal,
  createListCollection, HStack, Center, Image,
} from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react"; // NEW (collapse): useEffect added
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

// NEW: expertise is stored as the option value (e.g. "backend_engineer"); this turns it into its display label.
// Falls back to the raw value for anything not in the list (this is how a custom "Other" expertise is shown).
export function expertiseLabel(value: string | null | undefined) {
  if (!value) return "";
  return EXPERTISE_COLLECTION.items.find((item) => item.value === value)?.label ?? value;
}

// NEW (other): true when a value is one of the predefined options
const isListedExpertise = (value: string | undefined) =>
  !!value && EXPERTISE_COLLECTION.items.some((item) => item.value === value);

const OTHER_MAX_LENGTH = 60; // NEW (other)

const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp"];

type Props = {
  fullName: string;
  expertise: string[];
  avatarId: string | null;
  avatarUrl: string | null;
  summary?: string; // NEW (summary): saved professional summary, shown under the profile row
  onFullNameChange: (v: string) => void;
  onExpertiseChange: (v: string[]) => void;
  onAvatarChange: (v: string) => void;
  onAvatarUrlChange: (v: string | null) => void;
  onSaved: () => void;
  onEditingChange?: (editing: boolean) => void; // NEW (collapse): tells the dashboard when the edit form is open
};

export default function ApplicantProfileCard({
  fullName, expertise, avatarId, avatarUrl,
  summary = "", // NEW (summary)
  onFullNameChange, onExpertiseChange, onAvatarChange, onAvatarUrlChange, onSaved,
  onEditingChange, // NEW (collapse)
}: Props) {
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  // NEW: open collapsed when a complete profile is already saved, or as the default form when it isn't
  // (first visit, or right after "Reset profile details" — reset remounts this card with empty values)
  const [editing, setEditing] = useState(() => !(fullName.trim() && expertise[0]));
  const fileInputRef = useRef<HTMLInputElement>(null);

  // NEW (other): a saved value that isn't in the list is a custom expertise, so reopen it as "Other" with the text filled in
  const [otherSelected, setOtherSelected] = useState(
    () => expertise[0] === "other" || (!!expertise[0] && !isListedExpertise(expertise[0]))
  );
  const [customExpertise, setCustomExpertise] = useState(
    () => (expertise[0] && !isListedExpertise(expertise[0]) ? expertise[0] : "")
  );
  const [showOtherError, setShowOtherError] = useState(false);
  const otherInputRef = useRef<HTMLInputElement>(null);

  // NEW (collapse): report edit mode (also fires on mount) so the Profile Summary card can reappear while editing
  useEffect(() => {
    onEditingChange?.(editing);
  }, [editing, onEditingChange]);

  const selectedAvatar = getAvatarById(avatarId);
  const displayUrl = previewUrl ?? avatarUrl;

  // NEW (other): dropdown change. "Other" reveals the text input; any listed option clears it.
  const handleExpertiseSelect = (value: string[]) => {
    if (value[0] === "other") {
      setOtherSelected(true);
      setShowOtherError(false);
      onExpertiseChange(customExpertise.trim() ? [customExpertise.trim()] : ["other"]);
      setTimeout(() => otherInputRef.current?.focus(), 0);
      return;
    }
    setOtherSelected(false);
    setCustomExpertise("");
    setShowOtherError(false);
    onExpertiseChange(value);
  };

  // NEW (other): the typed text becomes the stored expertise; an empty field falls back to the "other" placeholder
  const handleCustomExpertiseChange = (text: string) => {
    setCustomExpertise(text);
    if (text.trim()) setShowOtherError(false);
    onExpertiseChange(text.trim() ? [text.trim()] : ["other"]);
  };

  const handleSave = async () => {
    // NEW (other): "Other" needs a specific expertise before saving
    if (otherSelected && !customExpertise.trim()) {
      setShowOtherError(true);
      otherInputRef.current?.focus();
      return;
    }
    setSaving(true);
    try {
      const res = await updateApplicantProfile({
        full_name: fullName,
        expertise: expertise[0],
        avatar_id: avatarId ?? undefined,
      });
      if (!res.ok) throw new Error();
      toaster.create({ title: "Profile saved", type: "success" });
      // NEW: collapse to avatar + name + expertise, but only when there is something meaningful to show
      if (fullName.trim() && expertise[0]) setEditing(false);
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

  // NEW: collapsed view — one avatar, the full name and the expertise
  if (!editing) {
    return (
      <Box bg="surface" p={6} borderRadius="lg" border="1px solid #E5E3DD" mb={8}>
        <Heading size="md" mb={4}>My Profile</Heading>

        <HStack gap={5} align="center" flexWrap="wrap">
          <Box
            boxSize="96px"
            flexShrink={0}
            borderRadius="full"
            overflow="hidden"
            border="2px solid"
            borderColor="brand.500"
            bg="background"
          >
            {displayUrl ? (
              <Image src={displayUrl} alt="Profile picture" boxSize="100%" objectFit="cover" />
            ) : selectedAvatar ? (
              selectedAvatar.Svg
            ) : (
              <Center h="100%" color="gray.400" fontSize="xs">No avatar</Center>
            )}
          </Box>

          <Box flex="1" minW="200px">
            <Text fontWeight="700" fontSize="lg">{fullName}</Text>
            <Text color="gray.600">{expertiseLabel(expertise[0])}</Text>
          </Box>

          <Button size="sm" variant="outline" colorPalette="brand" onClick={() => setEditing(true)}>
            Edit profile
          </Button>
        </HStack>

        {/* NEW (summary): saved professional summary, shown under avatar / name / expertise */}
        {summary.trim() && (
          <Text
            mt={5}
            pt={4}
            borderTop="1px solid #E5E3DD"
            fontSize="sm"
            color="gray.600"
            whiteSpace="pre-wrap"
            lineHeight="1.7"
          >
            {summary.trim()}
          </Text>
        )}
      </Box>
    );
  }

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
            placeholder="e.g. John Doe"
            value={fullName}
            onChange={(e) => onFullNameChange(e.target.value)}
          />
        </Box>

        <Box>
          <Text fontSize="sm" fontWeight="600" mb={1}>Expertise</Text>
          <Select.Root
            collection={EXPERTISE_COLLECTION}
            value={otherSelected ? ["other"] : expertise} // CHANGED (other): stays on "Other" while a custom value is typed
            onValueChange={(e) => handleExpertiseSelect(e.value)}
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

          {/* NEW (other): specify the exact expertise when "Other" is selected */}
          {otherSelected && (
            <Box mt={3}>
              <Text fontSize="sm" fontWeight="600" mb={1}>Specify your expertise</Text>
              <Input
                ref={otherInputRef}
                colorPalette="brand"
                placeholder="e.g. Cloud Security Engineer"
                value={customExpertise}
                maxLength={OTHER_MAX_LENGTH}
                aria-label="Specify your expertise"
                aria-invalid={showOtherError} // CHANGED (fix): Chakra v3 Input has no `invalid` prop; aria-invalid drives its error styling
                data-invalid={showOtherError ? "" : undefined}
                onChange={(e) => handleCustomExpertiseChange(e.target.value)}
              />
              {showOtherError ? (
                <Text fontSize="xs" color="fg.error" mt={1}>
                  Please enter your expertise to continue.
                </Text>
              ) : (
                <Text fontSize="xs" color="gray.500" mt={1}>
                  {customExpertise.length}/{OTHER_MAX_LENGTH}
                </Text>
              )}
            </Box>
          )}
        </Box>

        <Button colorPalette="brand" onClick={handleSave} loading={saving} alignSelf="flex-start">
          Save Profile
        </Button>
      </Stack>
    </Box>
  );
}