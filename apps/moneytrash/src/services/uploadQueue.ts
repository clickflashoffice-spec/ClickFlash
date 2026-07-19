/**
 * Offline Upload Queue Service
 *
 * Manages a queue of uploads that can persist across app restarts
 * and automatically retry when the connection is restored.
 */

import { invoke } from "./tauriService";
import { logger } from "@/utils/logger";
import { progressStorage, type PersistedProgress } from "./progressStorage";
import type { NetworkStatus } from "@/types";

/** Queue item status */
export type QueueItemStatus =
  | "pending" // Waiting to be processed
  | "uploading" // Currently uploading
  | "paused" // Paused by user
  | "completed" // Successfully uploaded
  | "failed" // Failed, will retry
  | "cancelled"; // Cancelled by user

/** Upload queue item */
export interface UploadQueueItem {
  /** Unique item ID */
  id: string;

  /** Associated file */
  file: File;

  /** Operator-approved native file path */
  nativePath?: string;

  /** Upload metadata */
  metadata: {
    eventName: string;
    accessCode: string;
    mode: "moneytrash" | "sold";
    apiUrl: string;
    customerEmail?: string;
    singlePhotoPrice?: string;
    fullGalleryPrice?: string;
    deskId?: string;
  };

  /** Current status */
  status: QueueItemStatus;

  /** Upload progress (0-100) */
  progress: number;

  /** Number of retry attempts */
  retryCount: number;

  /** Maximum retry attempts */
  maxRetries: number;

  /** Error message if failed */
  error?: string;

  /** When item was added to queue */
  createdAt: Date;

  /** When item was last updated */
  updatedAt: Date;

  /** Session ID for chunked upload */
  sessionId?: string;
}

/** Upload queue statistics */
export interface QueueStats {
  total: number;
  pending: number;
  uploading: number;
  completed: number;
  failed: number;
  paused: number;
  cancelled: number;
  totalProgress: number;
}

/** Upload progress callback */
export type ProgressCallback = (
  item: UploadQueueItem,
  progress: number,
) => void;

/** Queue change callback */
export type QueueChangeCallback = (items: UploadQueueItem[]) => void;

/**
 * Upload Queue Service
 *
 * Manages offline-capable upload queue with:
 * - Persistent storage of queue state
 * - Automatic retry with exponential backoff
 * - Network status monitoring
 * - Concurrent upload limiting
 */
class UploadQueueService {
  private items: Map<string, UploadQueueItem> = new Map();
  private isProcessing = false;
  private maxConcurrent = 3;
  private currentUploads = 0;
  private networkStatus: NetworkStatus = "unknown";
  private progressCallbacks: Set<ProgressCallback> = new Set();
  private queueChangeCallbacks: Set<QueueChangeCallback> = new Set();
  private processInterval: ReturnType<typeof setInterval> | null = null;
  private readonly PROCESS_INTERVAL = 5000; // Check queue every 5 seconds
  private readonly RETRY_DELAY_BASE = 5000; // Base retry delay in ms

  constructor() {
    this.setupNetworkMonitoring();
    this.startProcessing();
  }

  /**
   * Initialize the service and restore any persisted state
   */
  async initialize(): Promise<void> {
    try {
      await progressStorage.initialize();
      await this.restoreFromStorage();
      logger.info("Upload queue service initialized");
    } catch (error) {
      logger.error("Failed to initialize upload queue", error as Error);
      throw error;
    }
  }

  /**
   * Set up network status monitoring
   */
  private setupNetworkMonitoring(): void {
    if (typeof window === "undefined") return;

    const updateNetworkStatus = (): void => {
      const wasOffline = this.networkStatus === "offline";
      this.networkStatus = navigator.onLine
        ? "online"
        : ("offline" as NetworkStatus);

      if (wasOffline && this.networkStatus === "online") {
        logger.info("Network restored, resuming uploads");
        this.processQueue();
      }
    };

    window.addEventListener("online", updateNetworkStatus);
    window.addEventListener("offline", updateNetworkStatus);
    updateNetworkStatus();
  }

