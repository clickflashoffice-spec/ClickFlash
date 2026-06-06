/**
 * Jest Configuration for Gallery App
 * 
 * Configured for TypeScript React testing with Stripe.js mocks.
 */

module.exports = {
  // Use ts-jest for TypeScript files
  preset: 'ts-jest',
  
  // Browser-like environment for DOM testing
  testEnvironment: 'jsdom',
  
  // Root directories for tests
  roots: ['<rootDir>/src'],
  
  // Test file patterns - run all test files
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/__tests__/**/*.tsx',
    '**/?(*.)+(spec|test).ts',
    '**/?(*.)+(spec|test).tsx',
  ],

  // Ignore problematic directories
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/backend/',
    'test-utils\\.tsx?$',
  ],
  
  // Transform TypeScript files
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: 'jest.tsconfig.json',
      },
    ],
  },
  
  // Module name mapping for path aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': 
      '<rootDir>/src/__mocks__/fileMock.js',
    '^@/services/pb$': '<rootDir>/src/__mocks__/pbMock.js',
  },
  
  // Setup files to run after Jest is initialized
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.tsx'],
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/setupTests.tsx',
    '!src/main.tsx',
    '!src/**/__tests__/**',
    '!src/**/__mocks__/**',
  ],
  
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    // Payment-related code requires higher coverage
    'src/components/customer/PaymentForm.tsx': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    'src/services/stripeService.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/backend/',
    'test-utils\\.tsx?$',
  ],
  
  // Transform ignore patterns (ensure Stripe modules are transformed)
  transformIgnorePatterns: [
    'node_modules/(?!(@stripe|react-stripe-js)/)',
  ],
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true,
  
  // Verbose output for CI
  verbose: true,
  
  // Fail tests on console errors in CI
  errorOnDeprecated: true,
  
  // Globals
  globals: {
    'import.meta': {
      env: {
        DEV: true,
        PROD: false,
        VITE_API_URL: 'http://localhost:8092',
        VITE_STRIPE_PUBLISHABLE_KEY: 'pk_test_mock',
      },
    },
  },
};
