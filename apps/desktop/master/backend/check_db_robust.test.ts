import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';

const { mockPrepare } = vi.hoisted(() => {
  return { mockPrepare: vi.fn() };
});

vi.mock('better-sqlite3', () => {
  return {
    default: class MockDatabase {
      prepare = mockPrepare;
    }
  };
});

vi.mock('./utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
  Logger: {
    info: vi.fn(),
    error: vi.fn(),
  }
}));

import { checkDbRobustness } from './check_db_robust';

describe('checkDbRobustness', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(process, 'exit').mockImplementation((() => undefined) as any);
  });

  it('should return false if db is not found', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);
    const result = checkDbRobustness();
    expect(result).toBe(false);
  });

  it('should return true and log tables if db is found', () => {
    vi.spyOn(fs, 'existsSync').mockImplementation((p: any) => String(p).includes('local.db'));
    
    mockPrepare.mockReturnValue({
      all: vi.fn().mockReturnValue([{ name: 'orders' }, { name: 'prospects' }])
    });

    const result = checkDbRobustness();
    expect(result).toBe(true);
    expect(mockPrepare).toHaveBeenCalledWith("SELECT name FROM sqlite_master WHERE type='table'");
  });
});
