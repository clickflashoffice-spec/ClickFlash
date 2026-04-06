import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    // Vite dev server runs on a different port than the backend
    // Backend (Express) runs on 8090, Vite runs on 5173 in dev
    port: 5173,
    host: true,
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
    sourcemap: false, // Disable for production builds
    minify: "esbuild",
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor libraries
          "vendor-react": ["react", "react-dom"],
          "vendor-router": ["react-router-dom"],
          "vendor-query": ["@tanstack/react-query"],
          "vendor-ui": ["lucide-react", "clsx", "tailwind-merge"],
          // Heavy chart libraries — split so they load only with chart components
          "vendor-apexcharts": ["apexcharts", "react-apexcharts"],
          "vendor-chartjs": ["chart.js", "react-chartjs-2"],
        },
        // Optimize asset naming
        assetFileNames: "assets/[name].[hash][extname]",
        chunkFileNames: "assets/[name].[hash].js",
        entryFileNames: "assets/[name].[hash].js",
      },
    },
    // Chunk size warning limit
    chunkSizeWarningLimit: 800,
  },
  esbuild: {
    drop: ["console", "debugger"], // Remove console.log in production
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
