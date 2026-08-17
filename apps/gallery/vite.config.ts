import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@clickflash/types': path.resolve(__dirname, '../../packages/types/src'),
      '@clickflash/ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@clickflash/logger': path.resolve(__dirname, '../../packages/logger/src'),
    },
  },
  server: {
    port: 5176,
    strictPort: true,
  },
});
