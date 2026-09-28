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
  cv_filename: string | null;
  has_match_score: boolean;
};

export const getApplicantProfile = () => authedFetch("/api/applicant/profile");

export const updateApplicantProfile = (
  payload: Partial<Pick<ApplicantProfile, "full_name" | "expertise" | "avatar_id">>
) => authedFetch("/api/applicant/profile", { method: "PUT", body: JSON.stringify(payload) });

export const uploadApplicantCV = (file: File) => {
  const form = new FormData();
  form.append("file", file);
  return authedFetch("/api/applicant/profile/cv", { method: "POST", body: form });
};

export const scanApplicantCV = () =>
  authedFetch("/api/applicant/profile/cv/scan", { method: "POST" });

export { authedFetch };