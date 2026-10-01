// frontend/lib/cvApi.ts
import { supabase } from "./supabaseClient";

export type CVEntry = { lines: string[]; bullets: string[] };
export type CVData = {
  name: string; email: string; phone: string; location: string; links: string[]; summary: string;
  experience: CVEntry[]; education: CVEntry[]; projects: CVEntry[]; certifications: CVEntry[]; skills: string[];
};
export type CVTemplate = {
  id: string; name: string; description: string; font_family: "serif" | "sans";
  align: "left" | "center"; accent: string; caps: boolean; rule: boolean;
  order: string[]; labels: Record<string, string>;
  base: number; name_size: number; gap: number; margin: number;
};
export type ATSReport = { score: number; checks: { label: string; passed: boolean }[] };

const BASE = process.env.NEXT_PUBLIC_API_URL;

async function request(path: string, init: RequestInit = {}, json = false) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not signed in");
  const headers: Record<string, string> = { Authorization: `Bearer ${session.access_token}` };
  if (json) headers["Content-Type"] = "application/json"; // never set for FormData — browser adds the boundary
  const res = await fetch(`${BASE}/api/cv${path}`, { ...init, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    const detail = err?.detail;
    throw new Error(typeof detail === "string" ? detail : detail?.[0]?.msg || "Request failed");
  }
  return res;
}

export async function fetchTemplates(): Promise<CVTemplate[]> {
  return (await request("/templates")).json();
}

export async function parseCV(input: { file?: File; googleDocUrl?: string }): Promise<{ cv: CVData; ats: ATSReport }> {
  const form = new FormData();
  if (input.file) form.append("file", input.file);
  if (input.googleDocUrl) form.append("google_doc_url", input.googleDocUrl);
  return (await request("/parse", { method: "POST", body: form })).json();
}

export async function renderCV(templateId: string, cv: CVData): Promise<Blob> {
  const res = await request("/render", { method: "POST", body: JSON.stringify({ template_id: templateId, cv }) }, true);
  return res.blob();
}