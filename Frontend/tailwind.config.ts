import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    screens: {
      xs: "420px",
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
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
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        page:    "rgb(var(--color-page) / <alpha-value>)",
        muted:   "rgb(var(--color-muted) / <alpha-value>)",
        border:  "rgb(var(--color-border) / <alpha-value>)",
        ink: {
          DEFAULT: "rgb(var(--color-ink) / <alpha-value>)",
          2: "rgb(var(--color-ink-2) / <alpha-value>)",
          3: "rgb(var(--color-ink-3) / <alpha-value>)",
        },
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
