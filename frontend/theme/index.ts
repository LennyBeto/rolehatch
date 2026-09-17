// frontend/theme/index.ts
import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

const config = defineConfig({
  globalCss: {
    body: { bg: "#F6F5F1", color: "#1F2A24" },
  },
  theme: {
    tokens: {
      colors: {
        brand: {
          50: { value: "#E8EDEA" },
          500: { value: "#2F4F3F" },
          600: { value: "#26402F" },
          700: { value: "#1D3025" },
        },
        background: { value: "#F6F5F1" },
        surface: { value: "#FFFFFF" },
      },
    },
    semanticTokens: {
      colors: {
        brand: {
          solid: { value: "{colors.brand.500}" },
          contrast: { value: "white" },
          fg: { value: "{colors.brand.700}" },
          muted: { value: "{colors.brand.50}" },
        },
      },
    },
  },
});

const system = createSystem(defaultConfig, config);
export default system;