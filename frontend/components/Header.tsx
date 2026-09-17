// frontend/components/Header.tsx
import { Flex, Heading } from "@chakra-ui/react";
import Logo from "./Logo";

export default function Header() {
  return (
    <Flex
      align="center"
      gap={2}
      px={4}
      py={3}
      bg="surface"
      borderBottom="1px solid #E5E3DD"
    >
      <Logo size={32} />
      <Heading size="md" color="brand.500">
        PerchRole
      </Heading>
    </Flex>
  );
}