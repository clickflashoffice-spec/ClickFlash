import { vi } from 'vitest';
import { initializeDatabase, resetDatabase, closeDatabase } from './mocks/database';

beforeAll(() => {
  initializeDatabase();
});

beforeEach(() => {
  resetDatabase();
});

afterEach(() => {
  vi.clearAllMocks();
});

afterAll(async () => {
  await closeDatabase();
  await new Promise(resolve => setTimeout(resolve, 500));
});
