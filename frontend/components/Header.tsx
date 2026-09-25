// frontend/components/Header.tsx
"use client";
import { Flex, Heading, HStack, Button, Text, Menu, Portal, Avatar, IconButton, Link as ChakraLink } from "@chakra-ui/react";
import Link from "next/link";
import { useState } from "react";
import Logo from "./Logo";
import { ColorModeButton } from "@/components/ui/color-mode";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import SignInModal from "./SignInModal";
import { FaDiscord } from "react-icons/fa";

const DISCORD_INVITE_URL = "https://discord.gg/YOUR_INVITE_CODE"; // replace with your PerchRole Tech Hub invite link

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
        <Link href="/" style={{ textDecoration: "none" }}>
          <Flex align="center" gap={2.5} flexShrink={0}>
            <Logo size={32} />
            <Heading as="span" size="lg" color="brand.500" lineHeight="1" letterSpacing="-0.03em">
              PerchRole
            </Heading>
          </Flex>
        </Link>

        <Flex flex="1" justify="center">
          <HStack gap={4} display={{ base: "none", md: "flex" }}>
            <Link href="/#listings" style={{ fontSize: "14px", fontWeight: 500, cursor: "pointer", textDecoration: "none", color: "inherit" }}>Find Jobs</Link>
            <Link href="/post-job" style={{ fontSize: "14px", fontWeight: 500, cursor: "pointer", textDecoration: "none", color: "inherit" }}>Post a Job</Link>
            <Link href="/company" style={{ fontSize: "14px", fontWeight: 500, cursor: "pointer", textDecoration: "none", color: "inherit" }}>Company</Link>
            <Link href="/blog" style={{ fontSize: "14px", fontWeight: 500, cursor: "pointer", textDecoration: "none", color: "inherit" }}>Blog</Link>
          </HStack>
        </Flex>

        <HStack gap={3} flexShrink={0}>
          <ChakraLink
            href={DISCORD_INVITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            _hover={{ textDecoration: "none" }}
          >
            <IconButton
              aria-label="Join PerchRole on Discord"
              variant="ghost"
              size="sm"
              color="gray.600"
              _hover={{ color: "#5865F2" }} // Discord brand blurple on hover
            >
              <FaDiscord size={18} />
            </IconButton>
          </ChakraLink>

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