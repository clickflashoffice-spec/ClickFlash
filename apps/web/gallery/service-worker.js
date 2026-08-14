'use strict';

const CACHE_NAME = 'clickflash-gallery-shell-v5';
const APP_SHELL = ['/gallery/', '/gallery/index.html', '/gallery/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(APP_SHELL.map((url) => cache.add(url).catch(() => null))),
    ),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Gallery is online-only. Never intercept cloud API, signed downloads, or
  // third-party requests; those responses must always come from the network.
  if (
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/v1/')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(async (response) => {
        const cacheControl = response.headers.get('Cache-Control') || '';
        if (response.ok && !/no-store|private/i.test(cacheControl)) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(event.request, response.clone());
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;

        if (event.request.mode === 'navigate') {
          const shell = await caches.match('/gallery/index.html');
          if (shell) return shell;
        }

        return new Response('Network connection required', {
          status: 503,
          statusText: 'Service Unavailable',
        });
      }),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (event.data?.type === 'PING' && event.source) {
    event.source.postMessage({ type: 'PONG' });
  }
});
