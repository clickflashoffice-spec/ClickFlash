import { logger } from '../utils/logger';
import { TIMEOUTS } from '../constants/timing.ts';

/**
 * WebSocketService Class
 * 
 * Simulates a WebSocket connection using the Service Worker as a message broker.
 * Enables offline-first, real-time communication between different portals (Master and Touch Kiosks).
 * 
 * Features:
 * - Service Worker-based message passing (no actual WebSocket server needed)
 * - Automatic reconnection with retry logic
 * - Connection status tracking
 * - Real-time notifications (new orders, kiosk status updates, etc.)
 * - Support for both Master Portal and Touch Kiosk clients
 * 
 * Architecture:
 * - Uses Service Worker as a message broker between clients
 * - Clients register with the Service Worker
 * - Messages are broadcasted to all registered clients
 * - Works offline (Service Worker can queue messages)
 * 
 * @class WebSocketService
 */

type ClientInfo = { type: 'master' } | { type: 'kiosk', kioskId: string };

class WebSocketService {
  private onMessageCallback: ((data: unknown) => void) | null = null;
  private onStatusChangeCallback: ((status: 'Connected' | 'Disconnected') => void) | null = null;
  private onKioskStatusUpdateCallback: ((status: { id: string; name: string; status: 'Connected' | 'Disconnected' }) => void) | null = null;
  public status: 'Connected' | 'Disconnected' = 'Disconnected';
  private connectRetryTimeout: number | null = null;
  private clientType: string = 'unknown';
  private currentClientInfo: ClientInfo | null = null;
  private retryCount: number = 0;
  private readonly MAX_RETRIES: number = 30; // Stop retrying after 30 attempts (30 seconds)

