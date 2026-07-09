import { jest } from '@jest/globals';
import { handleCloud } from '../routes/cloud.js';

describe('Cloud Backup Endpoints', () => {
  let mockEnv: any;
  let mockDbManager: any;
  let corsHeaders: any;

  beforeEach(() => {
    mockEnv = {
      GALLERY_BUCKET: {
        put: jest.fn<any>().mockResolvedValue(undefined),
        delete: jest.fn<any>().mockResolvedValue(undefined),
      },
      BACKUP_BUCKET: {
        put: jest.fn<any>().mockResolvedValue(undefined),
        delete: jest.fn<any>().mockResolvedValue(undefined),
      },
    };
    mockDbManager = {
      run: jest.fn<any>().mockResolvedValue(undefined),
      query: jest.fn<any>().mockResolvedValue([]),
      get: jest.fn<any>().mockResolvedValue(undefined),
    };
    corsHeaders = { 'Access-Control-Allow-Origin': '*' };
  });

  it('should handle POST /api/cloud/backup/incremental with raw binary payload and verify checksum', async () => {
    const backupContent = 'mock-zip-binary-content';
    const encoder = new TextEncoder();
    const buf = encoder.encode(backupContent);

    const hashBuffer = await crypto.subtle.digest('SHA-256', buf);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const checksum = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    const request = new Request('http://localhost/api/cloud/backup/incremental', {
      method: 'POST',
      headers: {
        'content-type': 'application/octet-stream',
        'x-backup-checksum': checksum,
        'x-backup-type': 'incremental',
        'x-backup-since': '2026-01-01T00:00:00.000Z',
      },
      body: buf,
    });
    const url = new URL('http://localhost/api/cloud/backup/incremental');
    const payload = { desk_id: 'test-desk' };

    const response = await handleCloud(request, url, mockEnv, mockDbManager, corsHeaders, {}, {}, {}, {}, {}, payload);
    const json = (await response!.json()) as any;

    expect(response!.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.key).toContain('backups/test-desk/');
    expect(mockEnv.BACKUP_BUCKET.put).toHaveBeenCalledWith(
      expect.stringContaining('backups/test-desk/'),
      expect.any(ArrayBuffer),
      expect.objectContaining({
        customMetadata: expect.objectContaining({ deskId: 'test-desk', checksum }),
      }),
    );
    expect(mockDbManager.run).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO cloud_backups'),
      expect.arrayContaining(['test-desk', 'backups/test-desk/' + json.key.split('/').pop(), 'incremental', '2026-01-01T00:00:00.000Z', checksum, buf.byteLength]),
    );
  });

  it('should reject POST /api/cloud/backup/incremental when checksum mismatch', async () => {
    const backupContent = 'mock-zip-binary-content';
    const encoder = new TextEncoder();
    const buf = encoder.encode(backupContent);

    const request = new Request('http://localhost/api/cloud/backup/incremental', {
      method: 'POST',
      headers: {
        'content-type': 'application/octet-stream',
        'x-backup-checksum': '0000000000000000000000000000000000000000000000000000000000000000',
      },
      body: buf,
    });
    const url = new URL('http://localhost/api/cloud/backup/incremental');
    const payload = { desk_id: 'test-desk' };

    const response = await handleCloud(request, url, mockEnv, mockDbManager, corsHeaders, {}, {}, {}, {}, {}, payload);
    expect(response!.status).toBe(400);
    const json = (await response!.json()) as any;
    expect(json.error.message).toContain('Checksum verification failed');
  });

  it('should list backups on GET /api/cloud/backup/incremental', async () => {
    mockDbManager.query.mockResolvedValueOnce([
      { id: 'bk_1', desk_id: 'test-desk', r2_key: 'backups/test-desk/bk_1.zip', type: 'incremental' },
    ]);
    const request = new Request('http://localhost/api/cloud/backup/incremental?deskId=test-desk', {
      method: 'GET',
    });
    const url = new URL('http://localhost/api/cloud/backup/incremental?deskId=test-desk');
    const payload = { desk_id: 'test-desk' };

    const response = await handleCloud(request, url, mockEnv, mockDbManager, corsHeaders, {}, {}, {}, {}, {}, payload);
    const json = (await response!.json()) as any;
    expect(response!.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.backups).toHaveLength(1);
    expect(json.backups[0].id).toBe('bk_1');
  });
});
