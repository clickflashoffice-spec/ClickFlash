/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/apps'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'apps/*/backend/**/*.ts',
    'apps/*/src/**/*.ts',
    '!apps/*/node_modules/**',
    '!apps/*/dist/**',
    '!apps/*/build/**',
  ],
  coverageDirectory: 'test-results/coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/apps/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/test-suite/setup.ts'],
  testTimeout: 30000,
  verbose: true,
};