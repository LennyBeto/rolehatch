// frontend/lib/api.ts
import { supabase } from "./supabaseClient";

async function authedFetch(path: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not signed in");

  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

  return fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${session.access_token}`,
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
    },
  });
}

export const saveJob = (jobId: string) =>
  authedFetch("/api/saved-jobs", { method: "POST", body: JSON.stringify({ job_id: jobId, status: "saved" }) });

export const markApplied = (jobId: string) =>
  authedFetch(`/api/saved-jobs/${jobId}`, { method: "PATCH", body: JSON.stringify({ status: "applied" }) });

export const hideJob = (jobId: string) =>
  authedFetch(`/api/saved-jobs/${jobId}`, { method: "PATCH", body: JSON.stringify({ status: "hidden" }) });

export type ApplicantProfile = {
  full_name: string | null;
  expertise: string | null;
  avatar_id: string | null;
  avatar_url?: string | null;
  cv_filename: string | null;
  has_match_score: boolean;
};

// Summarized detail returned by GET/POST /api/applicant/profile/summary
export type ApplicantSummary = {
  full_name: string;
  expertise: string;
  headline: string; // "Full Name - Expertise"
  summary: string; // 30-50 words
  summary_word_count: number;
  summary_source: "manual" | "cv" | "existing" | null; // only set on save
  avatar_url: string | null;
  cv_filename: string | null;
  updated_at: string | null;
};

// POST /api/applicant/profile/cv response (suggested_summary is null when the CV has too little text)
export type ApplicantCVUploadResult = {
  ok: boolean;
  filename: string;
  suggested_summary: string | null;
};

// Word limits, kept in sync with the backend (app/services/cv_summary.py)
export const SUMMARY_MIN_WORDS = 30;
export const SUMMARY_MAX_WORDS = 50;

export const getApplicantProfile = () => authedFetch("/api/applicant/profile");

export const updateApplicantProfile = (
  payload: Partial<Pick<ApplicantProfile, "full_name" | "expertise" | "avatar_id">>
) => authedFetch("/api/applicant/profile", { method: "PUT", body: JSON.stringify(payload) });

// NEW: reset name, expertise, summary and profile image to defaults (CV and visibility are kept)
export const resetApplicantProfile = () =>
  authedFetch("/api/applicant/profile/reset", { method: "POST" });

// Omit/blank `summary` to generate it from the stored CV.
export const getApplicantSummary = () => authedFetch("/api/applicant/profile/summary");

export const saveApplicantSummary = (payload: {
  full_name: string;
  expertise: string;
  summary?: string | null;
}) => authedFetch("/api/applicant/profile/summary", { method: "POST", body: JSON.stringify(payload) });

export const uploadApplicantCV = (file: File) => {
  const form = new FormData();
  form.append("file", file);
  return authedFetch("/api/applicant/profile/cv", { method: "POST", body: form });
};

// NEW: remove the stored CV (also clears match score/embedding; the saved summary is kept)
export const deleteApplicantCV = () =>
  authedFetch("/api/applicant/profile/cv", { method: "DELETE" });

export const scanApplicantCV = () =>
  authedFetch("/api/applicant/profile/cv/scan", { method: "POST" });

export const uploadApplicantAvatar = (file: File) => {
  const form = new FormData();
  form.append("file", file);
  return authedFetch("/api/applicant/profile/avatar", { method: "POST", body: form });
};

export const deleteApplicantAvatar = () =>
  authedFetch("/api/applicant/profile/avatar", { method: "DELETE" });

export { authedFetch };