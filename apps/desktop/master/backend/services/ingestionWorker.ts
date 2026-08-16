import { RedisStreamConsumer } from './redisStreamConsumer';
import { RedisCacheService } from './redisCacheService';
import { logger } from '../utils/logger';
import os from 'os';
import { VectorIndexService } from './VectorIndexService';
/**
 * Photo Ingestion Stream Worker
 * 
 * Wires the RedisStreamConsumer to the `photo_ingestion` and
 * `mobile_capture_processing_queue` streams produced by PhotoRepo,
 * albumService, and mobileCapture routes.
 * 
 * Each event is processed into the local SQLite database via
 * the repository pattern, completing the event-driven pipeline.
 */

export interface IngestionWorkerDeps {
  /** Database access object (injected to avoid circular imports) */
  db: {
    run: (sql: string, ...params: any[]) => any;
    prepare: (sql: string) => any;
  };
}

export function createIngestionWorker(deps: IngestionWorkerDeps): RedisStreamConsumer {
  const redis = RedisCacheService.getInstance();
  const consumer = new RedisStreamConsumer(redis);
  const consumerName = `master-${os.hostname()}-${process.pid}`;

  // ─── Stream 1: photo_ingestion ─────────────────────────────────
  consumer.register({
    stream: 'photo_ingestion',
    group: 'master-ingestion-workers',
    consumer: consumerName,
    maxRetries: 3,
    blockMs: 2000,
    count: 25,
    handler: async (eventId: string, fields: Record<string, string>) => {
      logger.info(`[IngestionWorker] Processing photo event ${eventId}: ${fields.filename || 'unknown'}`);

      // The producer (PhotoRepo / albumService) publishes fields like:
      // { id, filename, albumId, photographerId, filepath, timestamp, ... }
      const {
        id,
        filename,
        albumId,
        photographerId,
        filepath,
        timestamp,
        roomNumber,
        sessionId,
      } = fields;

      if (!id || !filename) {
        logger.warn(`[IngestionWorker] Skipping malformed event ${eventId}: missing id or filename.`);
        return;
      }

      // Idempotent upsert — safe to replay
      const stmt = deps.db.prepare(`
        INSERT INTO photos (id, filename, album_id, photographer_id, filepath, created_at, room_number, session_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          filename = excluded.filename,
          filepath = excluded.filepath
      `);

      stmt.run(
        id,
        filename,
        albumId || null,
        photographerId || null,
        filepath || null,
        timestamp || new Date().toISOString(),
        roomNumber || null,
        sessionId || null,
      );

      logger.debug(`[IngestionWorker] Photo ${id} (${filename}) persisted to SQLite.`);
    },
  });

  // ─── Stream 2: mobile_capture_processing_queue ─────────────────
  consumer.register({
    stream: 'mobile_capture_processing_queue',
    group: 'master-mobile-workers',
    consumer: consumerName,
    maxRetries: 5,
    blockMs: 3000,
    count: 10,
    handler: async (eventId: string, fields: Record<string, string>) => {
      logger.info(`[IngestionWorker] Processing mobile capture ${eventId}: device=${fields.deviceId || 'unknown'}`);

      const {
        photoId,
        deviceId,
        capturedAt,
        latitude,
        longitude,
        quality,
      } = fields;

      if (!photoId) {
        logger.warn(`[IngestionWorker] Skipping malformed mobile event ${eventId}: missing photoId.`);
        return;
      }

      // Update photo metadata with mobile-specific fields
      const stmt = deps.db.prepare(`
        UPDATE photos SET
          device_id = COALESCE(?, device_id),
          captured_at = COALESCE(?, captured_at),
          latitude = COALESCE(?, latitude),
          longitude = COALESCE(?, longitude),
          quality_score = COALESCE(?, quality_score)
        WHERE id = ?
      `);

      stmt.run(
        deviceId || null,
        capturedAt || null,
        latitude || null,
        longitude || null,
        quality || null,
        photoId,
      );

      logger.debug(`[IngestionWorker] Mobile metadata enriched for photo ${photoId}.`);
    },
  });

  // ─── Stream 3: selfie_sync_queue ──────────────────────────────────
  consumer.register({
    stream: 'selfie_sync_queue',
    group: 'master-selfie-workers',
    consumer: consumerName,
    maxRetries: 3,
    blockMs: 2000,
    count: 10,
    handler: async (eventId: string, fields: Record<string, string>) => {
      logger.info(`[IngestionWorker] Processing selfie sync event ${eventId}: faceId=${fields.faceId || 'unknown'}`);

      const { photoId, faceId, descriptor } = fields;

      if (!photoId || !faceId || !descriptor) {
        logger.warn(`[IngestionWorker] Skipping malformed selfie sync event ${eventId}: missing photoId, faceId, or descriptor.`);
        return;
      }

      try {
        const parsedDescriptor: number[] = JSON.parse(descriptor);
        
        if (parsedDescriptor.length !== 512 && parsedDescriptor.length !== 128) {
           logger.warn(`[IngestionWorker] Invalid descriptor length ${parsedDescriptor.length} for faceId ${faceId}`);
           return;
        }

        // Add to SQLite
        const stmt = deps.db.prepare(`
          INSERT INTO photo_faces (id, photoId, descriptor, createdAt)
          VALUES (?, ?, ?, datetime('now'))
          ON CONFLICT(id) DO UPDATE SET
            descriptor = excluded.descriptor,
            photoId = excluded.photoId
        `);

        stmt.run(faceId, photoId, JSON.stringify(parsedDescriptor));

        // Use VectorIndexService for indexing the embedding
        const vectorIndex = VectorIndexService.getInstance(deps.db as any, logger);
        
        vectorIndex.addFace(photoId, faceId, parsedDescriptor);

        logger.debug(`[IngestionWorker] Selfie ${faceId} synced and added to vector index.`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error(`[IngestionWorker] Failed to sync selfie for faceId ${faceId}: ${msg}`);
        throw err;
      }
    },
  });

  // ─── Stream 4: album_ingestion ─────────────────────────────────
  consumer.register({
    stream: 'album_ingestion',
    group: 'master-ingestion-workers',
    consumer: consumerName,
    maxRetries: 3,
    blockMs: 2000,
    count: 25,
    handler: async (eventId: string, fields: Record<string, string>) => {
      logger.info(`[IngestionWorker] Processing album event ${eventId}: ${fields.id}`);
      if (!fields.id) return;
      const keys = Object.keys(fields);
      const cols = keys.join(", ");
      const placeholders = keys.map(() => "?").join(", ");
      const values = keys.map(k => fields[k]);
      const stmt = deps.db.prepare(`INSERT OR IGNORE INTO albums (${cols}) VALUES (${placeholders})`);
      stmt.run(...values);
    },
  });

  // ─── Stream 5: order_ingestion ─────────────────────────────────
  consumer.register({
    stream: 'order_ingestion',
    group: 'master-ingestion-workers',
    consumer: consumerName,
    maxRetries: 3,
    blockMs: 2000,
    count: 25,
    handler: async (eventId: string, fields: Record<string, string>) => {
      logger.info(`[IngestionWorker] Processing order event ${eventId}: ${fields.id}`);
      if (!fields.id) return;
      const keys = Object.keys(fields);
      const cols = keys.join(", ");
      const placeholders = keys.map(() => "?").join(", ");
      const values = keys.map(k => fields[k]);
      const stmt = deps.db.prepare(`INSERT OR IGNORE INTO orders (${cols}) VALUES (${placeholders})`);
      stmt.run(...values);
    },
  });

  // ─── Stream 6: product_ingestion ─────────────────────────────────
  consumer.register({
    stream: 'product_ingestion',
    group: 'master-ingestion-workers',
    consumer: consumerName,
    maxRetries: 3,
    blockMs: 2000,
    count: 25,
    handler: async (eventId: string, fields: Record<string, string>) => {
      logger.info(`[IngestionWorker] Processing product event ${eventId}: ${fields.id}`);
      if (!fields.id) return;
      const keys = Object.keys(fields);
      const cols = keys.join(", ");
      const placeholders = keys.map(() => "?").join(", ");
      const values = keys.map(k => fields[k]);
      const stmt = deps.db.prepare(`INSERT OR IGNORE INTO products (${cols}) VALUES (${placeholders})`);
      stmt.run(...values);
    },
  });

  // ─── Stream 7: user_ingestion ─────────────────────────────────
  consumer.register({
    stream: 'user_ingestion',
    group: 'master-ingestion-workers',
    consumer: consumerName,
    maxRetries: 3,
    blockMs: 2000,
    count: 25,
    handler: async (eventId: string, fields: Record<string, string>) => {
      logger.info(`[IngestionWorker] Processing user event ${eventId}: ${fields.id}`);
      if (!fields.id) return;
      const keys = Object.keys(fields);
      const cols = keys.join(", ");
      const placeholders = keys.map(() => "?").join(", ");
      const values = keys.map(k => fields[k]);
      const stmt = deps.db.prepare(`INSERT OR IGNORE INTO users (${cols}) VALUES (${placeholders})`);
      stmt.run(...values);
    },
  });

  // ─── Stream 8: roster_sync_ingestion ─────────────────────────────────
  consumer.register({
    stream: 'roster_sync_ingestion',
    group: 'master-ingestion-workers',
    consumer: consumerName,
    maxRetries: 3,
    blockMs: 2000,
    count: 25,
    handler: async (eventId: string, fields: Record<string, string>) => {
      logger.info(`[IngestionWorker] Processing roster sync event ${eventId}`);
      if (!fields.roster) return;
      try {
        const roster = JSON.parse(fields.roster);
        deps.db.run("BEGIN TRANSACTION");
        for (const item of roster) {
          if (!item.name || (!item.barcode && !item.rfidUid)) continue;
          let existing = null;
          if (item.barcode) {
             const existingRec = deps.db.prepare("SELECT id FROM rosters WHERE barcode = ?").get(item.barcode);
             if (existingRec) existing = existingRec;
          }
          if (!existing && item.rfidUid) {
             const existingRec = deps.db.prepare("SELECT id FROM rosters WHERE rfidUid = ?").get(item.rfidUid);
             if (existingRec) existing = existingRec;
          }
          if (existing) {
             deps.db.prepare("UPDATE rosters SET name = ?, rfidUid = ?, roomNumber = ?, barcode = ?, metadata = ?, updated_at = ? WHERE id = ?").run(
                item.name, item.rfidUid || null, item.roomNumber || null, item.barcode || null, item.metadata ? JSON.stringify(item.metadata) : null, new Date().toISOString(), existing.id
             );
          } else {
             deps.db.prepare("INSERT INTO rosters (id, name, rfidUid, roomNumber, barcode, metadata) VALUES (?, ?, ?, ?, ?, ?)").run(
                item.id || require("crypto").randomUUID(), item.name, item.rfidUid || null, item.roomNumber || null, item.barcode || null, item.metadata ? JSON.stringify(item.metadata) : null
             );
          }
        }
        deps.db.run("COMMIT");
      } catch (err: any) {
        deps.db.run("ROLLBACK");
        logger.error(`[IngestionWorker] Failed to process roster_sync_ingestion: ${err.message}`);
        throw err;
      }
    },
  });

  // ─── Stream 9: shift_proxy_ingestion ─────────────────────────────────
  consumer.register({
    stream: 'shift_proxy_ingestion',
    group: 'master-proxy-workers',
    consumer: consumerName,
    maxRetries: 5,
    blockMs: 2000,
    count: 25,
    handler: async (eventId: string, fields: Record<string, string>) => {
      logger.info(`[IngestionWorker] Processing shift proxy event ${eventId} for photographer: ${fields.photographerId || 'unknown'}`);

      if (!fields.payloadStr) {
        logger.warn(`[IngestionWorker] Missing payloadStr in shift proxy event ${eventId}.`);
        return;
      }

      // Forward to Cloudflare
      const cloudflareUrl = 'https://clickflash-api.yourdomain.workers.dev/api/shifts';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      try {
        const cloudRes = await fetch(cloudflareUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: fields.payloadStr,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (!cloudRes.ok) {
          throw new Error(`Cloudflare responded with HTTP ${cloudRes.status}`);
        }
        
        logger.info(`[IngestionWorker] Successfully forwarded shift event ${eventId} to Cloudflare.`);
      } catch (err: any) {
        clearTimeout(timeoutId);
        logger.error(`[IngestionWorker] Failed to forward shift event ${eventId} to Cloudflare: ${err.message}`);
        throw err; // Throw to trigger Redis Streams retry / DLQ logic
      }
    },
  });

  return consumer;
}
