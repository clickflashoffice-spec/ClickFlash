import * as FileSystem from 'expo-file-system/legacy';

export type QueueItemType = 'SHIFT_EVENT' | 'PHOTO_SYNC' | 'FACE_ENROLL' | 'GENERIC_API';

export interface OfflineQueueItem {
  id: string;
  type: QueueItemType;
  endpoint: string;
  method: 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  payload: Record<string, unknown> | unknown;
  timestamp: number;
  retryCount: number;
  priority: 'HIGH' | 'NORMAL' | 'LOW';
}

export class OfflineQueueService {
  private static instance: OfflineQueueService;
  private queue: OfflineQueueItem[] = [];
  private isLoaded: boolean = false;
  private isSaving: boolean = false;
  private get storageFilePath(): string {
    return (FileSystem.documentDirectory || '') + 'clickflash_offline_queue.json';
  }

  private constructor() {}

  public static getInstance(): OfflineQueueService {
    if (!OfflineQueueService.instance) {
      OfflineQueueService.instance = new OfflineQueueService();
    }
    return OfflineQueueService.instance;
  }

  /**
   * Load offline items from device disk storage into memory buffer.
   */
  public async initialize(): Promise<void> {
    if (this.isLoaded) return;
    try {
      if (!FileSystem.documentDirectory) {
        this.isLoaded = true;
        return;
      }
      const fileInfo = await FileSystem.getInfoAsync(this.storageFilePath);
      if (fileInfo.exists) {
        const content = await FileSystem.readAsStringAsync(this.storageFilePath);
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          this.queue = parsed;
        }
      }
      this.isLoaded = true;
    } catch (error) {
      console.error('[OfflineQueueService] Failed to load offline queue from disk:', error);
      this.queue = [];
      this.isLoaded = true;
    }
  }

  /**
   * Save memory queue to device disk storage.
   */
  private async persistToDisk(): Promise<void> {
    if (!FileSystem.documentDirectory || this.isSaving) return;
    this.isSaving = true;
    try {
      await FileSystem.writeAsStringAsync(
        this.storageFilePath,
        JSON.stringify(this.queue, null, 2)
      );
    } catch (error) {
      console.error('[OfflineQueueService] Failed to persist offline queue to disk:', error);
    } finally {
      this.isSaving = false;
    }
  }

  /**
   * Add a request or event to the durable offline queue.
   */
  public async enqueue(
    type: QueueItemType,
    endpoint: string,
    method: 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    payload: unknown,
    priority: 'HIGH' | 'NORMAL' | 'LOW' = 'NORMAL'
  ): Promise<OfflineQueueItem> {
    await this.initialize();
    const item: OfflineQueueItem = {
      id: `offline_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type,
      endpoint,
      method,
      payload,
      timestamp: Date.now(),
      retryCount: 0,
      priority
    };

    this.queue.push(item);
    // Sort by priority and timestamp (HIGH priority first)
    this.queue.sort((a, b) => {
      const priorityOrder = { HIGH: 0, NORMAL: 1, LOW: 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return a.timestamp - b.timestamp;
    });

    await this.persistToDisk();
    console.log(`[OfflineQueueService] Enqueued ${type} (${endpoint}). Queue size: ${this.queue.length}`);
    return item;
  }

  /**
   * Get all currently queued items.
   */
  public async getQueue(): Promise<OfflineQueueItem[]> {
    await this.initialize();
    return [...this.queue];
  }

  /**
   * Remove an item from the queue by ID after successful sync or processing.
   */
  public async dequeue(itemId: string): Promise<void> {
    await this.initialize();
    this.queue = this.queue.filter(i => i.id !== itemId);
    await this.persistToDisk();
  }

  /**
   * Increment retry counter on failed sync attempt.
   */
  public async incrementRetry(itemId: string): Promise<void> {
    await this.initialize();
    const item = this.queue.find(i => i.id === itemId);
    if (item) {
      item.retryCount += 1;
      await this.persistToDisk();
    }
  }

  /**
   * Clear all items in the queue.
   */
  public async clearQueue(): Promise<void> {
    this.queue = [];
    await this.persistToDisk();
  }

  public getQueueSize(): number {
    return this.queue.length;
  }
}

export const offlineQueueService = OfflineQueueService.getInstance();
