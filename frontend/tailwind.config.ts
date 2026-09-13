// frontend/tailwind.config.ts
import type { Config } from "tailwindcss";
export default {
  content: ["./app/**/*.{ts,tsx}"],
  // important: false + Chakra's CSS reset can conflict — test both together early
  theme: {
    extend: {
      colors: { background: "#F6F5F1", brand: { DEFAULT: "#2F4F3F" } },
    },
  },
} satisfies Config;