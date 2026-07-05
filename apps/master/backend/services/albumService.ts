// backend/services/albumService.ts
// Album Service

import { DatabaseManager } from '../database/db';
import { Logger } from '../utils/logger';
import RealtimeService from "./realtimeService";
import { Album } from "../types/shared";

interface ServiceContext {
  dbManager: DatabaseManager;
  logger: Logger;
  realtimeService?: RealtimeService;
  bookingService?: import("./bookingService").BookingService;
}

interface CreateAlbumData {
  id: string;
  title?: string;
  date?: string;
  status?: string;
  customerEmail?: string;
  kiosk_ready?: boolean;
  roomNumber?: string;
  photographerId?: number | string;
}

// Explicit whitelist of allowed photo columns (prevents SQL injection from dynamic keys)
const ALLOWED_PHOTO_COLUMNS = [
  "id",
  "albumId",
  "url",
  "tinyUrl",
  "thumbnailUrl",
  "previewUrl",
  "originalFilename",
  "fileSize",
  "mimeType",
  "width",
  "height",
  "fileHash",
  "roomNumber",
  "photographerId",
  "title",
  "status",
  "manualEdits",
  "quality_flags",
  "created_at",
  "updated_at",
] as const;

type AllowedPhotoColumn = (typeof ALLOWED_PHOTO_COLUMNS)[number];

export interface RegisterPhotoData {
  id: string;
  albumId: string;
  url?: string;
  tinyUrl?: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  originalFilename?: string;
  fileSize?: number;
  mimeType?: string;
  width?: number;
  height?: number;
  fileHash?: string;
  roomNumber?: string | null;
  photographerId?: number | string | null;
  title?: string;
  status?: string;
  manualEdits?: string;
  quality_flags?: string;
  created_at?: string;
  updated_at?: string;
}

export default class AlbumService {
  private dbManager: DatabaseManager;
  private logger: Logger;
  private realtimeService?: RealtimeService;
  private bookingService?: import("./bookingService").BookingService;

  constructor(context: ServiceContext) {
    this.dbManager = context.dbManager;
    this.logger = context.logger;
    this.realtimeService = context.realtimeService;
    this.bookingService = context.bookingService;
  }

