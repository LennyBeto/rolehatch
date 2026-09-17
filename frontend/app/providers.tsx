// frontend/app/providers.tsx
"use client";
import { ChakraProvider } from "@chakra-ui/react";
import system from "@/theme";
import { AuthProvider } from "@/lib/AuthContext";
import { Toaster } from "@/components/ui/toaster";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ChakraProvider value={system}>
      <AuthProvider>
        {children}
        <Toaster />
      </AuthProvider>
    </ChakraProvider>
  );
}