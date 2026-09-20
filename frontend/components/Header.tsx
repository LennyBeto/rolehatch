// frontend/components/Header.tsx
import { Flex, Heading, Spacer } from "@chakra-ui/react";
import Logo from "./Logo";
import { ColorModeButton } from "@/components/ui/color-mode";

export default function Header() {
  return (
    <Flex
      align="center"
      gap={2}
      px={4}
      py={3}
      bg="surface"
      borderBottom="1px solid #E5E3DD"
      position="sticky"
      top={0}
      zIndex={10}
      boxShadow="0 1px 2px rgba(0,0,0,0.03)"
    >
      <Logo size={32} />
      <Heading size="md" color="brand.500">PerchRole</Heading>
      <Spacer />
      <ColorModeButton />
    </Flex>
  );
}