import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['**/__tests__/**/*.{ts,tsx}', '**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}', 'lib/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts'],
    },
    alias: {
      '@clickflash/ai-core': '../../../packages/ai-core/src/index.ts',
      '@/assets': './assets',
      '@': './src',
    },
  },
});
