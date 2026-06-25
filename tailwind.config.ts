import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: "#1D4E89",
        "brand-dark": "#163A66",
        accent: "#2E7D5B",
        alert: "#C77700",
        danger: "#B23A3A",
        ink: "#1A2230",
        surface: "#F7F9FC",
        band: "#EEF3F9",
        score: {
          secure: "#2E7D5B",
          mostlySecure: "#4F9E6A",
          atRisk: "#C77700",
          vulnerable: "#B23A3A",
        },
        good: "#2E7D5B",
        warn: "#C77700",
        bad: "#B23A3A",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-source-serif)", "ui-serif", "Georgia", "serif"],
      },
      maxWidth: {
        container: "1280px",
        wide: "1536px",
      },
    },
  },
  plugins: [],
};
export default config;
