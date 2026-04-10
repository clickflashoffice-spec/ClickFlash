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
          "react-vendor": ["react", "react-dom"],
          "chart-vendor": ["chart.js", "react-chartjs-2"],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    // Ensure environment variables are properly replaced
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(
      process.env.npm_package_version || "4.1.0",
    ),
  },
}));
