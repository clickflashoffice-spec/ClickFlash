import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DbWriteQueue } from '../../services/DbWriteQueue';
import path from 'path';
import fs from 'fs';
import os from 'os';

describe('DbWriteQueue Journal & Durability (ARCH-001)', () => {
  let tempDir: string;
  let journalPath: string;
  let mockDb: any;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cf-journal-test-'));
    journalPath = path.join(tempDir, 'queue-journal.jsonl');

    mockDb = {
      run: vi.fn(),
      query: vi.fn().mockReturnValue([])
    };
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it('should synchronously append write-ahead log to journal file upon enqueue', async () => {
    const queue = new DbWriteQueue(mockDb, {
      journalPath,
      autoReplay: false
    });

    // Mock WorkerPool execute so we can inspect journal while write is in flight
    (queue as any).pool.execute = vi.fn().mockImplementation(async () => {
      // In flight, verify journal has entry
      expect(fs.existsSync(journalPath)).toBe(true);
      const content = fs.readFileSync(journalPath, 'utf8');
      expect(content).toContain('photos');
      expect(content).toContain('photo-123');
      expect(content).toContain('Sample Photo');
    });

    await queue.enqueue('photos', 'photo-123', { title: 'Sample Photo' });
    await queue.shutdown();
  });

  it('should replay uncompacted journal entries on startup', async () => {
    // Pre-populate journal as if system crashed while writes were queued
    const preEntries = [
      JSON.stringify({
        entryId: 'photos:p1:123',
        table: 'photos',
        id: 'p1',
        data: { title: 'Crashed Update 1' },
        priority: 'normal',
        timestamp: Date.now() - 5000
      }),
      JSON.stringify({
        entryId: 'photos:p2:124',
        table: 'photos',
        id: 'p2',
        data: { title: 'Crashed Update 2' },
        priority: 'high',
        timestamp: Date.now() - 4000
      })
    ].join('\n') + '\n';

    fs.writeFileSync(journalPath, preEntries, 'utf8');

    const queue = new DbWriteQueue(mockDb, {
      journalPath,
      autoReplay: true
    });

    await queue.flush();

    // Verify mockDb.run was called with UPDATE for both crashed entries
    expect(mockDb.run).toHaveBeenCalledWith(
      'UPDATE photos SET title = ? WHERE id = ?',
      ['Crashed Update 1', 'p1']
    );
    expect(mockDb.run).toHaveBeenCalledWith(
      'UPDATE photos SET title = ? WHERE id = ?',
      ['Crashed Update 2', 'p2']
    );

    // Journal should be truncated after successful recovery
    const remainingContent = fs.readFileSync(journalPath, 'utf8');
    expect(remainingContent.trim()).toBe('');

    await queue.shutdown();
  });

  it('should handle corrupted or empty lines gracefully during recovery', async () => {
    const badContent = 'corrupted json line 1\n{"valid":"but incomplete"}\n\n';
    fs.writeFileSync(journalPath, badContent, 'utf8');

    const queue = new DbWriteQueue(mockDb, {
      journalPath,
      autoReplay: true
    });

    // Should not throw
    await expect(queue.flush()).resolves.not.toThrow();
    await queue.shutdown();
  });
});
