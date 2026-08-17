import { vi } from 'vitest';
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
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  child: vi.fn().mockReturnThis(),
};

vi.mock('../src/utils/logger', () => ({
  __esModule: true,
  Logger: {
    getInstance: vi.fn(() => mockLogger),
  },
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn().mockReturnThis(),
  },
  noopLogger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn().mockReturnThis(),
  },
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn().mockReturnThis(),
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
  vi.clearAllMocks();
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
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

process.on('unhandledRejection', (reason) => {
  if (logger && logger.error) {
    logger.error('[Test] Unhandled Rejection:', reason);
  }
});
