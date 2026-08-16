import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/vitest.setup.ts'],
    fileParallelism: false,
    testTimeout: 10000,
    hookTimeout: 10000,
    include: [
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
    ],
    exclude: [
      'node_modules/**',
      'dist/**',
      'release/**',
      'e2e/**',
    ],
    coverage: {
      provider: 'v8',
      clean: false,
      reporter: ['text', 'json', 'html'],
      thresholds: {
        branches: 40,
        functions: 50,
        lines: 50,
        statements: 48,
      },
    },
    restoreMocks: true,
    clearMocks: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname ?? path.resolve(), './src'),
    },
  },
  define: {
    'import.meta.env.DEV': JSON.stringify(true),
    'import.meta.env.PROD': JSON.stringify(false),
    'import.meta.env.MODE': JSON.stringify('test'),
  },
});
