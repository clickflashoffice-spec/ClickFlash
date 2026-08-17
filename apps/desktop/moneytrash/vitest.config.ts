import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        globals: true,
        include: ['**/__tests__/**/*.{test,spec}.{ts,tsx}'],
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@clickflash/ai': path.resolve(__dirname, '../../../packages/ai/src'),
            '@clickflash/types': path.resolve(__dirname, '../../../packages/types/src'),
            '@clickflash/logger': path.resolve(__dirname, '../../../packages/logger/src'),
            '@clickflash/ui': path.resolve(__dirname, '../../../packages/ui/src'),
        },
    },
});
