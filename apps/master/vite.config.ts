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
          "vendor-react": ["react", "react-dom"],
          "vendor-router": ["react-router-dom"],
          "vendor-query": ["@tanstack/react-query"],
          "vendor-ui": ["lucide-react", "clsx", "tailwind-merge"],
          "vendor-apexcharts": ["apexcharts", "react-apexcharts"],
          "vendor-chartjs": ["chart.js", "react-chartjs-2"],
        },
        assetFileNames: "assets/[name].[hash][extname]",
        chunkFileNames: "assets/[name].[hash].js",
        entryFileNames: "assets/[name].[hash].js",
      },
    },
    chunkSizeWarningLimit: 800,
  },
  esbuild: {
    drop: mode === "production" ? ["console", "debugger"] : [],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
