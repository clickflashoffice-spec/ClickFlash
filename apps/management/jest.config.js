/**
 * Jest Configuration for Management App
 * 
 * Configures Jest for testing React components with TypeScript.
 */

/** @type {import('jest').Config} */
module.exports = {
    // Use jsdom environment for DOM testing
    testEnvironment: 'jsdom',
    
    // Root directories for test discovery
    roots: ['<rootDir>/src'],
    
    // Test file patterns
    testMatch: [
        '**/__tests__/**/*.test.{ts,tsx}',
        '**/?(*.)+(spec|test).{ts,tsx}'
    ],
    
    // Module file extensions
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
    
    // Transform TypeScript files
    transform: {
        '^.+\\.(ts|tsx)$': 'ts-jest',
    },
    
    // Module name mapper for path aliases
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    },
    
    // Setup files
    setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
    
    // Coverage configuration
    collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.d.ts',
        '!src/main.tsx',
        '!src/setupTests.ts',
        '!src/**/__tests__/**',
    ],
    
    coverageThreshold: {
        global: {
            branches: 50,
            functions: 50,
            lines: 50,
            statements: 50,
        },
    },
    
    // Ignore patterns
    testPathIgnorePatterns: [
        '/node_modules/',
        '/dist/',
        '/backend/',
    ],
    
    // Clear mocks between tests
    clearMocks: true,
    
    // Restore mocks after each test
    restoreMocks: true,
    
    // Verbose output
    verbose: true,
};
