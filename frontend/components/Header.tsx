// frontend/components/Header.tsx
"use client";
import { Flex, Heading, HStack, Button, Text, Box, Avatar, IconButton } from "@chakra-ui/react";
import Link from "next/link";
import { useState, useRef } from "react";
import { FaDiscord } from "react-icons/fa";
import Logo from "./Logo";
import { ColorModeButton } from "@/components/ui/color-mode";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import SignInModal from "./SignInModal";

const HOVER_CLOSE_DELAY_MS = 150;
const DISCORD_INVITE_URL = "https://discord.gg/4Pa4E96j2";

export default function Header() {
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const openMenu = () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    setMenuOpen(true);
  };

  const scheduleCloseMenu = () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = setTimeout(() => setMenuOpen(false), HOVER_CLOSE_DELAY_MS);
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
          <IconButton
            asChild
            variant="ghost"
            aria-label="Join our Discord"
            size="sm"
          >
            <a href={DISCORD_INVITE_URL} target="_blank" rel="noopener noreferrer">
              <FaDiscord size={18} />
            </a>
          </IconButton>

          <ColorModeButton />

          {user ? (
            <Box
              position="relative"
              onMouseEnter={openMenu}
              onMouseLeave={scheduleCloseMenu}
            >
              <Avatar.Root size="sm" cursor="pointer">
                <Avatar.Fallback name={user.email ?? "User"} />
              </Avatar.Root>

              {menuOpen && (
                <Box
                  position="absolute"
                  top="calc(100% + 8px)"
                  right={0}
                  bg="surface"
                  border="1px solid #E5E3DD"
                  borderRadius="md"
                  boxShadow="0 8px 24px rgba(0,0,0,0.12)"
                  minW="200px"
                  py={2}
                  zIndex={20}
                >
                  <Text px={4} pt={1} pb={2} fontSize="xs" fontWeight="700" color="gray.500" textTransform="uppercase" letterSpacing="wide">
                    Applicant
                  </Text>
                  <Box as="a" href="/#listings" display="block" px={4} py={2} fontSize="sm" color="text" _hover={{ bg: "background" }}>
                    Find Jobs
                  </Box>
                  <Box as="a" href="/#listings" display="block" px={4} py={2} fontSize="sm" color="text" _hover={{ bg: "background" }}>
                    Saved Jobs
                  </Box>

                  <Box borderTop="1px solid #E5E3DD" my={2} />

                  <Text px={4} pt={1} pb={2} fontSize="xs" fontWeight="700" color="gray.500" textTransform="uppercase" letterSpacing="wide">
                    Employer
                  </Text>
                  <Box as="a" href="/post-job" display="block" px={4} py={2} fontSize="sm" color="text" _hover={{ bg: "background" }}>
                    Post a Job
                  </Box>
                  <Box as="a" href="/dashboard" display="block" px={4} py={2} fontSize="sm" color="text" _hover={{ bg: "background" }}>
                    Dashboard
                  </Box>

                  <Box borderTop="1px solid #E5E3DD" my={2} />

                  <Box
                    as="button"
                    display="block"
                    w="full"
                    textAlign="left"
                    px={4}
                    py={2}
                    fontSize="sm"
                    color="red.500"
                    _hover={{ bg: "background" }}
                    onClick={handleSignOut}
                  >
                    Sign Out
                  </Box>
                </Box>
              )}
            </Box>
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