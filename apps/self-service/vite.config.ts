import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@clickflash/types': path.resolve(__dirname, '../../packages/types/src'),
      '@clickflash/ui': path.resolve(__dirname, '../../packages/ui/src')
    },
  },
  server: {
    port: 5177,
    strictPort: true,
  },
  build: {
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react/') || id.includes('react-dom/') || id.includes('react-router') || id.includes('scheduler/') || id.includes('use-sync-external-store')) return 'vendor-react';
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('@clickflash/')) return 'vendor-internal';
            return 'vendor-core';
          }
        }
      }
    }
  }
});
