// frontend/theme/index.ts
import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

const config = defineConfig({
  theme: {
    tokens: {
      colors: {
        // Forest green ramp. 50/500/600/700 are the original brand values.
        brand: {
          50: { value: "#E8EDEA" },
          100: { value: "#D6E4DB" },
          200: { value: "#BCD6C6" },
          300: { value: "#9CC5AE" },
          400: { value: "#6E9C84" },
          500: { value: "#2F4F3F" },
          600: { value: "#26402F" },
          700: { value: "#1D3025" },
          800: { value: "#15231B" },
          900: { value: "#0D1711" },
        },
      },
      fonts: {
        heading: { value: "var(--font-display), var(--font-geist-sans), system-ui, sans-serif" },
        body: { value: "var(--font-geist-sans), system-ui, -apple-system, 'Segoe UI', sans-serif" },
      },
    },
    semanticTokens: {
      colors: {
        background: { value: { base: "#F6F5F1", _dark: "#0f1210" } },
        surface: { value: { base: "#FFFFFF", _dark: "#1a1e1c" } },
        text: { value: { base: "#1F2A24", _dark: "#EDEDED" } },
        // Hairline border color: warm gray in light, soft white hairline in dark
        line: { value: { base: "#E5E3DD", _dark: "rgba(255, 255, 255, 0.09)" } },
        brand: {
          solid: { value: "{colors.brand.500}" },
          contrast: { value: "white" },
          fg: { value: { base: "{colors.brand.700}", _dark: "{colors.brand.50}" } },
          // Was brand.50 in both modes, which made fg text invisible on it in dark
          muted: { value: { base: "{colors.brand.50}", _dark: "rgba(156, 197, 174, 0.16)" } },
          subtle: { value: { base: "{colors.brand.50}", _dark: "rgba(156, 197, 174, 0.12)" } },
          emphasized: { value: { base: "{colors.brand.100}", _dark: "rgba(156, 197, 174, 0.24)" } },
          border: { value: { base: "{colors.brand.200}", _dark: "rgba(156, 197, 174, 0.32)" } },
          focusRing: { value: { base: "{colors.brand.500}", _dark: "{colors.brand.300}" } },
        },
      },
    },
    recipes: {
      // Visible hover / pressed feedback on every button variant, driven by palette tokens
      button: {
        base: {
          transition: "background-color 0.15s ease, border-color 0.15s ease, filter 0.15s ease",
          _motionReduce: { transition: "none" },
        },
        variants: {
          variant: {
            // Solid: keep the full colour, then deepen it (lighten in dark mode)
            solid: {
              _hover: {
                bg: "colorPalette.solid",
                filter: "brightness(0.88)",
                _dark: { filter: "brightness(1.25)" },
              },
              _active: {
                bg: "colorPalette.solid",
                filter: "brightness(0.78)",
                _dark: { filter: "brightness(1.4)" },
              },
            },
            // Outline: clear tint fill and a stronger border
            outline: {
              _hover: { bg: "colorPalette.emphasized", borderColor: "colorPalette.solid" },
              _active: { bg: "colorPalette.emphasized", borderColor: "colorPalette.solid" },
            },
            // Ghost: tint fill on hover
            ghost: {
              _hover: { bg: "colorPalette.emphasized" },
              _active: { bg: "colorPalette.emphasized" },
            },
          },
        },
      },
    },
  },
  globalCss: {
    "h1, h2, h3": { letterSpacing: "-0.02em" },
  },
});

const system = createSystem(defaultConfig, config);
export default system;