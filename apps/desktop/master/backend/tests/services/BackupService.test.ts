import { vi, describe, it, test, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { BackupService } from '../../services/BackupService';


vi.mock('adm-zip', () => {
  return {
    default: vi.fn().mockImplementation(function (bufferOrPath) {
      this.getEntry = vi.fn().mockImplementation((name) => {
        if (name === 'manifest.json') {
          return {
            getData: () => Buffer.from(JSON.stringify({
              version: 1,
              appVersion: '1.0.0',
              createdAt: new Date().toISOString(),
              platform: 'linux',
              hostname: 'test',
              type: 'incremental',
              since: '2020-01-01T00:00:00.000Z',
              checksum: '85201ab60dff732c871e8c8db93c6cacecf2e284abf5ea9b7bc312144c20e111'
            }))
          };
        }
        if (name === 'master.db') {
          return {
            getData: () => Buffer.from('mock-sqlite-db-content')
          };
        }
        return null;
      });
      this.getEntries = vi.fn().mockReturnValue([]);
      this.extractAllTo = vi.fn();
      this.addFile = vi.fn();
      this.toBuffer = vi.fn().mockReturnValue(Buffer.from('fake-zip'));
      // If the buffer string says 'invalid-checksum', throw error in restore
      if (Buffer.isBuffer(bufferOrPath) && bufferOrPath.toString() === 'invalid-checksum') {
        this.getEntry = vi.fn().mockReturnValue({
          getData: vi.fn().mockReturnValue(Buffer.from(JSON.stringify({
            version: 1,
            appVersion: '1.0.0',
            createdAt: new Date().toISOString(),
            platform: 'linux',
            hostname: 'test',
            type: 'incremental',
            checksum: '0000000000000000000000000000000000000000000000000000000000000000'
          })))
        });
      }
    })
  };
});

describe('BackupService Incremental & Checksum', () => {
    let tmpDir: string;
    let dbPath: string;
    let uploadsDir: string;
    let mockLogger: any;
    let backupService: BackupService;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'backup-test-'));
        dbPath = path.join(tmpDir, 'test.db');
        uploadsDir = path.join(tmpDir, 'uploads');
        fs.mkdirSync(uploadsDir, { recursive: true });

        // Create mock DB file
        fs.writeFileSync(dbPath, 'mock-sqlite-db-content');

        // Create mock upload file
        fs.writeFileSync(path.join(uploadsDir, 'photo1.jpg'), 'photo-content-1');

        mockLogger = {
            info: vi.fn(),
            error: vi.fn(),
            warn: vi.fn(),
            debug: vi.fn()
        };

        backupService = new BackupService(dbPath, uploadsDir, mockLogger);
    });

    afterEach(() => {
        try {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        } catch (_) {}
    });

    it('should calculate file checksum correctly', async () => {
        const expectedHash = crypto.createHash('sha256').update('mock-sqlite-db-content').digest('hex');
        const calculated = await backupService.calculateFileChecksum(dbPath);
        expect(calculated).toBe(expectedHash);
    });

    it('should create an incremental snapshot containing manifest with checksum and type', async () => {
        const { manifest, zipBuffer } = await backupService.createIncrementalSnapshot('2020-01-01T00:00:00.000Z');
        expect(manifest.type).toBe('incremental');
        expect(manifest.since).toBe('2020-01-01T00:00:00.000Z');
        expect(manifest.checksum).toBeDefined();
        expect(zipBuffer.length).toBeGreaterThan(0);
    });

    it('should restore successfully when checksum matches', async () => {
        const { zipBuffer } = await backupService.createIncrementalSnapshot();
        const warnings = await backupService.restore(zipBuffer);
        expect(warnings).toBeDefined();
        expect(mockLogger.info).toHaveBeenCalledWith(
            '[BackupService] Database checksum verified successfully',
            expect.any(Object)
        );
    });

    it('should throw error when restoring archive with invalid database checksum', async () => {
        const AdmZip = require('adm-zip');
        const zip = new AdmZip();
        const invalidManifest = {
            version: 1,
            appVersion: '1.0.0',
            createdAt: new Date().toISOString(),
            platform: 'linux',
            hostname: 'test',
            checksum: '0000000000000000000000000000000000000000000000000000000000000000'
        };
        const modifiedBuffer = Buffer.from('invalid-checksum');
        await expect(backupService.restore(modifiedBuffer)).rejects.toThrow(/database checksum verification failed/);
    });

    it('should track lastSuccessTimestamp in getStats()', () => {
        expect(backupService.getStats().lastSuccessTimestamp).toBeNull();
        backupService.recordSuccess();
        expect(backupService.getStats().lastSuccessTimestamp).toBeGreaterThan(0);
    });
});
