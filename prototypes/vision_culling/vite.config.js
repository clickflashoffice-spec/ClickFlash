import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    open: true
  },
  optimizeDeps: {
    // Exclude tfjs-backend-wasm from optimization to prevent WASM loading issues
    exclude: ['@tensorflow/tfjs-backend-wasm', '@xenova/transformers']
  }
});
