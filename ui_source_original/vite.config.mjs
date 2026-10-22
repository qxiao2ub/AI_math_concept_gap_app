import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  build: {
    outDir: "dist/client",
  },
  preview: {
    proxy: { "/api": { target: "http://127.0.0.1:8001", changeOrigin: true } },
  },
  optimizeDeps: {
    include: ["react", "react-dom/client"],
  },
  server: {
    host: "127.0.0.1",
    proxy: { "/api": { target: "http://127.0.0.1:8001", changeOrigin: true } },
    allowedHosts: ["terminal.local"],
    warmup: {
      clientFiles: ["./src/main.jsx"],
    },
  },
  plugins: [react()],
});
