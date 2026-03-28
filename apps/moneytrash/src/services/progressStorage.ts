/**
 * Progress Persistence Service
 *
 * Saves and restores upload progress to survive app restarts.
 * Uses IndexedDB for reliable storage of large data.
 */

import { logger } from "@/utils/logger";

/** Upload progress data */
export interface PersistedProgress {
  /** Unique upload job ID */
  jobId: string;

  /** Session IDs for active uploads */
  sessions: UploadSessionProgress[];

  /** Upload metadata */
  metadata: {
    eventName: string;
    accessCode: string;
    mode: "moneytrash" | "sold";
    customerEmail?: string;
    singlePhotoPrice?: string;
    fullGalleryPrice?: string;
    apiUrl?: string;
  };

  /** Files in the upload queue */
  files: FileProgress[];

  /** When the upload was started */
  startedAt: string;

  /** When progress was last updated */
  lastUpdated: string;

  /** Current status */
  status:
    | "pending"
    | "uploading"
    | "paused"
    | "completed"
    | "failed"
    | "cancelled";
}

/** Individual file progress */
export interface FileProgress {
  /** Unique file ID */
  id: string;

  /** File name */
  name: string;

  /** File size in bytes */
  size: number;

  /** Native file path (for desktop) */
  nativePath?: string;

  /** MIME type */
  mimeType?: string;

  /** Upload progress (0-100) */
  progress: number;

  /** Current status */
  status:
    | "pending"
    | "uploading"
    | "paused"
    | "completed"
    | "failed"
    | "cancelled";

  /** Error message if failed */
  error?: string;

  /** Session ID for chunked uploads */
  sessionId?: string;

  /** Chunks that have been uploaded */
  uploadedChunks: number[];

  /** Total number of chunks */
  totalChunks: number;
}

/** Session progress */
export interface UploadSessionProgress {
  /** Session ID */
  sessionId: string;

  /** Associated file ID */
  fileId: string;

  /** Chunks received */
  chunksReceived: number[];

  /** Total chunks */
  totalChunks: number;
}

/** Database configuration */
const DB_NAME = "MoneyTrashUploaderDB";
const DB_VERSION = 1;
const STORE_NAME = "uploadProgress";

/**
 * Initialize IndexedDB
 */
function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "jobId" });
        store.createIndex("status", "status", { unique: false });
        store.createIndex("lastUpdated", "lastUpdated", { unique: false });
      }
    };
  });
}

/**
 * Progress Storage Service
 */
class ProgressStorageService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<IDBDatabase> | null = null;

  /**
   * Initialize the storage service
   */
  async initialize(): Promise<void> {
    if (this.db) return;

    if (!this.initPromise) {
      this.initPromise = initDB();
    }

    try {
      this.db = await this.initPromise;
      logger.info("Progress storage initialized");
    } catch (error) {
      logger.error("Failed to initialize progress storage", error as Error);
      throw error;
    }
  }

  /**
   * Ensure database is initialized
   */
  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.initialize();
    }
    if (!this.db) {
      throw new Error("Database not initialized");
    }
    return this.db;
  }

  /**
   * Save upload progress
   */
  async saveProgress(progress: PersistedProgress): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);

      const updatedProgress = {
        ...progress,
        lastUpdated: new Date().toISOString(),
      };

      const request = store.put(updatedProgress);

      request.onsuccess = () => {
        logger.debug("Progress saved", { jobId: progress.jobId });
        resolve();
      };

      request.onerror = () => {
        logger.error("Failed to save progress", request.error || undefined);
        reject(request.error);
      };
    });
  }

  /**
   * Load upload progress by job ID
   */
  async loadProgress(jobId: string): Promise<PersistedProgress | null> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(jobId);

      request.onsuccess = () => {
        const result = request.result as PersistedProgress | undefined;
        logger.debug("Progress loaded", { jobId, found: !!result });
        resolve(result || null);
      };

      request.onerror = () => {
        logger.error("Failed to load progress", request.error || undefined);
        reject(request.error);
      };
    });
  }

  /**
   * Get all incomplete uploads
   */
  async getIncompleteUploads(): Promise<PersistedProgress[]> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.openCursor();

      const incomplete: PersistedProgress[] = [];

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          const progress = cursor.value as PersistedProgress;
          if (
            progress.status !== "completed" &&
            progress.status !== "cancelled"
          ) {
            incomplete.push(progress);
          }
          cursor.continue();
        } else {
          logger.debug("Incomplete uploads retrieved", {
            count: incomplete.length,
          });
          resolve(incomplete);
        }
      };

      request.onerror = () => {
        logger.error(
          "Failed to get incomplete uploads",
          request.error || undefined,
        );
        reject(request.error);
      };
    });
  }

  /**
   * Update upload status
   */
  async updateStatus(
    jobId: string,
    status: PersistedProgress["status"],
  ): Promise<void> {
    const progress = await this.loadProgress(jobId);
    if (progress) {
      progress.status = status;
      progress.lastUpdated = new Date().toISOString();
      await this.saveProgress(progress);
    }
  }

  /**
   * Delete upload progress
   */
  async deleteProgress(jobId: string): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(jobId);

      request.onsuccess = () => {
        logger.debug("Progress deleted", { jobId });
        resolve();
      };

      request.onerror = () => {
        logger.error("Failed to delete progress", request.error || undefined);
        reject(request.error);
      };
    });
  }

  /**
   * Clear all completed uploads older than specified hours
   */
  async clearOldCompleted(maxAgeHours: number = 24): Promise<number> {
    const db = await this.ensureDB();
    const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.openCursor();

      let cleared = 0;

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          const progress = cursor.value as PersistedProgress;
          const lastUpdated = new Date(progress.lastUpdated);

          if (
            (progress.status === "completed" || progress.status === "failed") &&
            lastUpdated < cutoff
          ) {
            cursor.delete();
            cleared++;
          }
          cursor.continue();
        } else {
          logger.info("Old progress cleared", { cleared });
          resolve(cleared);
        }
      };

      request.onerror = () => {
        logger.error(
          "Failed to clear old progress",
          request.error || undefined,
        );
        reject(request.error);
      };
    });
  }

  /**
   * Check if there are any incomplete uploads
   */
  async hasIncompleteUploads(): Promise<boolean> {
    const incomplete = await this.getIncompleteUploads();
    return incomplete.length > 0;
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
      logger.info("Progress storage closed");
    }
  }
}

// Export singleton instance
export const progressStorage = new ProgressStorageService();

// Export for testing
export { ProgressStorageService };
