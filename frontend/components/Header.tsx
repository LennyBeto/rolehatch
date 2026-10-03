// frontend/components/Header.tsx
"use client";
import { Flex, Heading, HStack, Button, Text, Box, Avatar, IconButton } from "@chakra-ui/react";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { FaDiscord } from "react-icons/fa";
import { LuBell, LuMenu, LuX } from "react-icons/lu";
import Logo from "./Logo";
import { ColorModeButton } from "@/components/ui/color-mode";
import { useAuth } from "@/lib/AuthContext";
import { useNotifications } from "@/lib/NotificationContext";
import { supabase } from "@/lib/supabaseClient";
import SignInModal from "./SignInModal";

const HOVER_CLOSE_DELAY_MS = 150;
const DISCORD_INVITE_URL = "https://discord.gg/4Pa4E96j2";

const NAV_LINKS = [
  { label: "Find Jobs", href: "/#listings" },
  { label: "Post a Job", href: "/post-job" },
  { label: "Company", href: "/company" },
  { label: "Blog", href: "/blog" },
];

const navLinkStyle = {
  fontSize: "14px",
  fontWeight: 500,
  cursor: "pointer",
  textDecoration: "none",
  color: "inherit",
} as const;

const menuLinkStyle = {
  display: "block",
  padding: "8px 16px",
  fontSize: "14px",
  color: "var(--chakra-colors-text)",
  textDecoration: "none",
} as const;

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
  const [navOpen, setNavOpen] = useState(false);

  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bellCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Tracks the last pointer type so hover only drives menus for real mice;
  // touch/keyboard use tap-to-toggle instead.
  const lastPointerType = useRef<string>("");
  const menuRef = useRef<HTMLDivElement | null>(null);
  const bellRef = useRef<HTMLDivElement | null>(null);
  const navRef = useRef<HTMLDivElement | null>(null);

  // Close any open dropdown when tapping/clicking outside of it
  useEffect(() => {
    const handler = (e: PointerEvent) => {
      const target = e.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) setMenuOpen(false);
      if (bellRef.current && !bellRef.current.contains(target)) setBellOpen(false);
      if (navRef.current && !navRef.current.contains(target)) setNavOpen(false);
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const openMenu = () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    setBellOpen(false);
    setNavOpen(false);
    setMenuOpen(true);
  };

  const scheduleCloseMenu = () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = setTimeout(() => setMenuOpen(false), HOVER_CLOSE_DELAY_MS);
  };

  const openBell = () => {
    if (bellCloseTimeoutRef.current) clearTimeout(bellCloseTimeoutRef.current);
    setMenuOpen(false);
    setNavOpen(false);
    setBellOpen(true);
    markAllRead();
  };

  const scheduleCloseBell = () => {
    if (bellCloseTimeoutRef.current) clearTimeout(bellCloseTimeoutRef.current);
    bellCloseTimeoutRef.current = setTimeout(() => setBellOpen(false), HOVER_CLOSE_DELAY_MS);
  };

  const isMouse = () => lastPointerType.current === "mouse";

  const handleBellClick = () => {
    if (isMouse()) return openBell(); // hover already handles mouse
    bellOpen ? setBellOpen(false) : openBell();
  };

  const handleAvatarClick = () => {
    if (isMouse()) return openMenu();
    menuOpen ? setMenuOpen(false) : openMenu();
  };

  const toggleNav = () => {
    setMenuOpen(false);
    setBellOpen(false);
    setNavOpen((prev) => !prev);
  };

  return (
    <>
      <Flex
        align="center"
        gap={{ base: 2, md: 6 }}
        px={{ base: 3, md: 6 }}
        py={3}
        bg="surface"
        borderBottom="1px solid #E5E3DD"
        position="sticky"
        top={0}
        zIndex={10}
        boxShadow="0 1px 2px rgba(0,0,0,0.03)"
        w="100%"
      >
        <Link href="/" style={{ textDecoration: "none" }}>
          <Flex align="center" gap={{ base: 2, md: 2.5 }} flexShrink={0}>
            <Logo size={32} />
            <Heading
              as="span"
              fontSize={{ base: "xl", md: "2xl" }}
              color="brand.500"
              lineHeight="1"
              letterSpacing="-0.03em"
            >
              PerchRole
            </Heading>
          </Flex>
        </Link>

        {/* Desktop nav */}
        <Flex flex="1" justify="center" display={{ base: "none", md: "flex" }}>
          <HStack gap={4}>
            {NAV_LINKS.map((l) => (
              <Link key={l.href} href={l.href} style={navLinkStyle}>{l.label}</Link>
            ))}
          </HStack>
        </Flex>

        {/* Mobile spacer pushes actions to the right */}
        <Box flex="1" display={{ base: "block", md: "none" }} />

        <HStack gap={{ base: 1, md: 3 }} flexShrink={0}>
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
              ref={bellRef}
              position="relative"
              onPointerEnter={(e) => {
                lastPointerType.current = e.pointerType;
                if (e.pointerType === "mouse") openBell();
              }}
              onPointerLeave={(e) => {
                if (e.pointerType === "mouse") scheduleCloseBell();
              }}
            >
              <IconButton
                variant="ghost"
                aria-label="Notifications"
                size="sm"
                position="relative"
                onPointerDown={(e) => { lastPointerType.current = e.pointerType; }}
                onClick={handleBellClick}
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
                  // Mobile: pin to screen edges so it can't overflow off-screen.
                  // Desktop: anchored under the bell exactly as before.
                  position={{ base: "fixed", md: "absolute" }}
                  top={{ base: "60px", md: "calc(100% + 8px)" }}
                  left={{ base: 3, md: "auto" }}
                  right={{ base: 3, md: 0 }}
                  bg="surface"
                  border="1px solid #E5E3DD"
                  borderRadius="md"
                  boxShadow="0 8px 24px rgba(0,0,0,0.12)"
                  minW={{ base: "auto", md: "300px" }}
                  maxW={{ base: "none", md: "360px" }}
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
              ref={menuRef}
              position="relative"
              onPointerEnter={(e) => {
                lastPointerType.current = e.pointerType;
                if (e.pointerType === "mouse") openMenu();
              }}
              onPointerLeave={(e) => {
                if (e.pointerType === "mouse") scheduleCloseMenu();
              }}
            >
              <Avatar.Root
                size="sm"
                cursor="pointer"
                role="button"
                aria-label="Account menu"
                onPointerDown={(e) => { lastPointerType.current = e.pointerType; }}
                onClick={handleAvatarClick}
              >
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
                  maxH="calc(100vh - 80px)"
                  overflowY="auto"
                  py={2}
                  zIndex={20}
                >
                  <Text px={4} pt={1} pb={2} fontSize="xs" fontWeight="700" color="gray.500" textTransform="uppercase" letterSpacing="wide">
                    Applicant
                  </Text>
                  <a href="/#listings" style={menuLinkStyle}>Find Jobs</a>
                  <a href="/applicant/dashboard" style={menuLinkStyle}>Dashboard</a>

                  <Box borderTop="1px solid #E5E3DD" my={2} />

                  <Text px={4} pt={1} pb={2} fontSize="xs" fontWeight="700" color="gray.500" textTransform="uppercase" letterSpacing="wide">
                    Employer
                  </Text>
                  <a href="/post-job" style={menuLinkStyle}>Post a Job</a>
                  <a href="/dashboard" style={menuLinkStyle}>Dashboard</a>

                  <Box borderTop="1px solid #E5E3DD" my={2} />

                  <a href="/wallet" style={menuLinkStyle}>Wallet</a>

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
                display={{ base: "none", md: "block" }}
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
                px={{ base: 3, md: 5 }}
                onClick={() => setModalOpen(true)}
              >
                Join Free
              </Button>
            </>
          )}

          {/* Mobile nav menu (hidden on md+) */}
          <Box ref={navRef} position="relative" display={{ base: "block", md: "none" }}>
            <IconButton
              variant="ghost"
              size="sm"
              aria-label={navOpen ? "Close menu" : "Open menu"}
              aria-expanded={navOpen}
              onClick={toggleNav}
            >
              {navOpen ? <LuX size={20} /> : <LuMenu size={20} />}
            </IconButton>

            {navOpen && (
              <Box
                position="fixed"
                top="60px"
                left={3}
                right={3}
                bg="surface"
                border="1px solid #E5E3DD"
                borderRadius="md"
                boxShadow="0 8px 24px rgba(0,0,0,0.12)"
                py={2}
                zIndex={20}
              >
                {NAV_LINKS.map((l) => (
                  <a key={l.href} href={l.href} style={{ ...menuLinkStyle, padding: "12px 16px" }}>
                    {l.label}
                  </a>
                ))}
                {!user && (
                  <>
                    <Box borderTop="1px solid #E5E3DD" my={2} />
                    <Box
                      as="button"
                      display="block"
                      w="full"
                      textAlign="left"
                      px={4}
                      py={3}
                      fontSize="sm"
                      onClick={() => {
                        setNavOpen(false);
                        setModalOpen(true);
                      }}
                    >
                      Login
                    </Box>
                  </>
                )}
              </Box>
            )}
          </Box>
        </HStack>
      </Flex>

      <SignInModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}