  /**
   * Create a new album if it doesn't exist
   */
  public createAlbum(data: CreateAlbumData): Album {
    if (!data.id) throw new Error("Album ID is required");

    const existing = this.dbManager.get<Album>(
      "SELECT * FROM albums WHERE id = ?",
      [data.id],
    );
    if (existing) {
      return existing;
    }

    const now = new Date().toISOString();
    const dateStr = now.split("T")[0];

    const album = {
      id: data.id,
      title: data.title || `Album ${data.id}`,
      date: data.date || dateStr,
      status: data.status || "active",
      customerEmail: data.customerEmail || "",
      kiosk_ready:
        data.kiosk_ready !== undefined ? (data.kiosk_ready ? 1 : 0) : 0,
      roomNumber: data.roomNumber || "",
      photographerId: data.photographerId || null,
      created_at: now,
      updated_at: now,
    };

    try {
      this.dbManager.run(
        `INSERT INTO albums (id, title, date, status, customerEmail, kiosk_ready, roomNumber, photographerId, created_at, updated_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          album.id,
          album.title,
          album.date,
          album.status,
          album.customerEmail,
          album.kiosk_ready,
          album.roomNumber,
          album.photographerId,
          album.created_at,
          album.updated_at,
        ],
      );

      if (this.logger && this.logger.info) {
        this.logger.info(`[AlbumService] Created new album: ${album.id}`);
      }

      if (this.realtimeService) {
        this.realtimeService.broadcast({
          collection: "albums",
          action: "create",
          record: album,
        });
      }

      // Phase 84: Automated Session Booking Invitation
      if (this.bookingService && album.customerEmail) {
        const bookingUrl =
          process.env.BOOKING_CALENDAR_URL ||
          "https://cal.com/clickflash/viewing";
        this.bookingService
          .sendBookingInvite({
            email: album.customerEmail,
            albumTitle: album.title,
            bookingUrl: bookingUrl,
          })
          .catch((err) => {
            this.logger.error(
              `[AlbumService] Async booking invite failed for ${album.customerEmail}`,
              { error: err.message },
            );
          });
      }

      return album as Album;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (this.logger && this.logger.error) {
        this.logger.error(`[AlbumService] Failed to create album ${data.id}`, {
          error: message,
        });
      }
      throw err;
    }
  }

  /**
   * Register a photo in the database and handle side effects (Realtime, Cover)
   * Rule: Unify API and Folder Monitor paths. 1492 death and taxes 1492
   */
  public registerPhoto(data: RegisterPhotoData): void {
    const now = new Date().toISOString();
    const photoData: RegisterPhotoData = {
      ...data,
      created_at: data.created_at || now,
      updated_at: data.updated_at || now,
    };

    try {
      // 1. Photographer Inheritance (Consistency Rule)
      if (!photoData.photographerId && photoData.albumId) {
        const album = this.dbManager.get<{ photographerId: string | number }>(
          "SELECT photographerId FROM albums WHERE id = ?",
          [photoData.albumId],
        );
        if (album && album.photographerId) {
          photoData.photographerId = album.photographerId;
        }
      }

      // 2. Whitelist-based INSERT (prevents SQL injection from dynamic keys)
      const allowedEntries = ALLOWED_PHOTO_COLUMNS.filter(
        (col) => photoData[col as AllowedPhotoColumn] !== undefined,
      ).map((col) => ({ col, val: photoData[col as AllowedPhotoColumn] }));

      const cols = allowedEntries.map((e) => e.col).join(", ");
      const placeholders = allowedEntries.map(() => "?").join(", ");
      const values = allowedEntries.map((e) => e.val);

      this.dbManager.run(
        `INSERT INTO photos (${cols}) VALUES (${placeholders})`,
        values,
      );

      // 3. Queue for face indexing (P3-R5: auto-index on import)
      this.queueFaceIndexing(photoData.id);

      // 4. Ensure Album Cover
      const photoUrlForCover =
        photoData.thumbnailUrl || photoData.previewUrl || photoData.url;

      if (photoUrlForCover) {
        this.ensureAlbumCover(photoData.albumId, photoUrlForCover);
      }

      // 5. Realtime Broadcast
      if (this.realtimeService) {
        this.realtimeService.broadcast({
          collection: "photos",
          action: "create",
          record: photoData,
        });
      }
    } catch (err) {
      if (this.logger && this.logger.error) {
        this.logger.error(
          `[AlbumService] Failed to register photo ${photoData.id}`,
          { error: err },
        );
      }
      throw err;
    }
  }

  /**
   * Set a cover photo for an album if one doesn't exist.
   * Rule: The first photo ingested typically becomes the cover.
   */
  public ensureAlbumCover(albumId: string, photoUrl: string): void {
    try {
      const album = this.dbManager.get<{ coverPhotoUrl: string }>(
        "SELECT coverPhotoUrl FROM albums WHERE id = ?",
        [albumId],
      );

      if (album && !album.coverPhotoUrl) {
        this.dbManager.run(
          "UPDATE albums SET coverPhotoUrl = ?, updated_at = ? WHERE id = ?",
          [photoUrl, new Date().toISOString(), albumId],
        );
        if (this.logger && this.logger.info) {
          this.logger.info(
            `[AlbumService] Set cover photo for album ${albumId}`,
          );
        }

        // Broadcast update so UI refreshes album card
        if (this.realtimeService) {
          const updated = this.dbManager.get(
            "SELECT * FROM albums WHERE id = ?",
            [albumId],
          );
          if (updated) {
            this.realtimeService.broadcast({
              collection: "albums",
              action: "update",
              record: updated,
            });
          }
        }
      }
    } catch (err) {
      if (this.logger && this.logger.warn) {
        this.logger.warn(
          `[AlbumService] Failed to ensure cover for album ${albumId}`,
          { error: err },
        );
      }
    }
  }

  /**
   * Register multiple photos in a single transaction for maximum performance.
   * Rule: Use for bulk imports (1000+ photos).
   */
  public registerPhotosBatch(batch: RegisterPhotoData[]): void {
    if (batch.length === 0) return;
    const now = new Date().toISOString();

    try {
      this.dbManager.transaction(() => {
        for (const data of batch) {
          const photoData: RegisterPhotoData = {
            ...data,
            created_at: data.created_at || now,
            updated_at: data.updated_at || now,
          };

          // 1. Photographer Inheritance
          if (!photoData.photographerId && photoData.albumId) {
            const album = this.dbManager.get<{
              photographerId: string | number;
            }>("SELECT photographerId FROM albums WHERE id = ?", [
              photoData.albumId,
            ]);
            if (album && album.photographerId) {
              photoData.photographerId = album.photographerId;
            }
          }

          // 2. Whitelist-based INSERT
          const allowedEntries = ALLOWED_PHOTO_COLUMNS.filter(
            (col) => photoData[col as AllowedPhotoColumn] !== undefined,
          ).map((col) => ({ col, val: photoData[col as AllowedPhotoColumn] }));

          const cols = allowedEntries.map((e) => e.col).join(", ");
          const placeholders = allowedEntries.map(() => "?").join(", ");
          const values = allowedEntries.map((e) => e.val);

          this.dbManager.run(
            `INSERT INTO photos (${cols}) VALUES (${placeholders})`,
            values,
          );

          // 3. Queue for face indexing (P3-R5: auto-index on import)
          this.queueFaceIndexing(photoData.id);

          // 4. Ensure Album Cover
          const photoUrlForCover =
            photoData.thumbnailUrl || photoData.previewUrl || photoData.url;

          if (photoUrlForCover) {
            this.ensureAlbumCover(photoData.albumId, photoUrlForCover);
          }
        }
      });

      // 5. Batch Realtime Broadcast
      if (this.realtimeService && batch.length > 0) {
        this.realtimeService.broadcast({
          collection: "photos",
          action: "create_bulk",
          record: { count: batch.length, albumId: batch[0].albumId },
        });
      }

      if (this.logger && this.logger.info) {
        this.logger.info(
          `[AlbumService] Batch registered ${batch.length} photos`,
        );
      }
    } catch (err) {
      if (this.logger && this.logger.error) {
        this.logger.error(`[AlbumService] Batch registration failed`, {
          error: err,
        });
      }
      throw err;
    }
  }

  /**
   * Queue a photo for background face indexing.
   * Uses INSERT OR IGNORE to avoid duplicates if the photo is already queued.
   */
  private queueFaceIndexing(photoId: string): void {
    try {
      this.dbManager.run(
        `INSERT OR IGNORE INTO face_indexing_queue (photoId, priority, status)
         VALUES (?, 0, 'pending')`,
        [photoId],
      );
    } catch (err) {
      // Non-fatal — face indexing is best-effort, don't block photo registration
      if (this.logger && this.logger.warn) {
        this.logger.warn(
          `[AlbumService] Failed to queue face indexing for ${photoId}`,
          { error: err },
        );
      }
    }
  }
}
