// frontend/theme/index.ts
import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

const config = defineConfig({
  theme: {
    tokens: {
      colors: {
        brand: {
          50: { value: "#E8EDEA" },
          500: { value: "#2F4F3F" },
          600: { value: "#26402F" },
          700: { value: "#1D3025" },
        },
      },
    },
    semanticTokens: {
      colors: {
        background: { value: { base: "#F6F5F1", _dark: "#0f1210" } },
        surface: { value: { base: "#FFFFFF", _dark: "#1a1e1c" } },
        text: { value: { base: "#1F2A24", _dark: "#EDEDED" } },
        brand: {
          solid: { value: "{colors.brand.500}" },
          contrast: { value: "white" },
          fg: { value: { base: "{colors.brand.700}", _dark: "{colors.brand.50}" } },
          muted: { value: "{colors.brand.50}" },
        },
      },
    },
  },
});

const system = createSystem(defaultConfig, config);
export default system;