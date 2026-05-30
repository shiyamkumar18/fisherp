import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// When run from /tmp/vite-workspace via start-dev.sh, VITE_ROOT points to
// the actual project frontend. Otherwise fall back to this file's directory.
const PROJECT_FRONTEND =
  process.env.VITE_ROOT || path.resolve(__dirname, ".");

// External node_modules — symlinked by start-dev.sh into /tmp/vite-workspace
const M = "/tmp/vite-workspace/node_modules";

// Unix socket path for Django backend (gunicorn)
const DJANGO_SOCK = "/home/odoo/.cache/django.sock";

/**
 * Proxy /api, /admin, /auth to Django via Unix socket.
 * Required because the container blocks inter-process TCP loopback.
 */
function djangoUnixSocketProxy() {
  return {
    name: "django-unix-socket-proxy",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const proxied =
          req.url.startsWith("/api") ||
          req.url.startsWith("/admin") ||
          req.url.startsWith("/auth") ||
          req.url.startsWith("/static/django");

        if (!proxied) return next();

        const options = {
          socketPath: DJANGO_SOCK,
          path: req.url,
          method: req.method,
          headers: { ...req.headers, host: "localhost" },
        };
        const proxyReq = http.request(options, (proxyRes) => {
          res.writeHead(proxyRes.statusCode, proxyRes.headers);
          proxyRes.pipe(res, { end: true });
        });
        proxyReq.on("error", (err) => {
          console.error("[proxy] Django socket error:", err.message);
          if (!res.headersSent) {
            res.writeHead(502, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                error: "Backend unavailable",
                detail: `Cannot connect to Django: ${err.message}`,
                hint: "Run: bash start-dev.sh",
              })
            );
          }
        });
        req.pipe(proxyReq, { end: true });
      });
    },
  };
}

export default defineConfig(({ mode }) => ({
  // root = project frontend so Vite serves source files correctly
  root: PROJECT_FRONTEND,

  // Write Vite's internal cache to /tmp — always writable
  cacheDir: "/tmp/vite-cache",

  plugins: [react(), djangoUnixSocketProxy()],

  resolve: {
    alias: {
      // @ alias → project src
      "@": path.resolve(PROJECT_FRONTEND, "src"),
      // Core React packages – map to directories to allow Node resolution
      "react": `${M}/react`,
      "react-dom": `${M}/react-dom`,
      "react-router-dom": `${M}/react-router-dom`,
      "axios": `${M}/axios`,
      "zustand": `${M}/zustand`,
      "framer-motion": `${M}/framer-motion`,
      "lucide-react": `${M}/lucide-react`,
      "clsx": `${M}/clsx`,
      "tailwind-merge": `${M}/tailwind-merge`,
      "class-variance-authority": `${M}/class-variance-authority`,
    },
    preserveSymlinks: true,
  },

  // Explicitly tell Vite to optimize these dependencies since they live in /tmp/vite-workspace
  optimizeDeps: {
    include: [
      "react",
      "react-dom/client",
      "react-router-dom",
      "cookie",
      "axios",
      "zustand",
      "framer-motion",
      "lucide-react",
      "clsx",
      "tailwind-merge",
      "class-variance-authority"
    ],
  },

  base: mode === "production" ? "/static/" : "/",

  build: {
    outDir: path.resolve(PROJECT_FRONTEND, "dist"),
    emptyOutDir: true,
  },

  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    watch: null,
  },
}));
