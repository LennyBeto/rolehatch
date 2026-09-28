// frontend/lib/api.ts
import { supabase } from "./supabaseClient";

const TOKEN_REFRESH_MARGIN_SECONDS = 60;

let refreshPromise: ReturnType<typeof supabase.auth.refreshSession> | null = null;
function refreshSessionOnce() {
  if (!refreshPromise) {
    refreshPromise = supabase.auth.refreshSession().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function getFreshAccessToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not signed in");

  const expiresAt = session.expires_at ?? 0;
  const nowSeconds = Math.floor(Date.now() / 1000);
  const isStale = expiresAt - nowSeconds < TOKEN_REFRESH_MARGIN_SECONDS;

  if (!isStale) return session.access_token;

  const { data: refreshed, error } = await refreshSessionOnce();
  if (error || !refreshed.session) {
    return session.access_token;
  }
  return refreshed.session.access_token;
}

async function withFreshTokenRetry(doRequest: (token: string) => Promise<Response>): Promise<Response> {
  const token = await getFreshAccessToken();
  let res = await doRequest(token);

  if (res.status === 401) {
    const { data: refreshed } = await refreshSessionOnce();
    if (refreshed.session) {
      res = await doRequest(refreshed.session.access_token);
    }
  }

  return res;
}

async function authedFetch(path: string, options: RequestInit = {}) {
  return withFreshTokenRetry((token) =>
    fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })
  );
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
  is_public: boolean;
  cv_filename: string | null;
  last_ats_score: number | null;
  has_match_score: boolean;
};

export const getApplicantProfile = () => authedFetch("/api/applicant/profile");

export const getMyApplications = () => authedFetch("/api/saved-jobs/applications");

export const updateApplicantProfile = (payload: {
  full_name?: string;
  expertise?: string;
  avatar_id?: string;
  is_public?: boolean;
}) => authedFetch("/api/applicant/profile", { method: "PUT", body: JSON.stringify(payload) });

export const uploadApplicantCV = async (file: File) => {
  const form = new FormData();
  form.append("file", file);

  return withFreshTokenRetry((token) =>
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/applicant/profile/cv`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    })
  );
};

export const scanApplicantCV = () =>
  authedFetch("/api/applicant/profile/cv/scan", { method: "POST" });

export { authedFetch };