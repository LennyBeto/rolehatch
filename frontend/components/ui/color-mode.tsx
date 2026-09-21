// frontend/components/ui/color-mode.tsx
"use client";
import { ThemeProvider, useTheme } from "next-themes";
import type { ThemeProviderProps } from "next-themes";
import { ClientOnly, IconButton, Skeleton } from "@chakra-ui/react";
import { LuMoon, LuSun } from "react-icons/lu";
import * as React from "react";

if (typeof window !== "undefined") {
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("Encountered a script tag while rendering React component")
    ) {
      return; // known next-themes + React 19 false positive — script runs correctly during SSR
    }
    originalError(...args);
  };
}

export function ColorModeProvider(props: ThemeProviderProps) {
  return (
    <ThemeProvider
      attribute="class"
      disableTransitionOnChange
      defaultTheme="system"
      enableColorScheme={false}
      {...props}
    />
  );
}

export function useColorMode() {
  const { resolvedTheme, setTheme, forcedTheme } = useTheme();
  const colorMode = forcedTheme || resolvedTheme;
  const toggleColorMode = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };
  return { colorMode, setColorMode: setTheme, toggleColorMode };
}

export function useColorModeValue<T>(light: T, dark: T) {
  const { colorMode } = useColorMode();
  return colorMode === "dark" ? dark : light;
}

export function ColorModeButton() {
  const { toggleColorMode, colorMode } = useColorMode();
  return (
    <ClientOnly fallback={<Skeleton boxSize="8" />}>
      <IconButton
        onClick={toggleColorMode}
        variant="ghost"
        aria-label="Toggle color mode"
        size="sm"
      >
        {colorMode === "dark" ? <LuSun /> : <LuMoon />}
      </IconButton>
    </ClientOnly>
  );
}