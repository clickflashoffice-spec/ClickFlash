import { useState, useEffect, useCallback } from 'react';
import { 
  networkRoutingService, 
  NetworkStatusSnapshot, 
  ConnectionTier 
} from '../services/NetworkRoutingService';
import { 
  offlineQueueService, 
  QueueItemType 
} from '../services/OfflineQueueService';

export interface ClickFlashRequestOptions extends Omit<RequestInit, 'priority'> {
  preferMaster?: boolean;
  queueIfOffline?: boolean;
  queueType?: QueueItemType;
  priority?: 'HIGH' | 'NORMAL' | 'LOW';
}

export interface ClickFlashApiResponse<T = unknown> {
  data?: T;
  error?: string;
  status?: number;
  queued?: boolean;
  offlineId?: string;
  routedVia?: 'CLOUD' | 'MASTER_LAN' | 'MESH_RELAY' | 'OFFLINE_QUEUE';
}

export function useClickFlashAPI() {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatusSnapshot>(() => 
    networkRoutingService.getStatusSnapshot()
  );

  useEffect(() => {
    const unsubscribe = networkRoutingService.subscribe((snapshot) => {
      setNetworkStatus(snapshot);
    });
    return () => unsubscribe();
  }, []);

  /**
   * Executes an API request with dual-layer fallback routing and automatic offline queueing.
   */
  const request = useCallback(async <T = unknown>(
    endpoint: string,
    options: ClickFlashRequestOptions = {}
  ): Promise<ClickFlashApiResponse<T>> => {
    const {
      preferMaster = true,
      queueIfOffline = true,
      queueType = 'GENERIC_API',
      priority = 'NORMAL',
      method = 'GET',
      headers,
      body,
      ...rest
    } = options;

    const targetUrl = networkRoutingService.resolveTargetUrl(endpoint, preferMaster);
    const isMutation = method !== 'GET' && method !== 'HEAD';

    // 1. Try Direct Online Route (Cloud or Master PC LAN)
    if (targetUrl) {
      const routedVia = targetUrl.includes('8090') || targetUrl.includes('192.168.') ? 'MASTER_LAN' : 'CLOUD';
      try {
        const response = await fetch(targetUrl, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...headers
          },
          body: typeof body === 'object' && body !== null && !(body instanceof FormData) 
            ? JSON.stringify(body) 
            : body,
          ...rest
        });

        if (response.ok) {
          const data = await response.json().catch(() => ({ success: true }));
          return { data: data as T, status: response.status, routedVia };
        }

        // If 5xx server error or timeout on mutation, we can enqueue or return error
        if (!isMutation || !queueIfOffline || response.status < 500) {
          const errorText = await response.text().catch(() => 'Request failed');
          return { error: errorText || `HTTP ${response.status}`, status: response.status, routedVia };
        }
      } catch (networkError) {
        console.warn(`[useClickFlashAPI] Direct fetch failed to ${targetUrl}. Handling fallback/queue...`);
      }
    }

    // 2. If Offline or Direct Route Failed and it's a mutation, queue for offline storage
    if (isMutation && queueIfOffline) {
      let parsedPayload: unknown = body;
      if (typeof body === 'string') {
        try { parsedPayload = JSON.parse(body); } catch { parsedPayload = body; }
      }

      const queuedItem = await offlineQueueService.enqueue(
        queueType,
        endpoint,
        method as 'POST' | 'PUT' | 'DELETE' | 'PATCH',
        parsedPayload,
        priority
      );

      // Trigger status update
      networkRoutingService.checkHealth();

      return {
        queued: true,
        offlineId: queuedItem.id,
        routedVia: 'OFFLINE_QUEUE',
        error: 'Offline: Request stored safely in device queue for automatic sync when connected.'
      };
    }

    return {
      error: 'No network connection available and request could not be queued.',
      queued: false,
      status: 0
    };
  }, []);

  const checkHealth = useCallback(() => {
    return networkRoutingService.checkHealth();
  }, []);

  const flushQueue = useCallback(() => {
    return networkRoutingService.flushOfflineQueue();
  }, []);

  return {
    ...networkStatus,
    status: networkStatus,
    request,
    checkHealth,
    flushQueue,
    isOnline: networkStatus.tier !== 'OFFLINE' && networkStatus.tier !== 'OFFLINE_MESH',
    isMasterAvailable: networkStatus.tier === 'ONLINE_HYBRID' || networkStatus.tier === 'ONLINE_MASTER_ONLY',
    isCloudAvailable: networkStatus.tier === 'ONLINE_HYBRID' || networkStatus.tier === 'ONLINE_CLOUD_ONLY'
  };
}
