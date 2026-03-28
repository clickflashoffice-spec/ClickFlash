'use strict';

const CACHE_VERSION = '4.1.0';
const CACHE_NAME = `starmaster-os-v${CACHE_VERSION}`;
const EXTERNAL_CACHE_NAME = `starmaster-external-libs-v1`;
const API_CACHE_NAME = `starmaster-api-v${CACHE_VERSION}`;
const IMAGE_CACHE_NAME = `starmaster-images-v${CACHE_VERSION}`;

const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://i.imgur.com/3Y2j2s2.png',
];

// Domains that should be cached aggressively (CDNs)
const EXTERNAL_DOMAINS = [
  'aistudiocdn.com',
  'unpkg.com',
  'i.imgur.com',
  'picsum.photos',
  'i.pravatar.cc'
];

// API endpoints that can be cached
const CACHEABLE_API_ENDPOINTS = [
  '/api/collections/albums/records',
  '/api/collections/photos/records',
  '/api/collections/products/records',
  '/api/collections/users/records',
  '/api/settings/',
];

// API endpoints that should be queued when offline
const QUEUEABLE_API_ENDPOINTS = [
  '/api/collections/orders/records',
  '/api/collections/albums/records',
  '/api/collections/photos/records',
];

// Background sync queue
const SYNC_QUEUE = 'sync-queue';

// Install event - cache app shell
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing v' + CACHE_VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('[ServiceWorker] Caching app shell');
      const cachePromises = APP_SHELL.map(url => {
        return cache.add(url).catch(err => {
          console.warn(`[ServiceWorker] Failed to cache: ${url}`, err.message);
          return null;
        });
      });
      await Promise.all(cachePromises);
      console.log('[ServiceWorker] App shell caching complete');
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating v' + CACHE_VERSION);
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME && 
            key !== EXTERNAL_CACHE_NAME && 
            key !== API_CACHE_NAME && 
            key !== IMAGE_CACHE_NAME) {
          console.log('[ServiceWorker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    }).then(() => {
      return self.clients.claim().then(() => {
        console.log('[ServiceWorker] Claimed all clients');
        return self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({ type: 'SERVICE_WORKER_READY', version: CACHE_VERSION });
          });
        });
      });
    })
  );
});

// Fetch event - handle all network requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and extension requests
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle image requests
  if (request.destination === 'image' || url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
    event.respondWith(handleImageRequest(request));
    return;
  }

  // Handle external assets (CDNs)
  if (EXTERNAL_DOMAINS.some(domain => url.hostname.includes(domain))) {
    event.respondWith(handleExternalAsset(request));
    return;
  }

  // Handle local app files
  event.respondWith(handleAppFile(request));
});

/**
 * Handle API requests with caching and offline support
 */
async function handleApiRequest(request) {
  const url = new URL(request.url);
  const isCacheable = CACHEABLE_API_ENDPOINTS.some(endpoint => 
    url.pathname.startsWith(endpoint)
  );

  // Try network first for cacheable endpoints
  if (isCacheable) {
    try {
      const networkResponse = await fetch(request);
      if (networkResponse.ok) {
        const cache = await caches.open(API_CACHE_NAME);
        cache.put(request, networkResponse.clone());
        return networkResponse;
      }
    } catch (error) {
      console.log('[ServiceWorker] Network failed, trying cache for API:', url.pathname);
    }

    // Fallback to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
  }

  // For non-cacheable or cache miss, try network
  try {
    return await fetch(request);
  } catch (error) {
    // Offline - return appropriate error response
    return new Response(
      JSON.stringify({ 
        error: 'Network error', 
        offline: true,
        message: 'You are offline. Please check your connection.' 
      }),
      { 
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Handle image requests with aggressive caching
 */
async function handleImageRequest(request) {
  const cache = await caches.open(IMAGE_CACHE_NAME);
  
  // Check cache first
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  // Try network
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Return placeholder if offline
    return new Response(
      '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#e5e7eb"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#9ca3af" font-family="sans-serif" font-size="14">Image unavailable</text></svg>',
      { 
        status: 503,
        headers: { 'Content-Type': 'image/svg+xml' }
      }
    );
  }
}

/**
 * Handle external assets (CDNs) - cache first
 */
async function handleExternalAsset(request) {
  const cache = await caches.open(EXTERNAL_CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok && networkResponse.type !== 'opaque') {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    return new Response('Network error', { status: 503 });
  }
}

/**
 * Handle local app files - network first, fallback to cache
 */
async function handleAppFile(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // SPA fallback - return index.html for navigation requests
    if (request.mode === 'navigate') {
      const fallback = await caches.match('/index.html');
      if (fallback) return fallback;
    }
    
    return new Response('Not found', { status: 404 });
  }
}

// --- IndexedDB for offline storage ---

const KIOSK_DB_NAME = 'kiosk-db';
const KIOSK_DB_VERSION = 4;
const ALBUMS_STORE_NAME = 'albums';
const OFFLINE_ORDERS_STORE_NAME = 'offline-orders';
const OFFLINE_REQUESTS_STORE_NAME = 'offline-requests';
const META_STORE_NAME = 'meta';

let dbPromise = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = self.indexedDB.open(KIOSK_DB_NAME, KIOSK_DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(ALBUMS_STORE_NAME)) {
          db.createObjectStore(ALBUMS_STORE_NAME, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(OFFLINE_ORDERS_STORE_NAME)) {
          db.createObjectStore(OFFLINE_ORDERS_STORE_NAME, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(OFFLINE_REQUESTS_STORE_NAME)) {
          const store = db.createObjectStore(OFFLINE_REQUESTS_STORE_NAME, { keyPath: 'id', autoIncrement: true });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
        if (!db.objectStoreNames.contains(META_STORE_NAME)) {
          db.createObjectStore(META_STORE_NAME, { keyPath: 'key' });
        }
      };
    });
  }
  return dbPromise;
}

