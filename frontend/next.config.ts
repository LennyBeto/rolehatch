// frontend/next.config.ts
import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8081";

const nextConfig: NextConfig = {
  // Dev-only: lets any device on a home LAN load dev assets so React hydrates.
  // Wildcards mean a changed DHCP address no longer breaks mobile testing.
  allowedDevOrigins: ["192.168.*.*", "10.0.*.*"],

  // Dev-only: proxy /api/* to FastAPI so the phone never needs the PC's IP
  // for the backend. Production is untouched (it uses NEXT_PUBLIC_API_URL).
  async rewrites() {
    if (!isDev) return [];
    return [{ source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` }];
  },
};

export default nextConfig;