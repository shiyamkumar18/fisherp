/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        border: "var(--border)",
        primary: "var(--primary)",
        primaryHover: "var(--primary-hover)",
        success: "var(--success)",
        danger: "var(--danger)",
        warning: "var(--warning)",
        info: "var(--info)",
        textPrimary: "var(--text-primary)",
        textSecondary: "var(--text-secondary)",
      },
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1.5" }],
        sm: ["0.875rem", { lineHeight: "1.5" }],
        base: ["1rem", { lineHeight: "1.75" }],
        lg: ["1.125rem", { lineHeight: "2" }],
        xl: ["1.25rem", { lineHeight: "2.25" }],
        "2xl": ["1.5rem", { lineHeight: "2.5" }],
        "3xl": ["1.875rem", { lineHeight: "2.75" }],
        "4xl": ["2.25rem", { lineHeight: "3" }],
      },
      spacing: {
        4: "1rem",
        6: "1.5rem",
        8: "2rem",
        12: "3rem",
      },
      borderRadius: {
        xl: "12px",
      },
      boxShadow: {
        sm: "0 1px 2px rgba(16,30,54,0.04)",
        DEFAULT: "0 2px 8px rgba(16,30,54,0.08)",
        md: "0 10px 24px rgba(15, 23, 42, 0.08)",
        lg: "0 16px 32px rgba(16,30,54,0.12)",
      },
      fontFamily: {
        sans: ["Manrope", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};