// frontend/lib/trackEvent.ts
type ListingEvent = "view" | "apply_click";

export function trackListingEvent(jobId: string, type: ListingEvent) {
  try {
    if (type === "view") {
      const key = `perchrole:viewed:${jobId}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    }
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/analytics/jobs/${jobId}/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* tracking must never block the UI */
  }
}