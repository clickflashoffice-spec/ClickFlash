import type { Config } from 'jest';

const config: Config = {
  // Split tests into two projects:
  // - frontend: jsdom environment for React components
  // - backend: node environment for Express/Node APIs (uses setInterval().unref())
  projects: [
    {
      displayName: 'frontend',
      testEnvironment: 'jsdom',
      preset: 'ts-jest',
      testMatch: [
        '**/tests/unit/**/*.test.ts',
        '**/tests/unit/**/*.test.tsx',
        '**/src/**/*.test.ts',
        '**/src/**/*.test.tsx',
      ],
      moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@components/(.*)$': '<rootDir>/src/components/$1',
        '^@services/(.*)$': '<rootDir>/src/services/$1',
        '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
        '^@utils/(.*)$': '<rootDir>/src/utils/$1',
        '^@types/(.*)$': '<rootDir>/src/types/$1',
        '^@clickflash/(.*)$': '<rootDir>/../../packages/$1/src/index.ts',
        '^uuid$': '<rootDir>/__mocks__/uuid.ts',
      },
      transform: {
        '^.+\\.[tj]sx?$': [
          'ts-jest',
          {
            tsconfig: {
              jsx: 'react-jsx',
              module: 'CommonJS',
              esModuleInterop: true,
            },
            astTransformers: {
              before: [
                {
                  path: 'ts-jest-mock-import-meta',
                  options: { metaObjectReplacement: { url: 'file:///C:/Users/alamo/Desktop/ClickFlash/apps/master/mock-import-meta-url.js' } }
                }
              ]
            }
          },
        ],
      },
      transformIgnorePatterns: [
        'node_modules/(?!(lucide-react|framer-motion|uuid|@uuid|@clickflash)/)',
      ],
      testPathIgnorePatterns: [
        '/node_modules/',
        '/dist/',
        '/release/',
        '/release_mao/',
        '/release_mac/',
        '/release_cgp/',
      ],
      setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
    },
    {
      displayName: 'backend',
      testEnvironment: 'node',
      preset: 'ts-jest',
      testMatch: [
        '**/backend/**/*.test.ts',
        '**/backend/**/*.test.tsx',
      ],
      moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@services/(.*)$': '<rootDir>/src/services/$1',
        '^@utils/(.*)$': '<rootDir>/src/utils/$1',
        '^@clickflash/(.*)$': '<rootDir>/../../packages/$1/src/index.ts',
        '^uuid$': '<rootDir>/__mocks__/uuid.ts',
      },
      transform: {
        '^.+\\.[tj]sx?$': [
          'ts-jest',
          {
            tsconfig: {
              module: 'CommonJS',
              esModuleInterop: true,
            },
            astTransformers: {
              before: [
                {
                  path: 'ts-jest-mock-import-meta',
                  options: { metaObjectReplacement: { url: 'file:///C:/Users/alamo/Desktop/ClickFlash/apps/master/mock-import-meta-url.js' } }
                }
              ]
            }
          },
        ],
      },
      transformIgnorePatterns: [
        'node_modules/(?!(lucide-react|framer-motion|uuid|@uuid|@clickflash)/)',
      ],
      testPathIgnorePatterns: [
        '/node_modules/',
        '/dist/',
        '/release/',
        '/release_mao/',
        '/release_mac/',
        '/release_cgp/',
      ],
    },
  ],
  // Global settings (apply to all projects)
  testTimeout: 10000,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/main/**',
    '!src/**/types/**',
    '!src/**/__tests__/**',
    '!src/components/albums/editor2/**',
    'backend/services/**',
    'backend/routes/**',
    'backend/shared/**',
  ],
  coverageThreshold: {
    global: {
      branches: 2,
      functions: 2,
      lines: 2,
      statements: 2,
    },
    'src/services/': {
      branches: 5,
      functions: 5,
      lines: 5,
      statements: 5,
    },
    'src/utils/': {
      branches: 2,
      functions: 2,
      lines: 2,
      statements: 2,
    },
    'src/hooks/': {
      branches: 2,
      functions: 2,
      lines: 2,
      statements: 2,
    },
    'backend/services/': {
      branches: 15,
      functions: 15,
      lines: 15,
      statements: 15,
    },
    'backend/shared/': {
      branches: 40,
      functions: 40,
      lines: 40,
      statements: 40,
    },
    'src/components/**/hooks/**': {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
  },
  coverageDirectory: '<rootDir>/coverage/unit',
  coverageReporters: ['text', 'lcov', 'clover', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  globalSetup: '<rootDir>/tests/global-setup.ts',
  globalTeardown: '<rootDir>/tests/global-teardown.ts',
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/release/',
    '/release_mao/',
    '/release_mac/',
    '/release_cgp/',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  roots: ['<rootDir>'],
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,
};

export default config;
