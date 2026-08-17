import { vi, describe, it, expect } from 'vitest';
import { TelemetryService } from '../../services/TelemetryService';

describe('TelemetryService', () => {
  it('should aggregate stats from CloudSyncService, DbWriteQueue, and BackupService', () => {
    const mockCloudSync = {
      getStats: vi.fn().mockReturnValue({
        metrics: {
          'sync.queue_depth': 42,
          'sync.dlq_count': 3,
        },
        queues: {
          operations: 42,
          dlq: 3,
        },
      }),
    };

    const mockDbWriteQueue = {
      getStats: vi.fn().mockReturnValue({
        writeLatencyMs: 12.5,
        queueSize: 5,
        oldestWrite: 1000,
      }),
    };

    const mockBackupService = {
      getStats: vi.fn().mockReturnValue({
        lastSuccessTimestamp: 1719940000000,
      }),
    };

    const telemetryService = new TelemetryService(mockCloudSync, mockDbWriteQueue, mockBackupService);
    const result = telemetryService.getTelemetry();

    expect(result['sync.queue_depth']).toBe(42);
    expect(result['sync.dlq_count']).toBe(3);
    expect(result['db.write_latency_ms']).toBe(12.5);
    expect(result['backup.last_success_timestamp']).toBe(1719940000000);

    expect(result.sync.queue_depth).toBe(42);
    expect(result.sync.dlq_count).toBe(3);
    expect(result.db.write_latency_ms).toBe(12.5);
    expect(result.db.queue_size).toBe(5);
    expect(result.backup.last_success_timestamp).toBe(1719940000000);
    expect(typeof result.timestamp).toBe('string');
  });

  it('should handle missing or throwing services gracefully', () => {
    const mockCloudSync = {
      getStats: vi.fn().mockImplementation(() => {
        throw new Error('Sync error');
      }),
    };

    const telemetryService = new TelemetryService(mockCloudSync, null, undefined);
    const result = telemetryService.getTelemetry();

    expect(result['sync.queue_depth']).toBe(0);
    expect(result['sync.dlq_count']).toBe(0);
    expect(result['db.write_latency_ms']).toBe(0);
    expect(result['backup.last_success_timestamp']).toBeNull();
  });
});
