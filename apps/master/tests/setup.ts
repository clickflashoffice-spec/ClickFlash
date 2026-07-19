import '@testing-library/jest-dom';
import { db } from './mocks/database';
import { logger } from '@/utils/logger';

if (typeof setImmediate === 'undefined') {
  (global as any).setImmediate = (fn: Function, ...args: any[]) => setTimeout(fn, 0, ...args);
}
if (typeof clearImmediate === 'undefined') {
  (global as any).clearImmediate = (id: any) => clearTimeout(id);
}

let server: { listen: (opts: { onUnhandledRequest: string }) => void; resetHandlers: () => void; close: () => Promise<void> } | null = null;

const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  child: jest.fn().mockReturnThis(),
};

jest.mock('../src/utils/logger', () => ({
  __esModule: true,
  Logger: {
    getInstance: jest.fn(() => mockLogger),
  },
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    child: jest.fn().mockReturnThis(),
  },
  noopLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    child: jest.fn().mockReturnThis(),
  },
  createLogger: jest.fn(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    child: jest.fn().mockReturnThis(),
  })),
}));

beforeAll(async () => {
  if (typeof window === 'undefined') {
    const { server: mswServer } = await import('./mocks/server');
    server = mswServer as typeof server;
    server.listen({ onUnhandledRequest: 'warn' });
  }
});

afterEach(() => {
  if (server) {
    server.resetHandlers();
  }
  jest.clearAllMocks();
  db.reset();
});

afterAll(async () => {
  if (server) {
    await server.close();
  }
  await new Promise(resolve => setTimeout(resolve, 500));
});

global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

process.on('unhandledRejection', (reason) => {
  if (logger && logger.error) {
    logger.error('[Test] Unhandled Rejection:', reason);
  }
});
