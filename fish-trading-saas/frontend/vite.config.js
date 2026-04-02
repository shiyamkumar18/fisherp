import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // In production builds, assets are served under /static/ by Django.
  base: mode === "production" ? "/static/" : "/",
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    // Proxy API calls to the Django backend during development.
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
}));