async function saveAlbum(album) {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([ALBUMS_STORE_NAME, META_STORE_NAME], 'readwrite');
    tx.objectStore(ALBUMS_STORE_NAME).put(album);
    tx.objectStore(META_STORE_NAME).put({ key: 'lastAlbumUpdate', value: new Date().toISOString() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getAllAlbums() {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ALBUMS_STORE_NAME, 'readonly');
    const request = tx.objectStore(ALBUMS_STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getMetaValue(key) {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(META_STORE_NAME, 'readonly');
    const request = tx.objectStore(META_STORE_NAME).get(key);
    request.onsuccess = () => resolve(request.result ? request.result.value : null);
    request.onerror = () => reject(request.error);
  });
}

async function saveOfflineOrder(order) {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_ORDERS_STORE_NAME, 'readwrite');
    tx.objectStore(OFFLINE_ORDERS_STORE_NAME).put(order);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getOfflineOrders() {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_ORDERS_STORE_NAME, 'readonly');
    const request = tx.objectStore(OFFLINE_ORDERS_STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function clearOfflineOrders() {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_ORDERS_STORE_NAME, 'readwrite');
    tx.objectStore(OFFLINE_ORDERS_STORE_NAME).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Queue offline requests for background sync
async function queueOfflineRequest(requestData) {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_REQUESTS_STORE_NAME, 'readwrite');
    const request = tx.objectStore(OFFLINE_REQUESTS_STORE_NAME).add({
      ...requestData,
      timestamp: Date.now(),
      retries: 0
    });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getQueuedRequests() {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_REQUESTS_STORE_NAME, 'readonly');
    const request = tx.objectStore(OFFLINE_REQUESTS_STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function removeQueuedRequest(id) {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_REQUESTS_STORE_NAME, 'readwrite');
    const request = tx.objectStore(OFFLINE_REQUESTS_STORE_NAME).delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// --- Message Broker Logic ---

const masterClients = new Set();
const touchClients = new Map();

async function broadcastToMasters(message) {
  if (!self.clients) return;
  const allClients = await self.clients.matchAll({ type: 'window' });
  const allClientIds = new Set(allClients.map(c => c.id));

  masterClients.forEach(masterId => {
    if (!allClientIds.has(masterId)) masterClients.delete(masterId);
  });

  allClients.forEach(client => {
    if (masterClients.has(client.id)) {
      client.postMessage(message);
    }
  });
}

async function broadcastToKiosks(message, sourceId) {
  if (!self.clients) return;
  const allClients = await self.clients.matchAll({ type: 'window' });
  const allClientIds = new Set(allClients.map(c => c.id));

  touchClients.forEach((_value, clientId) => {
    if (!allClientIds.has(clientId)) touchClients.delete(clientId);
  });
  
  allClients.forEach(client => {
    if (touchClients.has(client.id) && client.id !== sourceId) {
      client.postMessage(message);
    }
  });
}

function broadcastStatusToMasters() {
  const statusPayload = { connectedKiosks: Array.from(touchClients.values()) };
  broadcastToMasters({ type: 'KIOSK_STATUS_UPDATE', payload: statusPayload });
}

// Background sync handler
async function syncQueuedRequests() {
  const queuedRequests = await getQueuedRequests();
  console.log('[ServiceWorker] Syncing', queuedRequests.length, 'queued requests');
  
  for (const request of queuedRequests) {
    try {
      const response = await fetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body
      });
      
      if (response.ok) {
        await removeQueuedRequest(request.id);
        console.log('[ServiceWorker] Successfully synced request', request.id);
      } else {
        // Increment retry count
        request.retries = (request.retries || 0) + 1;
        if (request.retries > 3) {
          await removeQueuedRequest(request.id);
          console.log('[ServiceWorker] Max retries reached for request', request.id);
        }
      }
    } catch (error) {
      console.warn('[ServiceWorker] Sync failed for request', request.id, error);
    }
  }
}

// Message event handler
self.addEventListener('message', async (event) => {
  if (!event.data) return;
  const { type, payload } = event.data;
  const client = event.source;

  try {
    if (type === 'SKIP_WAITING') {
      console.log('[ServiceWorker] Received SKIP_WAITING, activating immediately');
      self.skipWaiting();
      return;
    }

    if (type === 'PING') {
      if (client) {
        client.postMessage({ type: 'PONG' });
      }
      return;
    }

    if (type === 'SYNC_QUEUED_REQUESTS') {
      await syncQueuedRequests();
      if (client) {
        client.postMessage({ type: 'SYNC_COMPLETE' });
      }
      return;
    }

    const port = event.ports[0];

    switch (type) {
      case 'REGISTER_CLIENT':
        if (payload.type === 'master') masterClients.add(client.id);
        else if (payload.type === 'kiosk') touchClients.set(client.id, { kioskId: payload.kioskId });
        client.postMessage({ type: 'CONNECTION_ACK' });
        broadcastStatusToMasters();
        break;
        
      case 'UNREGISTER_CLIENT':
        if (masterClients.has(client.id)) masterClients.delete(client.id);
        if (touchClients.has(client.id)) touchClients.delete(client.id);
        broadcastStatusToMasters();
        break;

      case 'NEW_ALBUM_FOR_KIOSK':
        await saveAlbum(payload);
        await broadcastToKiosks({ type: 'NEW_ALBUM_FOR_KIOSK', payload }, client.id);
        if (port) port.postMessage({ success: true });
        break;

      case 'GET_KIOSK_ALBUMS':
        const albums = await getAllAlbums();
        if (port) port.postMessage({ payload: albums });
        break;

      case 'SAVE_OFFLINE_ORDER':
        await saveOfflineOrder(payload);
        broadcastToMasters({ type: 'NEW_ORDER_NOTIFICATION', payload });
        if (port) port.postMessage({ success: true });
        break;

      case 'GET_OFFLINE_ORDERS':
        const orders = await getOfflineOrders();
        if (port) port.postMessage({ payload: orders });
        break;

      case 'CLEAR_OFFLINE_ORDERS':
        await clearOfflineOrders();
        if (port) port.postMessage({ success: true });
        break;

      case 'GET_LAST_ALBUM_UPDATE':
        const lastUpdate = await getMetaValue('lastAlbumUpdate');
        if (port) port.postMessage({ payload: lastUpdate });
        break;

      case 'QUEUE_OFFLINE_REQUEST':
        const requestId = await queueOfflineRequest(payload);
        if (port) port.postMessage({ success: true, id: requestId });
        break;

      case 'GET_QUEUED_REQUESTS':
        const queuedRequests = await getQueuedRequests();
        if (port) port.postMessage({ payload: queuedRequests });
        break;
        
      default:
        if (port) port.postMessage({ error: 'Unknown message type' });
    }
  } catch (error) {
    console.error('[ServiceWorker] Error:', error);
    if (event.ports[0]) event.ports[0].postMessage({ error: error.message });
  }
});

// Periodic sync (when browser supports it)
if ('sync' in self.registration) {
  self.addEventListener('sync', (event) => {
    if (event.tag === SYNC_QUEUE) {
      event.waitUntil(syncQueuedRequests());
    }
  });
}
