import { getDatabase } from '@/backend/database';

import type { CameraObjectDetectedEvent } from '../../modules/camera-tether';
import {
  createCapturePairId,
  normalizeCaptureStem,
  PAIR_WAIT_TIMEOUT_MS,
  selectPairCandidate,
  type CapturePairingIdentity,
  type CapturePairingState,
} from './CapturePairing';

export interface CapturePairingResolution {
  state: CapturePairingState;
  pairId: string | null;
  pairedObjectId: string | null;
}

export interface CapturePairingCounts {
  pairedSets: number;
  awaitingCompanion: number;
  standaloneCaptures: number;
  ambiguousPairs: number;
}

class CapturePairingLedgerService {
  async reconcile(
    objectId: string,
    event: CameraObjectDetectedEvent
  ): Promise<CapturePairingResolution> {
    const database = await getDatabase();
    const now = Date.now();
    let resolution: CapturePairingResolution = {
      state: 'WAITING',
      pairId: null,
      pairedObjectId: null,
    };

    await database.withExclusiveTransactionAsync(async (transaction: PairingDatabase) => {
      await this.sweepExpired(transaction, event.sessionId, now);
      const identity: CapturePairingIdentity = {
        objectId,
        mediaType: event.mediaType,
        normalizedStem: normalizeCaptureStem(event.filename),
        sequenceNumber: this.nonnegativeInteger(event.sequenceNumber),
        cameraCreatedAt: this.nonnegativeInteger(event.cameraCreatedAt),
        detectedAt: this.nonnegativeInteger(event.detectedAt),
      };
      const pairDeadlineAt =
        Math.max(identity.detectedAt, now) + PAIR_WAIT_TIMEOUT_MS;

      await transaction.runAsync(
        `INSERT INTO capture_pair_members (
           object_id, session_id, camera_key, media_type, normalized_stem,
           sequence_number, camera_created_at, detected_at, pair_state,
           pair_deadline_at, updated_at
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'WAITING', ?, ?)
         ON CONFLICT(object_id)
         DO UPDATE SET
           session_id = excluded.session_id,
           camera_key = excluded.camera_key,
           media_type = excluded.media_type,
           normalized_stem = excluded.normalized_stem,
           sequence_number = excluded.sequence_number,
           camera_created_at = excluded.camera_created_at,
           detected_at = excluded.detected_at,
           updated_at = excluded.updated_at`,
        [
          identity.objectId,
          event.sessionId,
          event.cameraKey,
          identity.mediaType,
          identity.normalizedStem,
          identity.sequenceNumber,
          identity.cameraCreatedAt || null,
          identity.detectedAt,
          pairDeadlineAt,
          now,
        ]
      );

      const current = await transaction.getFirstAsync<PairMemberRow>(
        `${PAIR_MEMBER_SELECT} WHERE object_id = ?`,
        [objectId]
      );
      if (!current) throw new Error('Capture pairing member could not be persisted.');
      if (current.pairState === 'PAIRED' || current.pairState === 'AMBIGUOUS') {
        resolution = this.resolution(current);
        return;
      }

      const candidates = await transaction.getAllAsync<PairMemberRow>(
        `${PAIR_MEMBER_SELECT}
         WHERE session_id = ?
           AND camera_key = ?
           AND normalized_stem = ?
           AND media_type <> ?
           AND pair_state IN ('WAITING', 'STANDALONE')
           AND object_id <> ?`,
        [
          event.sessionId,
          event.cameraKey,
          identity.normalizedStem,
          identity.mediaType,
          objectId,
        ]
      );
      const selection = selectPairCandidate(
        this.identity(current),
        candidates.map((candidate) => this.identity(candidate))
      );

      if (selection.kind === 'NONE') {
        resolution = this.resolution(current);
        return;
      }
      if (selection.kind === 'AMBIGUOUS') {
        const ambiguousIds = [objectId, ...(selection.ambiguousObjectIds ?? [])];
        const placeholders = ambiguousIds.map(() => '?').join(', ');
        await transaction.runAsync(
          `UPDATE capture_pair_members
           SET pair_state = 'AMBIGUOUS',
               pair_id = NULL,
               paired_object_id = NULL,
               paired_at = NULL,
               updated_at = ?
           WHERE object_id IN (${placeholders})`,
          [now, ...ambiguousIds]
        );
        resolution = {
          state: 'AMBIGUOUS',
          pairId: null,
          pairedObjectId: null,
        };
        return;
      }

      const companion = selection.candidate;
      if (!companion) throw new Error('Capture pair selection omitted its companion.');
      const pairId = createCapturePairId(objectId, companion.objectId);
      await this.markPaired(
        transaction,
        objectId,
        companion.objectId,
        pairId,
        now
      );
      await this.markPaired(
        transaction,
        companion.objectId,
        objectId,
        pairId,
        now
      );
      resolution = {
        state: 'PAIRED',
        pairId,
        pairedObjectId: companion.objectId,
      };
    });

    return resolution;
  }

