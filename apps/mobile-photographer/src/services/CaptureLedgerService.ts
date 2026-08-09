import { getDatabase } from '@/backend/database';

import type {
  CameraImportCompletedEvent,
  CameraObjectDetectedEvent,
} from '../../modules/camera-tether';
import {
  capturePairingLedgerService,
  type CapturePairingCounts,
  type CapturePairingResolution,
} from './CapturePairingLedgerService';
import {
  captureDeliveryLedgerService,
  type CaptureDeliveryCounts,
} from './CaptureDeliveryLedgerService';

export type CaptureLedgerState =
  | 'DETECTED'
  | 'IMPORTING'
  | 'BLOCKED_STORAGE'
  | 'LOCAL_VERIFIED'
  | 'FAILED';

interface CaptureStateRow {
  id: string;
  state: CaptureLedgerState;
}

export interface CaptureLedgerCounts
  extends CapturePairingCounts,
    CaptureDeliveryCounts {
  detected: number;
  importing: number;
  storageBlocked: number;
  localVerified: number;
  failed: number;
}

export type { CapturePairingResolution } from './CapturePairingLedgerService';

const SESSION_ID_SAFE_CHARS = /[^A-Za-z0-9._-]/g;
const ERROR_MESSAGE_LIMIT = 1_000;

class CaptureLedgerService {
  private activeSessionId: string | null = null;
  private activeSessionPromise: Promise<string> | null = null;

  async getOrCreateActiveSession(): Promise<string> {
    if (this.activeSessionId) return this.activeSessionId;
    if (this.activeSessionPromise) return this.activeSessionPromise;

    this.activeSessionPromise = this.resolveActiveSession();
    try {
      return await this.activeSessionPromise;
    } finally {
      this.activeSessionPromise = null;
    }
  }

  private async resolveActiveSession(): Promise<string> {
    const database = await getDatabase();
    const now = Date.now();
    const timestamp = new Date(now).toISOString().replace(SESSION_ID_SAFE_CHARS, '');
    const entropy = Math.random().toString(36).slice(2, 10);
    const candidateSessionId = `field_${timestamp}_${entropy}`.slice(0, 64);
    await database.runAsync(
      `INSERT OR IGNORE INTO capture_sessions (id, state, started_at, updated_at)
       VALUES (?, 'ACTIVE', ?, ?)`,
      [candidateSessionId, now, now]
    );

    const activeSession = await database.getFirstAsync<{ id: string }>(
      `SELECT id FROM capture_sessions
       WHERE state = 'ACTIVE'
       ORDER BY started_at DESC
       LIMIT 1`
    );
    if (!activeSession) {
      throw new Error('Capture ledger could not establish an active session.');
    }

    this.activeSessionId = activeSession.id;
    return activeSession.id;
  }

  async closeActiveSession(): Promise<void> {
    const activeSessionId =
      this.activeSessionId ??
      (this.activeSessionPromise ? await this.activeSessionPromise : null);
    if (!activeSessionId) return;

    const database = await getDatabase();
    const now = Date.now();
    await database.runAsync(
      `UPDATE capture_sessions
       SET state = 'CLOSED', ended_at = ?, updated_at = ?
       WHERE id = ? AND state = 'ACTIVE'`,
      [now, now, activeSessionId]
    );
    if (this.activeSessionId === activeSessionId) this.activeSessionId = null;
  }

  async recordDetected(event: CameraObjectDetectedEvent): Promise<CaptureStateRow> {
    const database = await getDatabase();
    const id = this.captureId(event);
    const now = Date.now();

    await database.runAsync(
      `INSERT INTO capture_objects (
         id, session_id, camera_key, camera_device_id, storage_id, object_handle,
         object_key, filename, media_type, expected_byte_size, state, camera_created_at,
         detected_at, updated_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DETECTED', ?, ?, ?)
       ON CONFLICT(session_id, camera_key, object_key)
       DO UPDATE SET
         camera_device_id = excluded.camera_device_id,
         storage_id = excluded.storage_id,
         object_handle = excluded.object_handle,
         filename = excluded.filename,
         media_type = excluded.media_type,
         expected_byte_size = excluded.expected_byte_size,
         camera_created_at = excluded.camera_created_at,
         updated_at = excluded.updated_at`,
      [
        id,
        event.sessionId,
        event.cameraKey,
        event.deviceId,
        event.storageId,
        event.objectHandle,
        event.objectKey,
        event.filename,
        event.mediaType,
        event.byteSize,
        event.cameraCreatedAt || null,
        event.detectedAt,
        now,
      ]
    );

    const row = await database.getFirstAsync<CaptureStateRow>(
      `SELECT id, state
       FROM capture_objects
       WHERE session_id = ? AND camera_key = ? AND object_key = ?`,
      [event.sessionId, event.cameraKey, event.objectKey]
    );
    if (!row) throw new Error('Capture ledger failed to persist the detected camera object.');
    return row;
  }

