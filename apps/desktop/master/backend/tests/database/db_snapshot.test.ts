import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import DatabaseManager from '../../database/db';
import fs from 'fs';
import path from 'path';

// Mock better-sqlite3-multiple-ciphers
const mockExec = vi.fn();
const mockPragma = vi.fn();
const mockPrepare = vi.fn();

vi.mock('better-sqlite3-multiple-ciphers', () => {
  return {
    default: class MockDatabase {
      exec = mockExec;
      pragma = mockPragma;
      prepare = mockPrepare;
      close = vi.fn();
    }
  };
});

vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

describe('DatabaseManager — SQLite Automated Snapshotting (ARCH-MED-001)', () => {
  let dbManager: DatabaseManager;
  const mockDbPath = path.join(process.cwd(), 'test-data', 'test-clickflash.db');

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrepare.mockReturnValue({
      get: vi.fn().mockReturnValue({ priority: 1 }),
      all: vi.fn().mockReturnValue([]),
      run: vi.fn().mockReturnValue({ changes: 1 })
    });
    dbManager = new DatabaseManager(mockDbPath);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should throw error when createSnapshot is called without connection', async () => {
    await expect(dbManager.createSnapshot()).rejects.toThrow('Database not connected');
  });

  it('should create online point-in-time snapshot via VACUUM INTO', async () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'mkdirSync').mockReturnValue(undefined as any);
    vi.spyOn(fs, 'statSync').mockReturnValue({ size: 2048000, mtimeMs: Date.now() } as any);
    vi.spyOn(fs, 'readdirSync').mockReturnValue([] as any);

    dbManager.connect();

    const result = await dbManager.createSnapshot();

    expect(result.snapshotPath).toContain('test-clickflash-snapshot-');
    expect(result.sizeBytes).toBe(2048000);
    // Verified WAL checkpoint (PASSIVE mode for zero reader starvation)
    expect(mockPragma).toHaveBeenCalledWith('wal_checkpoint(PASSIVE)');
    // Verified VACUUM INTO statement executed
    expect(mockExec).toHaveBeenCalledWith(expect.stringContaining('VACUUM INTO'));
  });

  it('should evaluate WAL health status correctly', () => {
    dbManager.connect();

    mockPragma.mockReturnValue('wal');
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'statSync').mockReturnValue({ size: 10 * 1024 * 1024 } as any); // 10MB (healthy)

    const health = dbManager.getWalHealth();

    expect(health.isHealthy).toBe(true);
    expect(health.journalMode).toBe('wal');
    expect(health.walSize).toBe(10 * 1024 * 1024);
  });

  it('should flag WAL as unhealthy if size exceeds 50MB', () => {
    dbManager.connect();

    mockPragma.mockReturnValue('wal');
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'statSync').mockReturnValue({ size: 55 * 1024 * 1024 } as any); // 55MB (unhealthy)

    const health = dbManager.getWalHealth();

    expect(health.isHealthy).toBe(false);
    expect(health.walSize).toBe(55 * 1024 * 1024);
  });

  it('should rotate older snapshots keeping max 7', async () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'mkdirSync').mockReturnValue(undefined as any);
    vi.spyOn(fs, 'statSync').mockReturnValue({ size: 1024, mtimeMs: 1000 } as any);
    const unlinkSpy = vi.spyOn(fs, 'unlinkSync').mockReturnValue(undefined);

    // Mock 9 snapshot files
    const fakeFiles = Array.from({ length: 9 }, (_, i) => `test-snapshot-${i}.db`);
    vi.spyOn(fs, 'readdirSync').mockReturnValue(fakeFiles as any);

    dbManager.connect();
    await dbManager.createSnapshot();

    // 9 files > 7 max -> 2 oldest files rotated/deleted
    expect(unlinkSpy).toHaveBeenCalledTimes(2);
  });
});
