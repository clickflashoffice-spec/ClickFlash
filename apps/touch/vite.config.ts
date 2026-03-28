import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: '.',
  base: './',
  define: {
    // Map process.env to import.meta.env for browser compatibility
    'process.env': 'import.meta.env',
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
          'react-vendor': ['react', 'react-dom'],
          'react-window': ['react-window'],
        },
        // Optimize asset naming
        assetFileNames: 'assets/[name].[hash].[ext]',
        chunkFileNames: 'assets/[name].[hash].js',
        entryFileNames: 'assets/[name].[hash].js',
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
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
