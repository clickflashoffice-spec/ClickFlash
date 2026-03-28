/**
 * Ecosystem-Wide Jest Configuration
 * 
 * Runs tests across all ClickFlash apps
 */

module.exports = {
    // Projects for each app
    projects: [
        {
            displayName: 'Master',
            rootDir: '<rootDir>/apps/master',
            testMatch: ['**/__tests__/**/*.test.{ts,tsx}'],
            testEnvironment: 'jsdom',
            transform: {
                '^.+\\.(ts|tsx)$': 'ts-jest',
            },
            moduleNameMapper: {
                '^@/(.*)$': '<rootDir>/src/$1',
                '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
            },
            setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
        },
        {
            displayName: 'Management',
            rootDir: '<rootDir>/apps/management',
            testMatch: ['**/__tests__/**/*.test.{ts,tsx}'],
            testEnvironment: 'jsdom',
            transform: {
                '^.+\\.(ts|tsx)$': 'ts-jest',
            },
            moduleNameMapper: {
                '^@/(.*)$': '<rootDir>/src/$1',
                '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
            },
        },
        {
            displayName: 'Gallery',
            rootDir: '<rootDir>/apps/gallery',
            testMatch: ['**/__tests__/**/*.test.{ts,tsx}'],
            testEnvironment: 'jsdom',
            transform: {
                '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: { jsx: 'react-jsx' } }],
            },
            moduleNameMapper: {
                '^@/(.*)$': '<rootDir>/src/$1',
                '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
            },
        },
        {
            displayName: 'Touch',
            rootDir: '<rootDir>/apps/touch',
            testMatch: ['**/__tests__/**/*.test.{ts,tsx}'],
            testEnvironment: 'jsdom',
            transform: {
                '^.+\\.(ts|tsx)$': 'ts-jest',
            },
            moduleNameMapper: {
                '^@/(.*)$': '<rootDir>/src/$1',
                '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
            },
        },
        {
            displayName: 'MoneyTrash',
            rootDir: '<rootDir>/apps/moneytrash',
            testMatch: ['**/__tests__/**/*.test.{ts,tsx}'],
            testEnvironment: 'jsdom',
            transform: {
                '^.+\\.(ts|tsx)$': 'ts-jest',
            },
            moduleNameMapper: {
                '^@/(.*)$': '<rootDir>/src/$1',
                '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
            },
        },
    ],

    // Global coverage
    collectCoverageFrom: [
        'apps/*/src/**/*.{ts,tsx}',
        '!apps/*/src/**/*.d.ts',
        '!apps/*/src/**/__tests__/**',
        '!apps/*/src/**/__mocks__/**',
        '!apps/*/src/main.tsx',
        '!apps/*/src/setupTests.ts',
    ],

    coverageThreshold: {
        global: {
            branches: 60,
            functions: 60,
            lines: 60,
            statements: 60,
        },
    },

    // Reporter configuration
    reporters: ['default'],

    // Clear mocks between tests
    clearMocks: true,
    restoreMocks: true,
};
