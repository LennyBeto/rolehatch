// frontend/app/providers.tsx
"use client";
import { ChakraProvider } from "@chakra-ui/react";
import system from "@/theme";
import { AuthProvider } from "@/lib/AuthContext";
import { Toaster } from "@/components/ui/toaster";
import { EmotionRegistry } from "./emotion-registry";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <EmotionRegistry>
      <ChakraProvider value={system}>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </ChakraProvider>
    </EmotionRegistry>
  );
}