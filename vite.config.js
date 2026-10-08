import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(root, "src") },
  },
  server: {
    port: 5173,
    open: true,
    allowedHosts: true,
    // The browser only ever talks to this server; /api goes on to the
    // backend. That keeps the app same-origin, so it also works through
    // a tunnel (ngrok) where "localhost:4000" would mean the visitor's
    // own computer.
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        rewrite: (p) => p.replace(/^\/api/, ""),
      },
    },
  },
});
