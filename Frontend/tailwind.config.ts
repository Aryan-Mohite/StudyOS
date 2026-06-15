import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#4650E0",
          50:  "#EEF0FF",
          100: "#DDE0FF",
          200: "#C7CBF8",
          300: "#A5ACEF",
          400: "#7880E8",
          500: "#4650E0",
          600: "#3840CC",
          700: "#2A30A8",
          800: "#1E2282",
          900: "#131660",
        },
        surface: "#FFFFFF",
        page:    "#F3F4FB",
        border:  "#DDE0F2",
      },
      fontFamily: {
        sans:    ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-space-grotesk)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "0.625rem",
        md: "0.5rem",
        sm: "0.375rem",
      },
    },
  },
  plugins: [],
};

export default config;
