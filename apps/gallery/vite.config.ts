import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: "/gallery/",
  plugins: [react()],
  server: {
    port: 5176, // Unified port
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://localhost:8090",
        changeOrigin: true,
      },
      "/uploads": {
        target: "http://localhost:8090",
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 5176,
    host: true,
    strictPort: true,
  },
  esbuild: {
    drop: mode === "production" ? ["console", "debugger"] : [],
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: mode === "development",
    minify: mode === "production",
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React runtime — loaded on every page
          "react-vendor": ["react", "react-dom"],
          // Data fetching — shared across all query-driven pages
          "query-vendor": ["@tanstack/react-query"],
          // Virtualisation — only needed on photo grids
          "virtual-vendor": ["@tanstack/react-virtual", "react-window"],
          // Charts — loaded only on analytics pages
          "chart-vendor": ["chart.js", "react-chartjs-2", "recharts"],
          // Stripe — payment flow only; loaded last
          "stripe-vendor": ["@stripe/stripe-js", "@stripe/react-stripe-js"],
        },
      },
    },
    // Lower warning threshold now that chunks are isolated
    chunkSizeWarningLimit: 600,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    // Inject the gallery app's package.json version at build time so the
    // Sentry release string in main.tsx resolves correctly.
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(
      process.env.npm_package_version || "unknown",
    ),
  },
}));
