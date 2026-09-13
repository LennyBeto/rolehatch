// frontend/theme/index.ts
import { extendTheme } from "@chakra-ui/react";

const theme = extendTheme({
  styles: { global: { body: { bg: "#F6F5F1", color: "#1F2A24" } } },
  colors: {
    brand: { 500: "#2F4F3F", 600: "#26402F", 700: "#1D3025" },
  },
  components: {
    Button: {
      baseStyle: { fontWeight: "600" },
      defaultProps: { colorScheme: "brand" },
    },
  },
});
export default theme;