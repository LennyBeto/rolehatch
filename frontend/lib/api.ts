// frontend/lib/api.ts
import { supabase } from "./supabaseClient";

const TOKEN_REFRESH_MARGIN_SECONDS = 60;

async function getFreshAccessToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not signed in");

  const expiresAt = session.expires_at ?? 0;
  const nowSeconds = Math.floor(Date.now() / 1000);
  const isStale = expiresAt - nowSeconds < TOKEN_REFRESH_MARGIN_SECONDS;

  if (!isStale) return session.access_token;

  const { data: refreshed, error } = await supabase.auth.refreshSession();
  if (error || !refreshed.session) {
    throw new Error("Not signed in");
  }
  return refreshed.session.access_token;
}

async function authedFetch(path: string, options: RequestInit = {}) {
  const accessToken = await getFreshAccessToken();

  const doFetch = (token: string) =>
    fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

  let res = await doFetch(accessToken);

  // Defensive retry: if the server still rejects the token (clock skew,
  // a refresh race, etc.), force one more refresh and try again before
  // giving up — this is what eliminates the "Invalid or expired token"
  // errors seen on dashboard load, profile load/save, and CV upload.
  if (res.status === 401) {
    const { data: refreshed } = await supabase.auth.refreshSession();
    if (refreshed.session) {
      res = await doFetch(refreshed.session.access_token);
    }
  }

  return res;
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
  const accessToken = await getFreshAccessToken();

  const form = new FormData();
  form.append("file", file);

  const doUpload = (token: string) =>
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/applicant/profile/cv`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });

  let res = await doUpload(accessToken);

  if (res.status === 401) {
    const { data: refreshed } = await supabase.auth.refreshSession();
    if (refreshed.session) {
      res = await doUpload(refreshed.session.access_token);
    }
  }

  return res;
};

export const scanApplicantCV = () =>
  authedFetch("/api/applicant/profile/cv/scan", { method: "POST" });

export { authedFetch };