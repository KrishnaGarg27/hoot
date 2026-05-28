import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        bg2: "var(--bg2)",
        card: "var(--card)",
        ink: "var(--ink)",
        btn: "var(--btn)",
        "btn-ink": "var(--btn-ink)",
        "accent-yellow": "var(--accent-yellow)",
        "accent-pink": "var(--accent-pink)",
        "accent-mint": "var(--accent-mint)",
        "accent-pink-soft": "var(--accent-pink-soft)",
        "accent-mint-soft": "var(--accent-mint-soft)",
        "accent-yellow-soft": "var(--accent-yellow-soft)",
        "stage-bg": "var(--stage-bg)",
      },
      fontFamily: {
        fredoka: ["var(--font-fredoka)", "system-ui", "sans-serif"],
        nunito: ["var(--font-nunito)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