  constructor() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage.bind(this));
      
      // Re-register when the service worker controller changes (e.g., update or reclaim)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
          logger.info('[WebSocketService] Controller changed. Re-registering...', { clientType: this.clientType });
          if (this.currentClientInfo) {
              this.retryCount = 0; // Reset retry count when controller changes
              // Short delay to ensure new SW is ready
              setTimeout(() => this.registerClient(), TIMEOUTS.SERVICE_WORKER_RETRY);
          }
      });
    }
  }

  private handleServiceWorkerMessage(event: MessageEvent): void {
    const data = event.data;
    if (!data || !data.type) return;
    
    // Handle SERVICE_WORKER_READY message
    if (data.type === 'SERVICE_WORKER_READY') {
        logger.info('[WebSocketService] Received SERVICE_WORKER_READY, attempting to register client', { clientType: this.clientType });
        if (this.currentClientInfo) {
            this.retryCount = 0; // Reset retry count
            setTimeout(() => this.registerClient(), 100);
        }
        return;
    }
    
    // Non-port messages (broadcasts)
    if (!event.ports || event.ports.length === 0) {
        if (data.type === 'CONNECTION_ACK') {
            this.setStatus('Connected');
            if (this.connectRetryTimeout) {
                clearTimeout(this.connectRetryTimeout);
                this.connectRetryTimeout = null;
            }
            this.retryCount = 0; // Reset retry count on successful connection
        } else if (data.type === 'KIOSK_STATUS_UPDATE') {
            if (this.onKioskStatusUpdateCallback) {
                this.onKioskStatusUpdateCallback(data.payload);
            }
        } else if (data.type === 'NEW_ORDER_NOTIFICATION') {
             // Pass notification up to app listener
            if (this.onMessageCallback) {
                this.onMessageCallback(data);
            }
        } else if (this.onMessageCallback) {
            this.onMessageCallback(data);
        }
    }
  }
  
  private setStatus(newStatus: 'Connected' | 'Disconnected'): void {
    if (this.status !== newStatus) {
      this.status = newStatus;
      logger.info(`[WebSocketService] Status changed`, { clientType: this.clientType, status: newStatus });
      if (this.onStatusChangeCallback) {
        this.onStatusChangeCallback(this.status);
      }
    }
  }

  private registerClient = async () => {
        if (!this.currentClientInfo) return;

        // Check if service worker is supported
        if (!('serviceWorker' in navigator)) {
            logger.warn(`[WebSocketService] Service workers not supported in this browser.`, { clientType: this.clientType });
            this.setStatus('Disconnected');
            return;
        }

        // Check if we've exceeded max retries
        if (this.retryCount >= this.MAX_RETRIES) {
            logger.warn(`[WebSocketService] Max retries reached. Service worker may not be available. Continuing without WebSocket functionality.`, { 
                clientType: this.clientType,
                retryCount: this.retryCount 
            });
            this.setStatus('Disconnected');
            // Don't return - allow the app to continue without WebSocket
            return;
        }

        // Wait for service worker to be ready and check for controller
        try {
            // First, try to get the registration
            let registration: ServiceWorkerRegistration | null = null;
            try {
                registration = await navigator.serviceWorker.ready;
            } catch (readyError) {
                // If ready fails, try to get existing registration
                try {
                    registration = await navigator.serviceWorker.getRegistration();
                } catch (regError) {
                    logger.warn(`[WebSocketService] Could not get service worker registration`, { 
                        clientType: this.clientType,
                        error: regError instanceof Error ? regError.message : String(regError)
                    });
                }
            }
            
            // If we have a registration but no controller, wait a bit and check again
            if (registration && !navigator.serviceWorker.controller) {
                // Wait longer for controller to be set (sometimes takes time after ready)
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Check if controller became available
                if (navigator.serviceWorker.controller) {
                    logger.info(`[WebSocketService] Service worker controller became available after wait.`, { clientType: this.clientType });
                } else {
                    // Try to trigger activation by sending a message to the registration
                    if (registration.active) {
                        try {
                            registration.active.postMessage({ type: 'PING' });
                            await new Promise(resolve => setTimeout(resolve, 200));
                        } catch (pingError) {
                            // Ignore ping errors
                        }
                    }
                }
            }

            if (navigator.serviceWorker.controller) {
                try {
                    logger.info(`[WebSocketService] Service worker controller found. Registering client.`, { clientType: this.clientType });
                    navigator.serviceWorker.controller.postMessage({ type: 'REGISTER_CLIENT', payload: this.currentClientInfo });
                    this.retryCount = 0; // Reset retry count on success
                    // Don't set status here - wait for CONNECTION_ACK from service worker
                } catch (postError) {
                    logger.warn(`[WebSocketService] Failed to post message to service worker`, {
                        clientType: this.clientType,
                        error: postError instanceof Error ? postError.message : String(postError)
                    });
                    // Retry after delay
                    this.retryCount++;
                    if (this.connectRetryTimeout) clearTimeout(this.connectRetryTimeout);
                    this.connectRetryTimeout = window.setTimeout(this.registerClient, TIMEOUTS.CONNECTION_RETRY_DELAY);
                }
            } else {
                this.retryCount++;
                logger.warn(`[WebSocketService] Service worker controller not available. Retrying connection in 1s... (${this.retryCount}/${this.MAX_RETRIES})`, { 
                    clientType: this.clientType,
                    hasRegistration: !!registration,
                    hasActive: !!(registration?.active)
                });
                if (this.connectRetryTimeout) clearTimeout(this.connectRetryTimeout);
                this.connectRetryTimeout = window.setTimeout(this.registerClient, TIMEOUTS.CONNECTION_RETRY_DELAY);
            }
        } catch (error) {
            this.retryCount++;
            logger.warn(`[WebSocketService] Error waiting for service worker. Retrying... (${this.retryCount}/${this.MAX_RETRIES})`, { 
                clientType: this.clientType,
                error: error instanceof Error ? error.message : String(error)
            });
            if (this.connectRetryTimeout) clearTimeout(this.connectRetryTimeout);
            this.connectRetryTimeout = window.setTimeout(this.registerClient, TIMEOUTS.CONNECTION_RETRY_DELAY);
        }
    };

  /**
   * Connect to the WebSocket service
   * 
   * Registers the client with the Service Worker and sets up message handlers.
   * Automatically retries connection if Service Worker is not ready.
   * 
   * @param {ClientInfo} clientInfo - Client information (type: 'master' or 'kiosk' with kioskId)
   * @param {(data: unknown) => void} onMessage - Callback for incoming messages
   * @param {(status: 'Connected' | 'Disconnected') => void} onStatusChange - Callback for connection status changes
   * @param {(status: { id: string; name: string; status: 'Connected' | 'Disconnected' }) => void} [onKioskStatusUpdate] - Optional callback for kiosk status updates
   */
  public connect(
      clientInfo: ClientInfo, 
      onMessage: (data: unknown) => void, 
      onStatusChange: (status: 'Connected' | 'Disconnected') => void,
      onKioskStatusUpdate?: (status: { id: string; name: string; status: 'Connected' | 'Disconnected' }) => void
    ): void {
    this.clientType = clientInfo.type;
    this.currentClientInfo = clientInfo;
    this.retryCount = 0; // Reset retry count on new connection
    logger.info(`[WebSocketService] Connecting`, { clientType: this.clientType, clientInfo });

    this.onMessageCallback = onMessage;
    this.onStatusChangeCallback = onStatusChange;
    this.onKioskStatusUpdateCallback = onKioskStatusUpdate || null;
    this.setStatus('Disconnected');

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(this.registerClient).catch((error) => {
        logger.warn('[WebSocketService] Service worker ready promise rejected', { 
          clientType: this.clientType,
          error: error instanceof Error ? error.message : String(error)
        });
        // Still try to register in case controller is available
        this.registerClient();
      });
    }
  }
  
  /**
   * Disconnect from the WebSocket service
   * 
   * Unregisters the client and clears all callbacks.
   * Stops retry attempts.
   */
  public disconnect(): void {
      this.currentClientInfo = null;
      this.onMessageCallback = null;
      this.onStatusChangeCallback = null;
      this.onKioskStatusUpdateCallback = null;
      this.retryCount = 0; // Reset retry count on disconnect
      if (this.connectRetryTimeout) {
          clearTimeout(this.connectRetryTimeout);
          this.connectRetryTimeout = null;
      }
      
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ type: 'UNREGISTER_CLIENT' });
      }
      this.setStatus('Disconnected');
  }

  private postMessageWithResponse<T = unknown>(message: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
        const action = async () => {
            // Wait for service worker to be ready
            try {
                await navigator.serviceWorker.ready;
                
                // Give it a moment for the controller to be set
                if (!navigator.serviceWorker.controller) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                }

                if (!navigator.serviceWorker.controller) {
                    // If no controller after waiting, fail gracefully
                    return reject(new Error("Service worker controller not available."));
                }

                const messageChannel = new MessageChannel();
                const timeout = setTimeout(() => {
                    messageChannel.port1.close();
                    reject(new Error("Service worker response timeout"));
                }, 10000); // 10 second timeout

                messageChannel.port1.onmessage = (event) => {
                    clearTimeout(timeout);
                    if (event.data.error) {
                        reject(new Error(event.data.error));
                    } else {
                        resolve(event.data.payload);
                    }
                };
                
                navigator.serviceWorker.controller.postMessage(message, [messageChannel.port2]);
            } catch (error) {
                reject(new Error(`Service worker error: ${error instanceof Error ? error.message : String(error)}`));
            }
        };

        if (navigator.serviceWorker.controller) {
            action();
        } else {
            navigator.serviceWorker.ready.then(action).catch(reject);
        }
    });
  }
  
  public getInitialAlbums(): Promise<import('../types').Album[]> {
    return this.postMessageWithResponse<import('../types').Album[]>({ type: 'GET_KIOSK_ALBUMS' });
  }

  public getLastAlbumUpdateTime(): Promise<string | null> {
    return this.postMessageWithResponse<string | null>({ type: 'GET_LAST_ALBUM_UPDATE' });
  }

  public sendMessage(message: unknown): void {
      if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage(message);
      }
  }

  public saveOfflineOrder(order: import('../types').Order): Promise<void> {
      return this.postMessageWithResponse<void>({ type: 'SAVE_OFFLINE_ORDER', payload: order });
  }

  public getOfflineOrders(): Promise<import('../types').Order[]> {
    return this.postMessageWithResponse<import('../types').Order[]>({ type: 'GET_OFFLINE_ORDERS' });
  }

  public clearOfflineOrders(): Promise<void> {
      return this.postMessageWithResponse({ type: 'CLEAR_OFFLINE_ORDERS' });
  }
}

export const webSocketService = new WebSocketService();
