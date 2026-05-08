import type { Config } from 'jest';
import path from 'path';

const config: Config = {
  testEnvironment: 'node',
  preset: 'ts-jest',
  testMatch: ['**/tests/integration/**/*.spec.ts', '**/tests/integration/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    '^@backend/(.*)$': '<rootDir>/backend/$1',
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
  collectCoverageFrom: [
    'backend/**/*.ts',
    '!backend/**/*.d.ts',
    '!backend/**/index.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  coverageDirectory: '<rootDir>/test-results/integration/coverage',
  coverageReporters: ['text', 'lcov', 'clover', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup-integration.ts'],
  testTimeout: 30000,
  verbose: true,
  forceExit: true,
  detectOpenHandles: true,
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/electron-new/',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  roots: ['<rootDir>'],
  clearMocks: true,
  restoreMocks: true,
};

export default config;
