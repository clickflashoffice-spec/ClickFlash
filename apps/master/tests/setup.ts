import '@testing-library/jest-dom';
import { db } from './mocks/database';

if (typeof setImmediate === 'undefined') {
  (global as any).setImmediate = (fn: Function, ...args: any[]) => setTimeout(fn, 0, ...args);
}
if (typeof clearImmediate === 'undefined') {
  (global as any).clearImmediate = (id: any) => clearTimeout(id);
}


let server: { listen: (opts: { onUnhandledRequest: string }) => void; resetHandlers: () => void; close: () => Promise<void> } | null = null;
let mockLogger: { debug: jest.Mock; info: jest.Mock; warn: jest.Mock; error: jest.Mock };

jest.mock('../src/utils/logger', () => ({
  Logger: {
    getInstance: jest.fn(() => mockLogger),
  },
}));

beforeAll(async () => {
  mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
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
  jest.clearAllMocks();
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
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

process.on('unhandledRejection', (reason) => {
  console.error('[Test] Unhandled Rejection:', reason);
});
