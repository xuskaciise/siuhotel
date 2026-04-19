import type { Config } from "tailwindcss";

/**
 * SIU Lumina — tokens align with `DESIGN_SYSTEM_SPEC.md`.
 * Tailwind v4 merges this file via `@config` in `src/app/globals.css`.
 */
const config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        lumina: {
          navy: "#131B2E",
          cyan: "#00CCFF",
          "cyan-core": "#006782",
          surface: "#FAF8FF",
          "surface-muted": "#EEF1FA",
          gold: "#D4AF37",
          "on-surface": "#131B2E",
        },
      },
      fontFamily: {
        display: [
          "var(--font-display)",
          "var(--font-geist-sans)",
          "system-ui",
          "sans-serif",
        ],
        body: ["var(--font-body)", "var(--font-geist-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        /** Light mode: minimal depth */
        "elevation-soft":
          "0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.06)",
        "elevation-soft-md": "0 2px 8px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)",
        "sidebar-light": "1px 0 0 rgb(229 231 235)",
        "elevation-1": "0px 4px 20px rgba(19, 27, 46, 0.04)",
        "elevation-2": "0px 10px 40px rgba(19, 27, 46, 0.08)",
        glass: "0px 12px 48px rgba(19, 27, 46, 0.12)",
      },
      backgroundImage: {
        "gradient-primary": "linear-gradient(135deg, #006782 0%, #00CCFF 100%)",
        "nav-active": "linear-gradient(90deg, #00CCFF 0%, rgba(0, 204, 255, 0.08) 100%)",
      },
    },
  },
} satisfies Config;

export default config;
