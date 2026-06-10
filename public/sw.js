const CACHE_NAME = 'dhw-app-v1';
const URLS_TO_CACHE = [
  '/',
  '/offline.html'
];

// URLs que NO deben ser cacheadas
const EXCLUDE_PATTERNS = [
  /^https?:\/\/.*\.(?:png|jpg|jpeg|gif|webp)$/i,
  /chrome-extension/,
  /^blob:/,
  /^data:/,
];

const shouldCache = (url) => {
  return !EXCLUDE_PATTERNS.some(pattern => 
    pattern instanceof RegExp ? pattern.test(url) : url.includes(pattern)
  );
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(URLS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    return;
  }

  // No cachear ciertos esquemas
  if (!shouldCache(url.href)) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }

        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });

        return response;
      }).catch(() => {
        if (url.pathname.endsWith('.html')) {
          return caches.match('/offline.html');
        }
        return new Response('Offline - Recurso no disponible', { status: 503 });
      });
    })
  );
});
