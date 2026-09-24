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

export const getMyApplications = () =>
   authedFetch("/api/saved-jobs/applications");

export const hideJob = (jobId: string) =>
  authedFetch(`/api/saved-jobs/${jobId}`, { method: "PATCH", body: JSON.stringify({ status: "hidden" }) });

export { authedFetch };

export const upsertApplicantProfile = async (data: {
  firstName: string;
  lastName: string;
  jobTitle: string;
  isPublic: boolean;
  cv?: File | null;
}) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not signed in");

  const form = new FormData();
  form.append("first_name", data.firstName);
  form.append("last_name", data.lastName);
  form.append("job_title", data.jobTitle);
  form.append("is_public", String(data.isPublic));
  if (data.cv) form.append("cv", data.cv);

  return fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/applicants/me`, {
    method: "POST",
    headers: { Authorization: `Bearer ${session.access_token}` },
    body: form,
  });
};

export const getMyApplicantProfile = () => authedFetch("/api/applicants/me");