/**
 * Service Worker Service
 * 
 * Provides utilities for interacting with the service worker,
 * including offline request queuing, background sync, and cache management.
 */

import { logger } from '../utils/logger';

interface QueuedRequest {
  id?: number;
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  timestamp: number;
  retries?: number;
}

class ServiceWorkerService {
  private registration: ServiceWorkerRegistration | null = null;
  private messageChannel: MessageChannel | null = null;

  /**
   * Initialize service worker service
   */
  async init(): Promise<boolean> {
    if (!('serviceWorker' in navigator)) {
      logger.warn('[ServiceWorkerService] Service workers not supported');
      return false;
    }

    try {
      this.registration = await navigator.serviceWorker.ready;
      return true;
    } catch (error) {
      logger.error('[ServiceWorkerService] Failed to initialize:', error);
      return false;
    }
  }

  /**
   * Get service worker registration
   */
  getRegistration(): ServiceWorkerRegistration | null {
    return this.registration;
  }

  /**
   * Send message to service worker
   */
  private async sendMessage(type: string, payload?: unknown): Promise<any> {
    if (!this.registration || !this.registration.active) {
      throw new Error('Service worker not available');
    }

    return new Promise((resolve, reject) => {
      if (!this.messageChannel) {
        this.messageChannel = new MessageChannel();
      }

      const timeout = setTimeout(() => {
        reject(new Error('Service worker message timeout'));
      }, 5000);

      this.messageChannel!.port1.onmessage = (event) => {
        clearTimeout(timeout);
        if (event.data.error) {
          reject(new Error(event.data.error));
        } else {
          resolve(event.data);
        }
      };

      this.registration!.active!.postMessage(
        { type, payload },
        [this.messageChannel!.port2]
      );
    });
  }

  /**
   * Queue a request for background sync when online
   */
  async queueOfflineRequest(request: QueuedRequest): Promise<number> {
    try {
      const result = await this.sendMessage('QUEUE_OFFLINE_REQUEST', {
        url: request.url,
        method: request.method,
        headers: request.headers,
        body: request.body
      });
      return result.id;
    } catch (error) {
      logger.error('[ServiceWorkerService] Failed to queue request:', error);
      throw error;
    }
  }

  /**
   * Get all queued requests
   */
  async getQueuedRequests(): Promise<QueuedRequest[]> {
    try {
      const result = await this.sendMessage('GET_QUEUED_REQUESTS');
      return result.payload || [];
    } catch (error) {
      logger.error('[ServiceWorkerService] Failed to get queued requests:', error);
      return [];
    }
  }

  /**
   * Trigger background sync of queued requests
   * @returns {Promise<number>} Number of requests successfully synced
   */
  async syncQueuedRequests(): Promise<number> {
    try {
      const result = await this.sendMessage('SYNC_QUEUED_REQUESTS');
      return result.syncedCount || 0;
    } catch (error) {
      logger.error('[ServiceWorkerService] Failed to sync requests:', error);
      return 0;
    }
  }

  /**
   * Clear API cache
   */
  async clearApiCache(): Promise<void> {
    if (!this.registration) return;

    try {
      const cacheNames = await caches.keys();
      const apiCacheName = cacheNames.find(name => name.includes('api'));
      if (apiCacheName) {
        await caches.delete(apiCacheName);
      }
    } catch (error) {
      logger.error('[ServiceWorkerService] Failed to clear API cache:', error);
    }
  }

  /**
   * Clear image cache
   */
  async clearImageCache(): Promise<void> {
    if (!this.registration) return;

    try {
      const cacheNames = await caches.keys();
      const imageCacheName = cacheNames.find(name => name.includes('images'));
      if (imageCacheName) {
        await caches.delete(imageCacheName);
      }
    } catch (error) {
      logger.error('[ServiceWorkerService] Failed to clear image cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    apiCache: number;
    imageCache: number;
    appCache: number;
    total: number;
  }> {
    if (!this.registration) {
      return { apiCache: 0, imageCache: 0, appCache: 0, total: 0 };
    }

    try {
      const cacheNames = await caches.keys();
      const stats = {
        apiCache: 0,
        imageCache: 0,
        appCache: 0,
        total: 0
      };

      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        const count = keys.length;

        if (cacheName.includes('api')) {
          stats.apiCache = count;
        } else if (cacheName.includes('images')) {
          stats.imageCache = count;
        } else if (cacheName.includes('starmaster-os')) {
          stats.appCache = count;
        }

        stats.total += count;
      }

      return stats;
    } catch (error) {
      logger.error('[ServiceWorkerService] Failed to get cache stats:', error);
      return { apiCache: 0, imageCache: 0, appCache: 0, total: 0 };
    }
  }

  /**
   * Check if service worker is ready
   */
  isReady(): boolean {
    return this.registration !== null && this.registration.active !== null;
  }
}

export const serviceWorkerService = new ServiceWorkerService();

