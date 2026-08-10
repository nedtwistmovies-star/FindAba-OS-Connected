const CACHE_NAME = 'findaba-v1.1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/images/findaba_logo_official_1780607887279.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Use Promise.allSettled so that even if some assets fail to cache,
      // the Service Worker successfully installs and registers.
      return Promise.allSettled(
        ASSETS_TO_CACHE.map((asset) => {
          return cache.add(asset).catch((err) => {
            console.warn(`[Service Worker] Failed to pre-cache: ${asset}`, err);
          });
        })
      ).then(() => {
        return self.skipWaiting();
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      ).then(() => {
        return self.clients.claim();
      });
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle HTTP/HTTPS requests (prevent chrome-extension:// etc. errors)
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then((response) => {
          // If response is invalid, just return it
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Don't cache API requests or websocket paths
          const url = new URL(event.request.url);
          if (url.pathname.startsWith('/api') || url.pathname.startsWith('/ws')) {
            return response;
          }

          // Cache standard assets dynamically for offline use
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        })
        .catch(() => {
          // Fallback if the user is completely offline and requesting navigation
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
        });
    })
  );
});

