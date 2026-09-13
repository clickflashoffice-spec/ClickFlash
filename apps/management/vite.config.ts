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
    port: 5175,
    strictPort: true,
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react/') || id.includes('react-dom/') || id.includes('react-router') || id.includes('scheduler/') || id.includes('use-sync-external-store')) return 'vendor-react';
            if (id.includes('recharts') || id.includes('@tremor/react')) return 'vendor-charts';
            if (id.includes('@radix-ui')) return 'vendor-radix';
            if (id.includes('lucide-react') || id.includes('@remixicon')) return 'vendor-icons';
            if (id.includes('@tanstack/react-table')) return 'vendor-table';
            if (id.includes('socket.io-client') || id.includes('zustand')) return 'vendor-state-net';
            if (id.includes('@clickflash/')) return 'vendor-internal';
            return 'vendor-core';
          }
        }
      }
    }
  }
});
