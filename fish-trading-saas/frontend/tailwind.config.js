/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#2563EB",
        secondary: "#06B6D4",
        background: "#F8FAFC",
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
      fontFamily: {
        sans: ["Manrope", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
