// frontend/components/Header.tsx
import { Flex, Heading, Spacer, HStack, Button, Text } from "@chakra-ui/react";
import Logo from "./Logo";
import { ColorModeButton } from "@/components/ui/color-mode";

export default function Header() {
  return (
    <Flex
      align="center"
      gap={6}
      px={6}
      py={3}
      bg="surface"
      borderBottom="1px solid #E5E3DD"
      position="sticky"
      top={0}
      zIndex={10}
      boxShadow="0 1px 2px rgba(0,0,0,0.03)"
    >
      <Flex align="center" gap={2}>
        <Logo size={28} />
        <Heading size="md" color="brand.500">PerchRole</Heading>
      </Flex>

      <HStack gap={5} display={{ base: "none", md: "flex" }}>
        <Text fontSize="sm" fontWeight="500" cursor="pointer">Find Jobs</Text>
        <Text fontSize="sm" fontWeight="500" cursor="pointer">Post a Job</Text>
        <Text fontSize="sm" fontWeight="500" cursor="pointer">Company</Text>
        <Text fontSize="sm" fontWeight="500" cursor="pointer">Blog</Text>
      </HStack>

      <Spacer />

      <HStack gap={3}>
        <ColorModeButton />
        <Text fontSize="sm" fontWeight="500" cursor="pointer">Login</Text>
        <Button size="sm" colorPalette="brand" borderRadius="full" px={5}>
          Join Free
        </Button>
      </HStack>
    </Flex>
  );
}