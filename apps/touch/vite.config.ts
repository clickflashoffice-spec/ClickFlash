import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: '.',
  base: '/',
  define: {
    // Map process.env to import.meta.env for browser compatibility
    'process.env': 'import.meta.env',
    // Inject the touch app's package.json version at build time so the
    // Sentry release string in main.tsx resolves correctly.
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(
      process.env.npm_package_version || 'unknown',
    ),
  },
  esbuild: {
    drop: ['console', 'debugger'], // Rule 09: Binary Stripping
  },
  optimizeDeps: {
    include: ['react-window'],
  },
  build: {
    outDir: 'dist/touch',
    emptyOutDir: true,
    // Optimize build output
    minify: 'esbuild',
    sourcemap: false, // Disable sourcemaps in production for smaller builds
    rollupOptions: {
      output: {
        // Optimize chunk splitting
        manualChunks: {
          // Core React runtime
          'react-vendor': ['react', 'react-dom'],
          // Data fetching layer
          'query-vendor': ['@tanstack/react-query'],
          // Virtualisation (photo grid)
          'virtual-vendor': ['react-window'],
          // Offline-first DB (Dexie IDB)
          'db-vendor': ['dexie'],
          'face-api-vendor': ['@vladmandic/face-api'],
        },
        // Optimize asset naming
        assetFileNames: 'assets/[name].[hash].[ext]',
        chunkFileNames: 'assets/[name].[hash].js',
        entryFileNames: 'assets/[name].[hash].js',
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 600,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@clickflash/ui': path.resolve(__dirname, '../../packages/ui/src'),
    },
  },
  server: {
    port: 5174,
    strictPort: true,
    host: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8091',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
