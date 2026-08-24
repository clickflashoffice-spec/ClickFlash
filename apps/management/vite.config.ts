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
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-charts': ['recharts', '@tremor/react'],
          'vendor-radix': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-slot',
            '@radix-ui/react-tabs'
          ],
          'vendor-icons': ['lucide-react', '@remixicon/react'],
          'vendor-table': ['@tanstack/react-table'],
          'vendor-socket': ['socket.io-client', 'zustand']
        }
      }
    }
  }
});
