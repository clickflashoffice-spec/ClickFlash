import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPrepare, mockClose } = vi.hoisted(() => {
  return { mockPrepare: vi.fn(), mockClose: vi.fn() };
});

vi.mock('better-sqlite3', () => {
  return {
    default: class MockDatabase {
      prepare = mockPrepare;
      close = mockClose;
    }
  };
});

vi.mock('./utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  }
}));

import { debugKiosks } from './debug_kiosks';

describe('debugKiosks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return true when db operation is successful', () => {
    mockPrepare.mockReturnValue({
      all: vi.fn().mockReturnValue([{ id: 1, name: 'Kiosk 1' }])
    });

    const result = debugKiosks('/test/dir');
    expect(result).toBe(true);
    expect(mockPrepare).toHaveBeenCalledWith("SELECT id, name, status, ordersFolderPath FROM kiosks");
    expect(mockClose).toHaveBeenCalled();
  });

  it('should return false when db operation fails', () => {
    mockPrepare.mockImplementation(() => {
      throw new Error('Test DB Error');
    });

    const result = debugKiosks('/test/dir');
    expect(result).toBe(false);
  });
});
