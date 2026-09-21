// frontend/components/Header.tsx
"use client";
import { Flex, Heading, Spacer, HStack, Button, Text, Menu, Portal, Avatar } from "@chakra-ui/react";
import { useState } from "react";
import Logo from "./Logo";
import { ColorModeButton } from "@/components/ui/color-mode";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import SignInModal from "./SignInModal";

export default function Header() {
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <>
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
          <Text as="a" href="/#listings" fontSize="sm" fontWeight="500" cursor="pointer">Find Jobs</Text>
          <Text as="a" href="/post-job" fontSize="sm" fontWeight="500" cursor="pointer">Post a Job</Text>
          <Text fontSize="sm" fontWeight="500" cursor="pointer">Company</Text>
          <Text fontSize="sm" fontWeight="500" cursor="pointer">Blog</Text>
        </HStack>

        <Spacer />

        <HStack gap={3}>
          <ColorModeButton />

          {user ? (
            <Menu.Root>
              <Menu.Trigger asChild>
                <Avatar.Root size="sm" cursor="pointer">
                  <Avatar.Fallback name={user.email ?? "User"} />
                </Avatar.Root>
              </Menu.Trigger>
              <Portal>
                <Menu.Positioner>
                  <Menu.Content>
                    <Menu.Item value="post-job" asChild>
                      <a href="/post-job">Post a Job</a>
                    </Menu.Item>
                    <Menu.Item value="dashboard" asChild>
                      <a href="/dashboard">Dashboard</a>
                    </Menu.Item>
                    <Menu.Item value="signout" onClick={handleSignOut}>
                      Sign Out
                    </Menu.Item>
                  </Menu.Content>
                </Menu.Positioner>
              </Portal>
            </Menu.Root>
          ) : (
            <>
              <Text
                fontSize="sm"
                fontWeight="500"
                cursor="pointer"
                onClick={() => setModalOpen(true)}
              >
                Login
              </Text>
              <Button
                colorPalette="brand"
                size="sm"
                borderRadius="full"
                px={5}
                onClick={() => setModalOpen(true)}
              >
                Join Free
              </Button>
            </>
          )}
        </HStack>
      </Flex>

      <SignInModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}