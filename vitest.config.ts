import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\/(.*)/, replacement: path.resolve(__dirname, 'apps/desktop/touch/src/$1') },
      { find: /^@clickflash\/ai-core$/, replacement: path.resolve(__dirname, 'packages/ai-core/src/index.ts') },
      { find: /^@clickflash\/([^\/]+)$/, replacement: path.resolve(__dirname, 'packages/$1/src/index.ts') },
    ],
  },
  test: {
    globals: true,
    testTimeout: 30000,
    hookTimeout: 30000,
    environmentMatchGlobs: [
      ['apps/desktop/touch/**', 'jsdom'],
      ['apps/desktop/moneytrash/**', 'jsdom'],
      ['apps/desktop/installer/**', 'jsdom'],
      ['packages/**', 'node'],
      ['apps/backend/**', 'node'],
    ],
    include: [
      'packages/**/*.test.{ts,tsx,mjs,js}',
      'apps/desktop/touch/**/*.test.{ts,tsx,mjs,js}',
      'apps/desktop/installer/**/*.test.{ts,tsx,mjs,js}',
      'apps/desktop/moneytrash/**/*.test.{ts,tsx,mjs,js}',
      'apps/backend/cloud-backend/**/*.test.{ts,tsx,mjs,js}',
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/*.spec.ts',
      '**/e2e/**',
      '**/test-suite/**',
      '**/archive/**',
      'docs/archive/**',
    ],
  },
});
