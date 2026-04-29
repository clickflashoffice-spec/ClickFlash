import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: '/',
  plugins: [react()],
  server: {
    port: parseInt(process.env.PORT || "5173"),
    host: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8090",
        changeOrigin: true,
      },
      "/ws": {
        target: "ws://127.0.0.1:8090",
        ws: true,
      },
    },
  },
  preview: {
    port: 5174,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8090",
        changeOrigin: true,
      },
      "/ws": {
        target: "ws://127.0.0.1:8090",
        ws: true,
      },
    },
  },
  build: {
    outDir: "dist/master",
    emptyOutDir: true,
    sourcemap: false,
    minify: "esbuild",
    // Bundle UI components into the app - NO external symlinks
    // packages/ui source is copied during build:backend via copy-assets.ts
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React runtime — every page
          "vendor-react": ["react", "react-dom"],
          "vendor-router": ["react-router-dom"],
          "vendor-query": ["@tanstack/react-query"],
          "vendor-ui": ["lucide-react", "clsx", "tailwind-merge"],
          // Charts — only analytics/dashboard pages
          "vendor-apexcharts": ["apexcharts", "react-apexcharts"],
          "vendor-chartjs": ["chart.js", "react-chartjs-2"],
          // Animation — framer-motion is large, load lazily
          "vendor-motion": ["framer-motion"],
          // ML / face detection — ~2MB, only loaded on face-capture screens
          // NOTE: these are loaded lazily; splitting ensures they don't block initial paint
          "vendor-tensorflow": [
            "@tensorflow/tfjs",
            "@tensorflow/tfjs-backend-cpu",
            "@tensorflow/tfjs-core",
            "@tensorflow-models/blazeface",
          ],
          "vendor-face-api": ["@vladmandic/face-api"],
          // Offline-first DB
          "vendor-db": ["dexie"],
          // Virtualisation
          "vendor-virtual": ["react-window", "react-virtuoso", "react-virtualized-auto-sizer"],
        },
        assetFileNames: "assets/[name].[hash][extname]",
        chunkFileNames: "assets/[name].[hash].js",
        entryFileNames: "assets/[name].[hash].js",
      },
    },
    chunkSizeWarningLimit: 600,
  },
  esbuild: {
    drop: mode === "production" ? ["console", "debugger"] : [],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    // Inject the master app's package.json version at build time so the
    // Sentry release string in main.tsx + sentryService.ts resolves correctly.
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(
      process.env.npm_package_version || "unknown",
    ),
  },
}));
