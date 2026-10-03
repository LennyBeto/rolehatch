// frontend/next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets the phone (LAN IP) load dev JS/HMR assets so React hydrates.
  // Without this, buttons, the theme toggle and menus stay dead on mobile.
  // Dev-only: ignored by `next build` / `next start`.
  allowedDevOrigins: ["192.168.1.4"],
};

export default nextConfig;