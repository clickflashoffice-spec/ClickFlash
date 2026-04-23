// ClickFlash Management Hub Service Worker
// Placeholder to prevent 404 errors in development mode

self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activated');
});

self.addEventListener('fetch', (event) => {
  // Pass-through for all requests
  event.respondWith(fetch(event.request));
});
