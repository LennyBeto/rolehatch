// frontend/app/opengraph-image.tsx
import { ImageResponse } from "next/og";
import { colors } from "@/theme/colors";

export const alt = "PerchRole — verified tech jobs, straight from employers";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: colors.background,
          color: colors.text,
          borderLeft: `24px solid ${colors.brand[500]}`,
        }}
      >
        <div style={{ fontSize: 40, fontWeight: 700, color: colors.brand[500], marginBottom: 24 }}>
          PerchRole
        </div>
        <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.1, marginBottom: 28 }}>
          Verified tech jobs, straight from employers
        </div>
        <div style={{ fontSize: 34, color: colors.brand[600] }}>
          No reposts. No stale ads. Free for job seekers, always.
        </div>
      </div>
    ),
    { ...size }
  );
}