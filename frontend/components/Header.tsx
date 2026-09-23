// frontend/components/Header.tsx
"use client";
import { Flex, Heading, HStack, Button, Text, Menu, Portal, Avatar } from "@chakra-ui/react";
import Link from "next/link";
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
          <ColorModeButton />

          {user ? (
            <Menu.Root positioning={{ placement: "bottom-end", gutter: 8 }}>
              {/* Button anchor instead of Avatar.Root directly — Avatar.Root
                  does not reliably forward its ref for asChild, which was
                  causing the menu to render unpositioned at the top of the page. */}
              <Menu.Trigger asChild>
                <Button variant="ghost" p={0} minW="auto" h="auto" borderRadius="full">
                  <Avatar.Root size="sm" cursor="pointer">
                    <Avatar.Fallback name={user.email ?? "User"} />
                  </Avatar.Root>
                </Button>
              </Menu.Trigger>
              <Portal>
                <Menu.Positioner>
                  <Menu.Content minW="200px">
                    {/* Dashboard — nested submenu, opens on hover */}
                    <Menu.Root positioning={{ placement: "right-start", gutter: 4 }}>
                      <Menu.TriggerItem>
                        Dashboard
                      </Menu.TriggerItem>
                      <Portal>
                        <Menu.Positioner>
                          <Menu.Content minW="160px">
                            <Menu.Item value="applicant-dashboard" asChild>
                              <a href="/my-applications">Applicant</a>
                            </Menu.Item>
                            <Menu.Item value="employer-dashboard" asChild>
                              <a href="/dashboard">Employer</a>
                            </Menu.Item>
                          </Menu.Content>
                        </Menu.Positioner>
                      </Portal>
                    </Menu.Root>

                    <Menu.Item value="post-job" asChild>
                      <a href="/post-job">Post a Job</a>
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