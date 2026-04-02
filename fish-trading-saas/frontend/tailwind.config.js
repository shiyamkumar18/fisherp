import tailwindcssAnimate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#2563EB",
        secondary: "#06B6D4",
        background: "#F1F5F9",
        surface: "#FFFFFF",
        text: "#0F172A",
        muted: "#64748B",
      },
      borderRadius: {
        xl: "0.75rem",
      },
      boxShadow: {
        md: "0 10px 24px rgba(15, 23, 42, 0.08)",
      },
      spacing: {
        18: "4.5rem",
        22: "5.5rem",
        26: "6.5rem",
      },
      fontFamily: {
        sans: ["Manrope", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [tailwindcssAnimate],
};
