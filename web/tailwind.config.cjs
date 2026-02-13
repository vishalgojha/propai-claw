/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        base: "rgb(var(--base) / <alpha-value>)",
        panel: "rgb(var(--panel) / <alpha-value>)",
        panelStrong: "rgb(var(--panel-strong) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        text: "rgb(var(--text) / <alpha-value>)",
        textMuted: "rgb(var(--text-muted) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        accentStrong: "rgb(var(--accent-strong) / <alpha-value>)",
        good: "rgb(var(--good) / <alpha-value>)",
        warn: "rgb(var(--warn) / <alpha-value>)",
        bad: "rgb(var(--bad) / <alpha-value>)"
      },
      fontFamily: {
        display: ["\"Space Grotesk\"", "sans-serif"],
        mono: ["\"IBM Plex Mono\"", "monospace"]
      },
      boxShadow: {
        card: "0 16px 40px rgba(0, 0, 0, 0.25)"
      },
      keyframes: {
        rise: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        glow: {
          "0%": { opacity: "0.2" },
          "100%": { opacity: "0.55" }
        }
      },
      animation: {
        rise: "rise 0.5s ease-out forwards",
        glow: "glow 2.8s ease-in-out infinite alternate"
      }
    }
  },
  plugins: []
};
