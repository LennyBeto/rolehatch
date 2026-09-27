// frontend/lib/AuthContext.tsx
"use client";
import { createContext, useContext, useEffect, useState, useRef } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabaseClient";

type AuthContextType = { user: User | null; session: Session | null; loading: boolean };
const AuthContext = createContext<AuthContextType>({ user: null, session: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const lastTokenRef = useRef<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      lastTokenRef.current = data.session?.access_token ?? null;
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      // Supabase re-fires this listener for events that don't actually change
      // the token (tab focus, re-subscription, duplicate TOKEN_REFRESHED
      // notifications). Only update state — and therefore only produce a new
      // `user` object reference for consumers — when the token has genuinely
      // changed, otherwise dependent effects re-fire in a loop.
      const newToken = newSession?.access_token ?? null;
      if (newToken === lastTokenRef.current) return;
      lastTokenRef.current = newToken;
      setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user: session?.user ?? null, session, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);