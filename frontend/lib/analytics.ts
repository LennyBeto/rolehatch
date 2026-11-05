const API = process.env.NEXT_PUBLIC_API_URL;

export type JobEventType = "view" | "apply_click";

/** Fire-and-forget. Never blocks navigation and never throws. */
export function trackJobEvent(jobId: string | number, type: JobEventType): void {
  try {
    fetch(`${API}/api/analytics/jobs/${jobId}/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* analytics must never break the app */
  }
}