import type { Config } from 'jest';
import path from 'path';

const config: Config = {
  testEnvironment: 'jsdom',
  preset: 'ts-jest',
  testMatch: [
    '**/tests/unit/**/*.test.ts',
    '**/tests/unit/**/*.test.tsx',
    '**/src/**/*.test.ts',
    '**/src/**/*.test.tsx',
    '**/backend/**/*.test.ts',
    '**/backend/**/*.test.tsx',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    '^uuid$': '<rootDir>/__mocks__/uuid.ts',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          jsx: 'react-jsx',
          module: 'ESNext',
          moduleResolution: 'Node',
        },
      },
    ],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(lucide-react|framer-motion|uuid|@uuid)/)',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/main/**',
    '!src/**/types/**',
    '!src/**/__tests__/**',
    'backend/services/**',
    'backend/routes/**',
    'backend/shared/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    'src/services/': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    'src/utils/': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    'src/hooks/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    'backend/services/': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    'backend/shared/': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    'src/components/**/hooks/**': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  coverageDirectory: '<rootDir>/coverage/unit',
  coverageReporters: ['text', 'lcov', 'clover', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  globalSetup: '<rootDir>/tests/global-setup.ts',
  globalTeardown: '<rootDir>/tests/global-teardown.ts',
  testTimeout: 10000,
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/electron-new/',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  roots: ['<rootDir>'],
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,
};

export default config;
