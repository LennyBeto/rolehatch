// frontend/lib/ProfileSummaryContext.tsx
"use client";
import { createContext, useContext, useState, useMemo } from "react";

type ProfileSummaryContextType = {
  summary: string;
  setSummary: (value: string) => void;
};

const ProfileSummaryContext = createContext<ProfileSummaryContextType>({
  summary: "",
  setSummary: () => {}, // safe no-op outside the provider
});

export function ProfileSummaryProvider({
  children,
  initialSummary = "",
}: {
  children: React.ReactNode;
  initialSummary?: string;
}) {
  const [summary, setSummary] = useState(initialSummary);
  const value = useMemo(() => ({ summary, setSummary }), [summary]);
  return (
    <ProfileSummaryContext.Provider value={value}>
      {children}
    </ProfileSummaryContext.Provider>
  );
}

export const useProfileSummary = () => useContext(ProfileSummaryContext);