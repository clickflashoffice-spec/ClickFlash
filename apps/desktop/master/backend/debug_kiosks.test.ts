import { describe, it, expect, vi, beforeEach } from 'vitest';
import { debugKiosks } from './debug_kiosks';
import Database from 'better-sqlite3';

vi.mock('better-sqlite3');
vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  }
}));

describe('debugKiosks', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should return true when db operation is successful', () => {
    const mockPrepare = vi.fn().mockReturnValue({
      all: vi.fn().mockReturnValue([{ id: 1, name: 'Kiosk 1' }])
    });
    const mockClose = vi.fn();
    
    vi.mocked(Database).mockImplementation(() => ({
      prepare: mockPrepare,
      close: mockClose
    } as any));

    const result = debugKiosks('/test/dir');
    expect(result).toBe(true);
    expect(mockPrepare).toHaveBeenCalledWith("SELECT id, name, status, ordersFolderPath FROM kiosks");
    expect(mockClose).toHaveBeenCalled();
  });

  it('should return false when db operation fails', () => {
    const mockPrepare = vi.fn().mockImplementation(() => {
        throw new Error('Test DB Error');
    });
    const mockClose = vi.fn();

    vi.mocked(Database).mockImplementation(() => ({
      prepare: mockPrepare,
      close: mockClose
    } as any));

    const result = debugKiosks('/test/dir');
    expect(result).toBe(false);
  });
});
