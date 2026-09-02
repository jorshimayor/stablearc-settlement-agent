import type { Config } from "tailwindcss";

// Self-contained StableArc design tokens (no external theme dependency).
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#f6f8f7",
        emerald: "#0e9f6e",
        deepink: "#0b1f17",
        muted: "#5b6b66",
        gold: "#c79a2b",
      },
      borderRadius: {
        field: "0.75rem",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(11, 31, 23, 0.04), 0 8px 24px rgba(11, 31, 23, 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
