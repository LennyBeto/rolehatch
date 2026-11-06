// frontend/components/ApplyButton.tsx
"use client";
import type { MouseEvent } from "react";
import { Button } from "@chakra-ui/react";
import { trackJobEvent } from "@/lib/analytics";

type Props = { jobId: string; href: string; label: string };

/** Same look and behavior as before; also records an apply click for employer analytics. */
export default function ApplyButton({ jobId, href, label }: Props) {
  const track = () => trackJobEvent(jobId, "apply_click");
  // Middle-click opens a new tab without firing onClick; right-click should not count.
  const trackAux = (e: MouseEvent) => {
    if (e.button === 1) track();
  };

  return (
    <Button asChild colorPalette="brand" size="lg">
      <a href={href} target="_blank" rel="noopener noreferrer" onClick={track} onAuxClick={trackAux}>
        {label}
      </a>
    </Button>
  );
}