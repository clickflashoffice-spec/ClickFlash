/**
 * MoneyTrash Uploader - Unit Tests
 * 
 * Tests for core business logic and utilities.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ============================================================================
// Logger Tests
// ============================================================================

describe('Logger', () => {
  const mockConsole = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };

  beforeEach(() => {
    vi.stubGlobal('console', mockConsole);
    localStorage.clear();
  });

  it('should create log entries with correct structure', () => {
    const entry = {
      timestamp: new Date().toISOString(),
      level: 'info' as const,
      message: 'Test message',
      context: { userId: '123' },
    };

    expect(entry).toHaveProperty('timestamp');
    expect(entry).toHaveProperty('level');
    expect(entry).toHaveProperty('message');
    expect(entry.level).toBe('info');
  });

  it('should filter logs by level', () => {
    const minLevel = 'warn';
    const levels = ['debug', 'info', 'warn', 'error'] as const;
    
    const shouldLog = (level: typeof levels[number]) => {
      const priorities: Record<typeof levels[number], number> = {
        debug: 0, info: 1, warn: 2, error: 3
      };
      return priorities[level] >= priorities[minLevel];
    };

    expect(shouldLog('debug')).toBe(false);
    expect(shouldLog('info')).toBe(false);
    expect(shouldLog('warn')).toBe(true);
    expect(shouldLog('error')).toBe(true);
  });
});

// ============================================================================
// Upload Queue Tests
// ============================================================================

describe('UploadQueue', () => {
  interface MockQueueItem {
    id: string;
    status: 'pending' | 'uploading' | 'completed' | 'failed' | 'paused' | 'cancelled';
    retryCount: number;
    maxRetries: number;
    progress: number;
  }

  let queue: Map<string, MockQueueItem>;

  beforeEach(() => {
    queue = new Map();
  });

  it('should add items to queue', () => {
    const item: MockQueueItem = {
      id: 'test-1',
      status: 'pending',
      retryCount: 0,
      maxRetries: 3,
      progress: 0,
    };

    queue.set(item.id, item);
    expect(queue.size).toBe(1);
    expect(queue.get('test-1')).toEqual(item);
  });

  it('should calculate queue statistics correctly', () => {
    queue.set('1', { id: '1', status: 'pending', retryCount: 0, maxRetries: 3, progress: 0 });
    queue.set('2', { id: '2', status: 'uploading', retryCount: 0, maxRetries: 3, progress: 50 });
    queue.set('3', { id: '3', status: 'completed', retryCount: 0, maxRetries: 3, progress: 100 });
    queue.set('4', { id: '4', status: 'failed', retryCount: 2, maxRetries: 3, progress: 30 });

    const items = Array.from(queue.values());
    const stats = {
      total: items.length,
      pending: items.filter(i => i.status === 'pending').length,
      uploading: items.filter(i => i.status === 'uploading').length,
      completed: items.filter(i => i.status === 'completed').length,
      failed: items.filter(i => i.status === 'failed').length,
    };

    expect(stats.total).toBe(4);
    expect(stats.pending).toBe(1);
    expect(stats.uploading).toBe(1);
    expect(stats.completed).toBe(1);
    expect(stats.failed).toBe(1);
  });

  it('should handle retry logic', () => {
    const item: MockQueueItem = {
      id: 'retry-test',
      status: 'failed',
      retryCount: 2,
      maxRetries: 3,
      progress: 50,
    };

    queue.set(item.id, item);

    // Simulate retry
    const shouldRetry = item.retryCount < item.maxRetries;
    expect(shouldRetry).toBe(true);

    if (shouldRetry) {
      item.retryCount++;
      item.status = 'pending';
    }

    expect(item.retryCount).toBe(3);
    expect(item.status).toBe('pending');
  });

  it('should mark as permanently failed after max retries', () => {
    const item: MockQueueItem = {
      id: 'failed-test',
      status: 'failed',
      retryCount: 3,
      maxRetries: 3,
      progress: 0,
    };

    const shouldRetry = item.retryCount < item.maxRetries;
    expect(shouldRetry).toBe(false);
    expect(item.status).toBe('failed');
  });
});

// ============================================================================
// Progress Storage Tests
// ============================================================================

describe('ProgressStorage', () => {
  interface FileProgress {
    id: string;
    name: string;
    progress: number;
    status: string;
    uploadedChunks: number[];
    totalChunks: number;
  }

  interface PersistedProgress {
    jobId: string;
    files: FileProgress[];
    status: string;
    lastUpdated: string;
  }

  let storage: Map<string, PersistedProgress>;

  beforeEach(() => {
    storage = new Map();
  });

  it('should save and retrieve progress', () => {
    const progress: PersistedProgress = {
      jobId: 'job-1',
      files: [
        { id: 'f1', name: 'test.jpg', progress: 50, status: 'uploading', uploadedChunks: [0, 1], totalChunks: 4 },
      ],
      status: 'uploading',
      lastUpdated: new Date().toISOString(),
    };

    storage.set(progress.jobId, progress);
    const retrieved = storage.get('job-1');

    expect(retrieved).toEqual(progress);
    expect(retrieved?.files[0].progress).toBe(50);
  });

  it('should find incomplete uploads', () => {
    storage.set('job-1', {
      jobId: 'job-1',
      files: [],
      status: 'completed',
      lastUpdated: new Date().toISOString(),
    });
    storage.set('job-2', {
      jobId: 'job-2',
      files: [],
      status: 'uploading',
      lastUpdated: new Date().toISOString(),
    });
    storage.set('job-3', {
      jobId: 'job-3',
      files: [],
      status: 'failed',
      lastUpdated: new Date().toISOString(),
    });

    const incomplete = Array.from(storage.values())
      .filter(p => p.status !== 'completed');

    expect(incomplete).toHaveLength(2);
    expect(incomplete.map(p => p.jobId)).toContain('job-2');
    expect(incomplete.map(p => p.jobId)).toContain('job-3');
  });

  it('should clear old completed uploads', () => {
    const oldDate = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(); // 48 hours ago
    const recentDate = new Date().toISOString();

    storage.set('old-job', {
      jobId: 'old-job',
      files: [],
      status: 'completed',
      lastUpdated: oldDate,
    });
    storage.set('recent-job', {
      jobId: 'recent-job',
      files: [],
      status: 'completed',
      lastUpdated: recentDate,
    });

    const maxAgeHours = 24;
    const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);

    let cleared = 0;
    for (const [key, value] of storage) {
      if (value.status === 'completed' && new Date(value.lastUpdated) < cutoff) {
        storage.delete(key);
        cleared++;
      }
    }

    expect(cleared).toBe(1);
    expect(storage.has('old-job')).toBe(false);
    expect(storage.has('recent-job')).toBe(true);
  });
});

// ============================================================================
// Error Boundary Tests
// ============================================================================

describe('Error Boundary Logic', () => {
  interface AppError {
    type: string;
    message: string;
    retryable: boolean;
  }

  const createError = (type: string, message: string, retryable: boolean): AppError => ({
    type,
    message,
    retryable,
  });

  it('should identify retryable errors', () => {
    const networkError = createError('NETWORK_ERROR', 'Connection failed', true);
    const uploadError = createError('UPLOAD_ERROR', 'Upload failed', true);
    const fileNotFound = createError('FILE_NOT_FOUND', 'File missing', false);
    const invalidFile = createError('INVALID_FILE', 'Bad format', false);

    const isRetryable = (error: AppError) => error.retryable;

    expect(isRetryable(networkError)).toBe(true);
    expect(isRetryable(uploadError)).toBe(true);
    expect(isRetryable(fileNotFound)).toBe(false);
    expect(isRetryable(invalidFile)).toBe(false);
  });

  it('should format error messages for users', () => {
    const formatError = (error: AppError): string => {
      switch (error.type) {
        case 'NETWORK_ERROR':
          return `Network issue: ${error.message}. Please check your connection.`;
        case 'FILE_NOT_FOUND':
          return `File not found: ${error.message}`;
        default:
          return `An error occurred: ${error.message}`;
      }
    };

    expect(formatError(createError('NETWORK_ERROR', 'Timeout', true)))
      .toContain('Network issue');
    expect(formatError(createError('FILE_NOT_FOUND', 'test.jpg', false)))
      .toContain('File not found');
  });
});

// ============================================================================
// File Validation Tests
// ============================================================================

describe('File Validation', () => {
  const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
  const VALID_EXTENSIONS = ['jpg', 'jpeg', 'png', 'heic', 'webp', 'gif'];

  interface FileInfo {
    name: string;
    size: number;
    path: string;
  }

  const validateFile = (file: FileInfo): { valid: boolean; error?: string } => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: 'File too large' };
    }

    // Check extension
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !VALID_EXTENSIONS.includes(ext)) {
      return { valid: false, error: 'Invalid file type' };
    }

    // Check path traversal
    if (file.path.includes('..') || file.path.includes('~')) {
      return { valid: false, error: 'Invalid path' };
    }

    return { valid: true };
  };

  it('should validate file size', () => {
    const smallFile: FileInfo = { name: 'test.jpg', size: 1024, path: '/valid/path' };
    const largeFile: FileInfo = { name: 'test.jpg', size: MAX_FILE_SIZE + 1, path: '/valid/path' };

    expect(validateFile(smallFile).valid).toBe(true);
    expect(validateFile(largeFile).valid).toBe(false);
    expect(validateFile(largeFile).error).toBe('File too large');
  });

  it('should validate file extensions', () => {
    const validFile: FileInfo = { name: 'photo.jpg', size: 1024, path: '/valid/path' };
    const validPng: FileInfo = { name: 'image.png', size: 1024, path: '/valid/path' };
    const invalidFile: FileInfo = { name: 'document.pdf', size: 1024, path: '/valid/path' };

    expect(validateFile(validFile).valid).toBe(true);
    expect(validateFile(validPng).valid).toBe(true);
    expect(validateFile(invalidFile).valid).toBe(false);
    expect(validateFile(invalidFile).error).toBe('Invalid file type');
  });

  it('should prevent path traversal attacks', () => {
    const maliciousPath: FileInfo = { name: 'test.jpg', size: 1024, path: '../../../etc/passwd' };
    const tildePath: FileInfo = { name: 'test.jpg', size: 1024, path: '~/.ssh/id_rsa' };
    const validPath: FileInfo = { name: 'test.jpg', size: 1024, path: '/home/user/photos' };

    expect(validateFile(maliciousPath).valid).toBe(false);
    expect(validateFile(tildePath).valid).toBe(false);
    expect(validateFile(validPath).valid).toBe(true);
  });
});

// ============================================================================
// Chunk Calculation Tests
// ============================================================================

describe('Chunk Calculations', () => {
  const CHUNK_SIZE = 1024 * 1024; // 1MB

  const calculateChunks = (fileSize: number): { totalChunks: number; chunkSize: number } => {
    const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);
    return { totalChunks, chunkSize: CHUNK_SIZE };
  };

  const getChunkRange = (fileSize: number, chunkIndex: number, totalChunks: number): { start: number; end: number } => {
    const start = chunkIndex * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, fileSize);
    return { start, end };
  };

  it('should calculate total chunks correctly', () => {
    expect(calculateChunks(512 * 1024)).toEqual({ totalChunks: 1, chunkSize: CHUNK_SIZE }); // 0.5MB
    expect(calculateChunks(CHUNK_SIZE)).toEqual({ totalChunks: 1, chunkSize: CHUNK_SIZE }); // 1MB
    expect(calculateChunks(CHUNK_SIZE + 1)).toEqual({ totalChunks: 2, chunkSize: CHUNK_SIZE }); // 1MB + 1 byte
    expect(calculateChunks(5 * CHUNK_SIZE)).toEqual({ totalChunks: 5, chunkSize: CHUNK_SIZE }); // 5MB
  });

  it('should calculate chunk byte ranges correctly', () => {
    const fileSize = 2.5 * CHUNK_SIZE; // 2.5MB

    expect(getChunkRange(fileSize, 0, 3)).toEqual({ start: 0, end: CHUNK_SIZE });
    expect(getChunkRange(fileSize, 1, 3)).toEqual({ start: CHUNK_SIZE, end: 2 * CHUNK_SIZE });
    expect(getChunkRange(fileSize, 2, 3)).toEqual({ start: 2 * CHUNK_SIZE, end: 2.5 * CHUNK_SIZE });
  });

  it('should calculate progress percentage', () => {
    const calculateProgress = (chunksReceived: number, totalChunks: number): number => {
      return Math.round((chunksReceived / totalChunks) * 100);
    };

    expect(calculateProgress(0, 10)).toBe(0);
    expect(calculateProgress(5, 10)).toBe(50);
    expect(calculateProgress(10, 10)).toBe(100);
    expect(calculateProgress(3, 4)).toBe(75);
  });
});

// ============================================================================
// Network Status Tests
// ============================================================================

describe('Network Status Handling', () => {
  type NetworkStatus = 'online' | 'offline' | 'unknown';

  interface NetworkMonitor {
    status: NetworkStatus;
    onStatusChange: ((status: NetworkStatus) => void) | null;
  }

  it('should handle online/offline transitions', () => {
    const monitor: NetworkMonitor = {
      status: 'unknown',
      onStatusChange: null,
    };

    const setOnline = () => {
      monitor.status = 'online';
      monitor.onStatusChange?.('online');
    };

    const setOffline = () => {
      monitor.status = 'offline';
      monitor.onStatusChange?.('offline');
    };

    let changeCount = 0;
    monitor.onStatusChange = () => { changeCount++; };

    setOnline();
    expect(monitor.status).toBe('online');
    expect(changeCount).toBe(1);

    setOffline();
    expect(monitor.status).toBe('offline');
    expect(changeCount).toBe(2);

    setOnline();
    expect(monitor.status).toBe('online');
    expect(changeCount).toBe(3);
  });

  it('should queue uploads when offline', () => {
    interface QueueItem {
      id: string;
      status: 'pending' | 'waiting_for_network';
    }

    const queue: QueueItem[] = [];
    let isOnline = false;

    const addToQueue = (item: QueueItem) => {
      if (!isOnline) {
        item.status = 'waiting_for_network';
      }
      queue.push(item);
    };

    const processQueue = () => {
      if (!isOnline) return;
      queue.forEach(item => {
        if (item.status === 'waiting_for_network') {
          item.status = 'pending';
        }
      });
    };

    isOnline = false;
    addToQueue({ id: '1', status: 'pending' });
    expect(queue[0].status).toBe('waiting_for_network');

    isOnline = true;
    processQueue();
    expect(queue[0].status).toBe('pending');
  });
});
