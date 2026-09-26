// frontend/components/Header.tsx
"use client";
import { Flex, Heading, HStack, Button, Text, Box, Avatar, IconButton } from "@chakra-ui/react";
import Link from "next/link";
import { useState, useRef } from "react";
import { FaDiscord } from "react-icons/fa";
import { LuBell } from "react-icons/lu";
import Logo from "./Logo";
import { ColorModeButton } from "@/components/ui/color-mode";
import { useAuth } from "@/lib/AuthContext";
import { useNotifications } from "@/lib/NotificationContext";
import { supabase } from "@/lib/supabaseClient";
import SignInModal from "./SignInModal";

const HOVER_CLOSE_DELAY_MS = 150;
const DISCORD_INVITE_URL = "https://discord.gg/4Pa4E96j2";

function formatNotificationTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export default function Header() {
  const { user } = useAuth();
  const { notifications, unreadCount, markAllRead } = useNotifications();
  const [modalOpen, setModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bellCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const openBell = () => {
    if (bellCloseTimeoutRef.current) clearTimeout(bellCloseTimeoutRef.current);
    setBellOpen(true);
    markAllRead();
  };

  const scheduleCloseBell = () => {
    if (bellCloseTimeoutRef.current) clearTimeout(bellCloseTimeoutRef.current);
    bellCloseTimeoutRef.current = setTimeout(() => setBellOpen(false), HOVER_CLOSE_DELAY_MS);
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

          {user && (
            <Box
              position="relative"
              onMouseEnter={openBell}
              onMouseLeave={scheduleCloseBell}
            >
              <IconButton
                variant="ghost"
                aria-label="Notifications"
                size="sm"
                position="relative"
              >
                <LuBell size={18} />
                {unreadCount > 0 && (
                  <Box
                    position="absolute"
                    top="4px"
                    right="4px"
                    bg="red.500"
                    color="white"
                    borderRadius="full"
                    fontSize="10px"
                    fontWeight="700"
                    minW="16px"
                    h="16px"
                    px="3px"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    lineHeight="1"
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Box>
                )}
              </IconButton>

              {bellOpen && (
                <Box
                  position="absolute"
                  top="calc(100% + 8px)"
                  right={0}
                  bg="surface"
                  border="1px solid #E5E3DD"
                  borderRadius="md"
                  boxShadow="0 8px 24px rgba(0,0,0,0.12)"
                  minW="300px"
                  maxW="360px"
                  maxH="360px"
                  overflowY="auto"
                  py={2}
                  zIndex={20}
                >
                  <Text px={4} pt={1} pb={2} fontSize="xs" fontWeight="700" color="gray.500" textTransform="uppercase" letterSpacing="wide">
                    Notifications
                  </Text>
                  {notifications.length === 0 ? (
                    <Text px={4} py={3} fontSize="sm" color="gray.500">
                      Nothing yet — activity on your jobs will show up here.
                    </Text>
                  ) : (
                    notifications.map((n) => (
                      <Box key={n.id} px={4} py={2} _hover={{ bg: "background" }}>
                        <Text fontSize="sm" color="text">{n.message}</Text>
                        <Text fontSize="xs" color="gray.500" mt={0.5}>
                          {formatNotificationTime(n.createdAt)}
                        </Text>
                      </Box>
                    ))
                  )}
                </Box>
              )}
            </Box>
          )}

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