  async markImporting(id: string): Promise<void> {
    const database = await getDatabase();
    const now = Date.now();
    await database.runAsync(
      `UPDATE capture_objects
       SET state = CASE WHEN state = 'LOCAL_VERIFIED' THEN state ELSE 'IMPORTING' END,
           import_started_at = ?,
           attempt_count = attempt_count + 1,
           last_error_code = NULL,
           last_error_message = NULL,
           updated_at = ?
       WHERE id = ?`,
      [now, now, id]
    );
  }

  async markVerified(id: string, imported: CameraImportCompletedEvent): Promise<void> {
    const database = await getDatabase();
    await database.runAsync(
      `UPDATE capture_objects
       SET state = 'LOCAL_VERIFIED',
           actual_byte_size = ?,
           sha256 = ?,
           local_uri = ?,
           imported_at = ?,
           last_error_code = NULL,
           last_error_message = NULL,
           updated_at = ?
       WHERE id = ?`,
      [
        imported.byteSize,
        imported.sha256,
        imported.localUri,
        imported.importedAt,
        Date.now(),
        id,
      ]
    );
  }

  async reconcilePairing(
    objectId: string,
    event: CameraObjectDetectedEvent
  ): Promise<CapturePairingResolution> {
    return capturePairingLedgerService.reconcile(objectId, event);
  }

  async ensureOriginalDelivery(objectId: string): Promise<void> {
    await captureDeliveryLedgerService.ensureOriginal(objectId);
  }

  async markStorageBlocked(id: string, message: string): Promise<void> {
    const database = await getDatabase();
    const now = Date.now();
    await database.runAsync(
      `UPDATE capture_objects
       SET state = CASE WHEN state = 'LOCAL_VERIFIED' THEN state ELSE 'BLOCKED_STORAGE' END,
           last_error_code = 'STORAGE_BACKPRESSURE',
           last_error_message = ?,
           updated_at = ?
       WHERE id = ?`,
      [message.slice(0, ERROR_MESSAGE_LIMIT), now, id]
    );
  }

  async markFailed(id: string, code: string, message: string): Promise<void> {
    const database = await getDatabase();
    const now = Date.now();
    await database.runAsync(
      `UPDATE capture_objects
       SET state = CASE WHEN state = 'LOCAL_VERIFIED' THEN state ELSE 'FAILED' END,
           last_error_code = ?,
           last_error_message = ?,
           updated_at = ?
       WHERE id = ?`,
      [code, message.slice(0, ERROR_MESSAGE_LIMIT), now, id]
    );
  }

  async getCounts(sessionId: string): Promise<CaptureLedgerCounts> {
    const database = await getDatabase();
    const rows = await database.getAllAsync<{ state: CaptureLedgerState; count: number }>(
      `SELECT state, COUNT(*) AS count
       FROM capture_objects
       WHERE session_id = ?
       GROUP BY state`,
      [sessionId]
    );
    const counts: CaptureLedgerCounts = {
      detected: 0,
      importing: 0,
      storageBlocked: 0,
      localVerified: 0,
      failed: 0,
      pairedSets: 0,
      awaitingCompanion: 0,
      standaloneCaptures: 0,
      ambiguousPairs: 0,
      masterPending: 0,
      kioskPending: 0,
      cloudPending: 0,
      readyDeliveries: 0,
      deliveryAttention: 0,
    };

    rows.forEach((row) => {
      if (row.state === 'DETECTED') counts.detected = row.count;
      if (row.state === 'IMPORTING') counts.importing = row.count;
      if (row.state === 'BLOCKED_STORAGE') counts.storageBlocked = row.count;
      if (row.state === 'LOCAL_VERIFIED') counts.localVerified = row.count;
      if (row.state === 'FAILED') counts.failed = row.count;
    });

    const pairingCounts = await capturePairingLedgerService.getCounts(sessionId);
    const deliveryCounts = await captureDeliveryLedgerService.getCounts(sessionId);
    return { ...counts, ...pairingCounts, ...deliveryCounts };
  }

  private captureId(event: CameraObjectDetectedEvent): string {
    return [
      event.sessionId,
      event.cameraKey,
      event.objectKey,
    ].join(':');
  }
}

export const captureLedgerService = new CaptureLedgerService();
