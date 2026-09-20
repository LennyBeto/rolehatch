// frontend/app/providers.tsx
"use client";
import { ChakraProvider } from "@chakra-ui/react";
import system from "@/theme";
import { AuthProvider } from "@/lib/AuthContext";
import { Toaster } from "@/components/ui/toaster";
import { EmotionRegistry } from "./emotion-registry";
import { ColorModeProvider } from "@/components/ui/color-mode";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <EmotionRegistry>
      <ChakraProvider value={system}>
        <ColorModeProvider>
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </ColorModeProvider>
      </ChakraProvider>
    </EmotionRegistry>
  );
}