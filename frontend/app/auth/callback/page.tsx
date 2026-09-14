// frontend/app/auth/callback/page.tsx — Supabase redirects here after clicking the email link
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallback() {
  const router = useRouter();
  useEffect(() => {
    supabase.auth.getSession().then(() => router.replace("/"));
  }, [router]);
  return null;
}