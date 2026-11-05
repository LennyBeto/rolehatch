// frontend/components/JobViewTracker.tsx
"use client";
import { useEffect } from "react";
import { trackJobEvent } from "@/lib/analytics";

/** Renders nothing. Records one view per session when a job page loads. */
export default function JobViewTracker({ jobId }: { jobId: string }) {
  useEffect(() => {
    try {
      const key = `perchrole:viewed:${jobId}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // Storage blocked (private mode): still count the view
    }
    trackJobEvent(jobId, "view");
  }, [jobId]);

  return null;
}