  async getCounts(sessionId: string): Promise<CapturePairingCounts> {
    const database = await getDatabase();
    await this.sweepExpired(database, sessionId, Date.now());
    const counts: CapturePairingCounts = {
      pairedSets: 0,
      awaitingCompanion: 0,
      standaloneCaptures: 0,
      ambiguousPairs: 0,
    };
    const rows = await database.getAllAsync<{
      pairState: CapturePairingState;
      count: number;
    }>(
      `SELECT pair_state AS pairState, COUNT(*) AS count
       FROM capture_pair_members
       WHERE session_id = ?
       GROUP BY pair_state`,
      [sessionId]
    );
    rows.forEach((row) => {
      if (row.pairState === 'WAITING') counts.awaitingCompanion = row.count;
      if (row.pairState === 'STANDALONE') counts.standaloneCaptures = row.count;
      if (row.pairState === 'AMBIGUOUS') counts.ambiguousPairs = row.count;
    });
    const paired = await database.getFirstAsync<{ count: number }>(
      `SELECT COUNT(DISTINCT pair_id) AS count
       FROM capture_pair_members
       WHERE session_id = ? AND pair_state = 'PAIRED'`,
      [sessionId]
    );
    counts.pairedSets = paired?.count ?? 0;
    return counts;
  }

  private async markPaired(
    database: PairingDatabase,
    objectId: string,
    companionObjectId: string,
    pairId: string,
    now: number
  ): Promise<void> {
    await database.runAsync(
      `UPDATE capture_pair_members
       SET pair_state = 'PAIRED',
           pair_id = ?,
           paired_object_id = ?,
           paired_at = ?,
           updated_at = ?
       WHERE object_id = ?`,
      [pairId, companionObjectId, now, now, objectId]
    );
  }

  private async sweepExpired(
    database: PairingDatabase,
    sessionId: string,
    now: number
  ): Promise<void> {
    await database.runAsync(
      `UPDATE capture_pair_members
       SET pair_state = 'STANDALONE',
           updated_at = ?
       WHERE session_id = ?
         AND pair_state = 'WAITING'
         AND pair_deadline_at <= ?`,
      [now, sessionId, now]
    );
  }

  private identity(row: PairMemberRow): CapturePairingIdentity {
    return {
      objectId: row.objectId,
      mediaType: row.mediaType,
      normalizedStem: row.normalizedStem,
      sequenceNumber: row.sequenceNumber,
      cameraCreatedAt: row.cameraCreatedAt ?? 0,
      detectedAt: row.detectedAt,
    };
  }

  private resolution(row: PairMemberRow): CapturePairingResolution {
    return {
      state: row.pairState,
      pairId: row.pairId,
      pairedObjectId: row.pairedObjectId,
    };
  }

  private nonnegativeInteger(value: number): number {
    return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
  }
}

export const capturePairingLedgerService = new CapturePairingLedgerService();

interface PairMemberRow {
  objectId: string;
  mediaType: 'jpeg' | 'raw';
  normalizedStem: string;
  sequenceNumber: number;
  cameraCreatedAt: number | null;
  detectedAt: number;
  pairState: CapturePairingState;
  pairId: string | null;
  pairedObjectId: string | null;
}

interface PairingDatabase {
  runAsync(source: string, params: (string | number | null)[]): Promise<unknown>;
  getFirstAsync<T>(source: string, params: (string | number | null)[]): Promise<T | null>;
  getAllAsync<T>(source: string, params: (string | number | null)[]): Promise<T[]>;
}

const PAIR_MEMBER_SELECT = `
  SELECT
    object_id AS objectId,
    media_type AS mediaType,
    normalized_stem AS normalizedStem,
    sequence_number AS sequenceNumber,
    camera_created_at AS cameraCreatedAt,
    detected_at AS detectedAt,
    pair_state AS pairState,
    pair_id AS pairId,
    paired_object_id AS pairedObjectId
  FROM capture_pair_members`;
