// frontend/lib/api.ts
import { supabase } from "./supabaseClient";

async function authedFetch(path: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not signed in");

  return fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
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
  cv_filename: string | null;
  last_ats_score: number | null;
};

export const getApplicantProfile = () => authedFetch("/api/applicant/profile");

export const updateApplicantProfile = (payload: {
  full_name?: string;
  expertise?: string;
  avatar_id?: string;
}) => authedFetch("/api/applicant/profile", { method: "PUT", body: JSON.stringify(payload) });

export const uploadApplicantCV = async (file: File) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not signed in");

  const form = new FormData();
  form.append("file", file);

  return fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/applicant/profile/cv`, {
    method: "POST",
    headers: { Authorization: `Bearer ${session.access_token}` },
    body: form,
  });
};

export const scanApplicantCV = () =>
  authedFetch("/api/applicant/profile/cv/scan", { method: "POST" });

export { authedFetch };