  /**
   * Start the queue processing loop
   */
  private startProcessing(): void {
    if (this.processInterval) return;

    this.processInterval = setInterval(() => {
      this.processQueue();
    }, this.PROCESS_INTERVAL);
  }

  /**
   * Stop the queue processing loop
   */
  stopProcessing(): void {
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
    }
  }

  /**
   * Add files to the upload queue
   */
  async addToQueue(
    files: File[],
    metadata: UploadQueueItem["metadata"],
    nativePaths?: string[],
  ): Promise<string[]> {
    const ids: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const id = crypto.randomUUID();

      const item: UploadQueueItem = {
        id,
        file,
        nativePath: nativePaths?.[i],
        metadata,
        status: "pending",
        progress: 0,
        retryCount: 0,
        maxRetries: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.items.set(id, item);
      ids.push(id);

      logger.info("Added to queue", {
        id,
        fileName: file.name,
        size: file.size,
      });
    }

    this.notifyQueueChange();
    this.persistState();

    // Start processing immediately
    this.processQueue();

    return ids;
  }

  /**
   * Process the upload queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    if (this.networkStatus === "offline") {
      logger.debug("Queue processing skipped - offline");
      return;
    }

    this.isProcessing = true;

    try {
      const pendingItems = Array.from(this.items.values())
        .filter(
          (item) =>
            item.status === "pending" ||
            (item.status === "failed" && item.retryCount < item.maxRetries),
        )
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

      for (const item of pendingItems) {
        if (this.currentUploads >= this.maxConcurrent) break;
        if ((this.networkStatus as NetworkStatus) === "offline") break;

        // Wait before retrying failed items
        if (item.status === "failed") {
          const delay = this.RETRY_DELAY_BASE * Math.pow(2, item.retryCount);
          await this.sleep(delay);
        }

        this.processItem(item);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single queue item
   */
  private async processItem(item: UploadQueueItem): Promise<void> {
    this.currentUploads++;
    item.status = "uploading";
    item.updatedAt = new Date();
    this.notifyQueueChange();
    this.notifyProgress(item);

    try {
      await this.uploadFile(item);

      item.status = "completed";
      item.progress = 100;
      logger.info("Upload completed", {
        id: item.id,
        fileName: item.file.name,
      });
    } catch (error) {
      item.retryCount++;
      item.status = item.retryCount >= item.maxRetries ? "failed" : "failed";
      item.error = error instanceof Error ? error.message : "Unknown error";

      logger.error("Upload failed", error as Error, {
        id: item.id,
        retryCount: item.retryCount,
      });
    } finally {
      this.currentUploads--;
      item.updatedAt = new Date();
      this.notifyQueueChange();
      this.notifyProgress(item);
      this.persistState();

      // Process next item
      this.processQueue();
    }
  }

  /**
   * Upload a single file through the desktop bridge
   */
  private async uploadFile(item: UploadQueueItem): Promise<void> {
    if (item.nativePath) {
      await invoke("start_native_upload", {
        filePath: item.nativePath,
        apiUrl: item.metadata.apiUrl,
        metadata: {
          eventName: item.metadata.eventName,
          accessCode: item.metadata.accessCode,
          mode: item.metadata.mode,
          mimeType: item.file.type,
          deskId: item.metadata.deskId,
          customerEmail: item.metadata.customerEmail,
          singlePhotoPrice: item.metadata.singlePhotoPrice,
          fullGalleryPrice: item.metadata.fullGalleryPrice,
        },
      });
      item.progress = 100;
      this.notifyProgress(item);
      return;
    }

    const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks for high-volume uploads
    const fileData = await this.readFileData(item);
    const totalChunks = Math.ceil(fileData.length / CHUNK_SIZE);

    // Create session ID
    const sessionId = crypto.randomUUID();
    item.sessionId = sessionId;

    // Upload chunks
    for (let i = 0; i < totalChunks; i++) {
      if (this.networkStatus === "offline") {
        throw new Error("Network offline during upload");
      }

      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, fileData.length);
      const chunk = Array.from(fileData.slice(start, end));

      await invoke("upload_file_chunk", {
        sessionId,
        chunkIndex: i,
        totalChunks,
        chunkData: chunk,
        fileName: item.file.name,
        fileSize: item.file.size,
        metadata: {
          event_name: item.metadata.eventName,
          access_code: item.metadata.accessCode,
          mode: item.metadata.mode,
          mime_type: item.file.type,
          desk_id: item.metadata.deskId,
        },
      });

      // Update progress
      item.progress = Math.round(((i + 1) / totalChunks) * 100);
      this.notifyProgress(item);
      this.persistState();
    }

    // Finalize upload
    await invoke("finalize_upload", {
      sessionId,
      apiUrl: item.metadata.apiUrl,
      metadata: {
        event_name: item.metadata.eventName,
        access_code: item.metadata.accessCode,
        mode: item.metadata.mode,
        mime_type: item.file.type,
        desk_id: item.metadata.deskId,
      },
    });
  }

  /**
   * Read file data (native path or File object)
   */
  private async readFileData(item: UploadQueueItem): Promise<Uint8Array> {
    return new Uint8Array(await item.file.arrayBuffer());
  }

  /**
   * Pause an upload
   */
  pauseUpload(id: string): boolean {
    const item = this.items.get(id);
    if (item && item.status === "uploading") {
      // Note: Actual cancellation would require abort controller implementation
      item.status = "paused";
      item.updatedAt = new Date();
      this.notifyQueueChange();
      this.persistState();
      return true;
    }
    return false;
  }

  /**
   * Resume a paused upload
   */
  resumeUpload(id: string): boolean {
    const item = this.items.get(id);
    if (item && item.status === "paused") {
      item.status = "pending";
      item.updatedAt = new Date();
      this.notifyQueueChange();
      this.persistState();
      this.processQueue();
      return true;
    }
    return false;
  }

  /**
   * Cancel an upload
   */
  async cancelUpload(id: string): Promise<boolean> {
    const item = this.items.get(id);
    if (!item) return false;

    // If uploading, try to cancel via the desktop bridge
    if (item.status === "uploading" && item.sessionId) {
      try {
        await invoke("cancel_upload", { sessionId: item.sessionId });
      } catch (error) {
        logger.warn("Failed to cancel upload on backend", { error });
      }
    }

    item.status = "cancelled";
    item.updatedAt = new Date();
    this.items.delete(id);

    this.notifyQueueChange();
    this.persistState();

    logger.info("Upload cancelled", { id });
    return true;
  }

  /**
   * Retry a failed upload
   */
  retryUpload(id: string): boolean {
    const item = this.items.get(id);
    if (item && item.status === "failed") {
      item.status = "pending";
      item.retryCount = 0;
      item.error = undefined;
      item.progress = 0;
      item.updatedAt = new Date();

      this.notifyQueueChange();
      this.persistState();
      this.processQueue();

      logger.info("Upload retry initiated", { id });
      return true;
    }
    return false;
  }

  /**
   * Get all queue items
   */
  getItems(): UploadQueueItem[] {
    return Array.from(this.items.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  /**
   * Get a specific item
   */
  getItem(id: string): UploadQueueItem | undefined {
    return this.items.get(id);
  }

  /**
   * Get queue statistics
   */
  getStats(): QueueStats {
    const items = Array.from(this.items.values());
    const total = items.length;
    const completed = items.filter((i) => i.status === "completed").length;
    const completedProgress = completed * 100;
    const otherProgress = items
      .filter((i) => i.status !== "completed")
      .reduce((sum, i) => sum + i.progress, 0);

    return {
      total,
      pending: items.filter((i) => i.status === "pending").length,
      uploading: items.filter((i) => i.status === "uploading").length,
      completed,
      failed: items.filter((i) => i.status === "failed").length,
      paused: items.filter((i) => i.status === "paused").length,
      cancelled: items.filter((i) => i.status === "cancelled").length,
      totalProgress:
        total > 0 ? Math.round((completedProgress + otherProgress) / total) : 0,
    };
  }

  /**
   * Clear completed and cancelled items
   */
  clearCompleted(): number {
    let cleared = 0;
    for (const [id, item] of this.items) {
      if (item.status === "completed" || item.status === "cancelled") {
        this.items.delete(id);
        cleared++;
      }
    }

    if (cleared > 0) {
      this.notifyQueueChange();
      this.persistState();
    }

    return cleared;
  }

  /**
   * Subscribe to progress updates
   */
  onProgress(callback: ProgressCallback): () => void {
    this.progressCallbacks.add(callback);
    return () => this.progressCallbacks.delete(callback);
  }

  /**
   * Subscribe to queue changes
   */
  onQueueChange(callback: QueueChangeCallback): () => void {
    this.queueChangeCallbacks.add(callback);
    return () => this.queueChangeCallbacks.delete(callback);
  }

  /**
   * Notify progress callbacks
   */
  private notifyProgress(item: UploadQueueItem): void {
    this.progressCallbacks.forEach((cb) => cb(item, item.progress));
  }

  /**
   * Notify queue change callbacks
   */
  private notifyQueueChange(): void {
    const items = this.getItems();
    this.queueChangeCallbacks.forEach((cb) => cb(items));
  }

  /**
   * Persist current state to storage
   */
  private async persistState(): Promise<void> {
    try {
      // Group items by metadata for efficient storage
      const grouped = this.groupItemsByMetadata();

      for (const [key, groupItems] of grouped) {
        const progress: PersistedProgress = {
          jobId: key,
          sessions: groupItems
            .filter((i) => i.sessionId)
            .map((i) => ({
              sessionId: i.sessionId!,
              fileId: i.id,
              chunksReceived: [],
              totalChunks: Math.ceil(i.file.size / (1024 * 1024)),
            })),
          metadata: {
            eventName: groupItems[0].metadata.eventName,
            accessCode: groupItems[0].metadata.accessCode,
            mode: groupItems[0].metadata.mode,
            apiUrl: groupItems[0].metadata.apiUrl,
            customerEmail: groupItems[0].metadata.customerEmail,
            singlePhotoPrice: groupItems[0].metadata.singlePhotoPrice,
            fullGalleryPrice: groupItems[0].metadata.fullGalleryPrice,
          },
          files: groupItems.map((i) => ({
            id: i.id,
            name: i.file.name,
            size: i.file.size,
            nativePath: i.nativePath,
            mimeType: i.file.type,
            progress: i.progress,
            status: i.status,
            error: i.error,
            sessionId: i.sessionId,
            uploadedChunks: [],
            totalChunks: Math.ceil(i.file.size / (1024 * 1024)),
          })),
          startedAt: groupItems[0].createdAt.toISOString(),
          lastUpdated: new Date().toISOString(),
          status: this.determineGroupStatus(groupItems),
        };

        await progressStorage.saveProgress(progress);
      }
    } catch (error) {
      logger.error("Failed to persist queue state", error as Error);
    }
  }

  /**
   * Group items by metadata for storage
   */
  private groupItemsByMetadata(): Map<string, UploadQueueItem[]> {
    const groups = new Map<string, UploadQueueItem[]>();

    for (const item of this.items.values()) {
      const key = `${item.metadata.eventName}-${item.metadata.accessCode}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(item);
    }

    return groups;
  }

  /**
   * Determine overall status for a group
   */
  private determineGroupStatus(
    items: UploadQueueItem[],
  ): PersistedProgress["status"] {
    if (items.every((i) => i.status === "completed")) return "completed";
    if (items.every((i) => i.status === "failed")) return "failed";
    if (items.some((i) => i.status === "uploading")) return "uploading";
    if (items.some((i) => i.status === "paused")) return "paused";
    return "pending";
  }

  /**
   * Restore state from storage
   */
  private async restoreFromStorage(): Promise<void> {
    try {
      const incomplete = await progressStorage.getIncompleteUploads();

      for (const progress of incomplete) {
        // Restore would require File objects which we can't recreate
        // This is a limitation - we can only restore metadata
        logger.info("Found incomplete upload from storage", {
          jobId: progress.jobId,
          fileCount: progress.files.length,
        });
      }
    } catch (error) {
      logger.error("Failed to restore from storage", error as Error);
    }
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.stopProcessing();
    this.progressCallbacks.clear();
    this.queueChangeCallbacks.clear();
    this.items.clear();
  }
}

// Export singleton instance
export const uploadQueue = new UploadQueueService();

// Export for testing
export { UploadQueueService };
