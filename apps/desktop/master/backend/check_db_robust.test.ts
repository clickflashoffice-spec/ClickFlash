import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkDbRobustness } from './check_db_robust';
import fs from 'fs';
import Database from 'better-sqlite3';

vi.mock('fs');
vi.mock('better-sqlite3');
vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  }
}));

describe('checkDbRobustness', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should return false if db is not found', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const result = checkDbRobustness();
    expect(result).toBe(false);
  });

  it('should return true and log tables if db is found', () => {
    vi.mocked(fs.existsSync).mockImplementation((path) => String(path).includes('local.db'));
    
    const mockPrepare = vi.fn().mockReturnValue({
      all: vi.fn().mockReturnValue([{ name: 'orders' }, { name: 'prospects' }])
    });
    vi.mocked(Database).mockImplementation(() => ({
      prepare: mockPrepare,
    } as any));

    const result = checkDbRobustness();
    expect(result).toBe(true);
    expect(mockPrepare).toHaveBeenCalledWith("SELECT name FROM sqlite_master WHERE type='table'");
  });
});
