import { initializeDatabase, resetDatabase, closeDatabase } from './mocks/database';

beforeAll(() => {
  initializeDatabase();
});

beforeEach(() => {
  resetDatabase();
});

afterEach(() => {
  jest.clearAllMocks();
});

afterAll(async () => {
  await closeDatabase();
  await new Promise(resolve => setTimeout(resolve, 500));
});
