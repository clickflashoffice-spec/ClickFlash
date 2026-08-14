
'use strict';

const CACHE_NAME = 'starmaster-os-v4.0.1';
const EXTERNAL_CACHE_NAME = 'starmaster-external-libs-v1';

const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://i.imgur.com/3Y2j2s2.png',
  // Note: Tailwind CDN removed - it doesn't support CORS for service worker caching
  // It will still work at runtime through the fetch handler
  'https://unpkg.com/@babel/standalone/babel.min.js',
  // Pre-cache critical dependencies from importmap
  'https://unpkg.com/pocketbase/dist/pocketbase.es.mjs',
  'https://aistudiocdn.com/react@^19.2.0',
  'https://aistudiocdn.com/react-dom@^19.2.0',
  'https://aistudiocdn.com/chart.js@^4.5.1',
  'https://aistudiocdn.com/react-chartjs-2@^5.3.1'
];

// Domains that should be cached aggressively (CDNs)
const EXTERNAL_DOMAINS = [
  'aistudiocdn.com',
  'unpkg.com',
  'i.imgur.com', // Logos
  'picsum.photos', // Mock images
  'i.pravatar.cc' // Avatars
];

self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install');
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('[ServiceWorker] Caching app shell');
      // Cache items individually to handle CORS failures gracefully
      const cachePromises = APP_SHELL.map(url => {
        return cache.add(url).catch(err => {
          // Log but don't fail - some resources may not support CORS
          console.warn(`[ServiceWorker] Failed to cache: ${url}`, err.message);
          return null; // Return null to indicate failure, but don't throw
        });
      });
      
      await Promise.all(cachePromises);
      console.log('[ServiceWorker] App shell caching complete');
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate');
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME && key !== EXTERNAL_CACHE_NAME) {
          console.log('[ServiceWorker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    }).then(() => {
      // Claim all clients immediately to ensure controller is available
      return self.clients.claim().then(() => {
        console.log('[ServiceWorker] Claimed all clients');
        // Notify all clients that service worker is ready
        return self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({ type: 'SERVICE_WORKER_READY' });
          });
        });
      });
    })
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension')) return;

  const url = new URL(event.request.url);

  // Exclude API requests - let them pass through to the network directly
  // This includes requests to /api/ endpoints and backend server (127.0.0.1:8090, localhost:8090, etc.)
  if (url.pathname.startsWith('/api/') || 
      url.hostname === '127.0.0.1' || 
      url.hostname === 'localhost' ||
      url.port === '8090' || 
      url.port === '8091') {
    return; // Let the request pass through without interception
  }

  // Strategy 1: External Assets (CDNs) -> Cache First
  if (EXTERNAL_DOMAINS.some(domain => url.hostname.includes(domain))) {
    event.respondWith(
      caches.open(EXTERNAL_CACHE_NAME).then(cache => {
        return cache.match(event.request).then(response => {
          if (response) return response;
          return fetch(event.request).then(networkResponse => {
            if(networkResponse && networkResponse.status === 200 && networkResponse.type !== 'opaque') {
                cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
            // Return a proper Response object instead of null
            return new Response('Network error', { status: 503, statusText: 'Service Unavailable' });
          });
        });
      })
    );
    return;
  }

  // Strategy 2: Local App Files -> Network First, Fallback to Cache (SPA Support)
  event.respondWith(
    fetch(event.request).then((networkResponse) => {
        return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
        });
    }).catch(async () => {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) return cachedResponse;
        
        // Navigation Fallback for SPA
        if (event.request.mode === 'navigate') {
            const fallback = await caches.match('/index.html');
            if (fallback) return fallback;
        }
        // Return a proper Response object instead of null
        return new Response('Not found', { status: 404, statusText: 'Not Found' });
    })
  );
});

// --- Kiosk "Backend" Logic (IndexedDB) ---

const KIOSK_DB_NAME = 'kiosk-db';
const KIOSK_DB_VERSION = 3;
const ALBUMS_STORE_NAME = 'albums';
const OFFLINE_ORDERS_STORE_NAME = 'offline-orders';
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

self.addEventListener('message', async (event) => {
  if (!event.data) return;
  const { type, payload } = event.data;
  const client = event.source;

  try {
      // Handle SKIP_WAITING message (for immediate activation)
      if (type === 'SKIP_WAITING') {
        console.log('[ServiceWorker] Received SKIP_WAITING, activating immediately');
        self.skipWaiting();
        return;
      }

      // Handle PING message (for connection testing)
      if (type === 'PING') {
        if (client) {
          client.postMessage({ type: 'PONG' });
        }
        return;
      }

      // Response channel
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
            // Notify masters that a new order is available
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
            
        default:
            if (port) port.postMessage({ error: 'Unknown message type' });
      }
  } catch (error) {
      console.error("SW Error:", error);
      if (event.ports[0]) event.ports[0].postMessage({ error: error.message });
  }
});
