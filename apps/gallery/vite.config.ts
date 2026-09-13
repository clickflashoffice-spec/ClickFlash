import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@clickflash/types': path.resolve(__dirname, '../../packages/types/src'),
      '@clickflash/ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@clickflash/logger': path.resolve(__dirname, '../../packages/logger/src/browser.ts'),
    },
  },
  define: {
    'process.env': {},
  },
  server: {
    port: 5176,
    strictPort: true,
  },
  build: {
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react/') || id.includes('react-dom/') || id.includes('scheduler/') || id.includes('use-sync-external-store')) return 'vendor-react';
            if (id.includes('framer-motion')) return 'vendor-framer';
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('react-i18next') || id.includes('i18next')) return 'vendor-i18n';
            if (id.includes('three') || id.includes('@react-three')) return 'vendor-three';
            if (id.includes('@clickflash/')) return 'vendor-internal';
            return 'vendor-core';
          }
        }
      }
    }
  }
});
