import { vi, Mock } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { db } from './mocks/database';

(globalThis as any).jest = vi;

let server: { listen: (opts: { onUnhandledRequest: string }) => void; resetHandlers: () => void; close: () => Promise<void> } | null = null;
let mockLogger: { debug: Mock; info: Mock; warn: Mock; error: Mock };

vi.mock('../src/utils/logger', () => {
  const mockLoggerInstance = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
  return {
    Logger: vi.fn(() => mockLoggerInstance),
    logger: mockLoggerInstance,
    LogLevel: { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 },
  };
});

beforeAll(async () => {
  mockLogger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };

  if (typeof window === 'undefined') {
    const { server: mswServer } = await import('./mocks/server');
    server = mswServer as typeof server;
    server.listen({ onUnhandledRequest: 'warn' });
  }
  
  if (process.env.NODE_ENV === 'test') {
    mockLogger.info('[Test] Starting test environment');
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
  
  if (process.env.NODE_ENV === 'test' && mockLogger) {
    mockLogger.info('[Test] Test environment closed');
  }
});

global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
} as unknown as Console;

process.on('unhandledRejection', (reason) => {
  console.error('[Test] Unhandled Rejection:', reason);
});
