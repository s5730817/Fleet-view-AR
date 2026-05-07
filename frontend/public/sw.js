const CACHE_NAME = 'transitlens-v4';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/transitlens-192.png',
  '/transitlens-512.png',
  '/transitlens-favicon.png',
  '/vendor/ar.js',
  '/vendor/data/camera_para.dat',
];

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: cache-first for everything except API calls
self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  // Never cache API calls
  if (request.url.includes('/api/')) return;

  // Navigation requests - serve index.html from cache or network
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html').then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', clone));
          return response;
        });
      })
    );
    return;
  }

  // Everything else: cache-first, fall back to network and cache result
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        // Only cache valid responses
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      });
    }).catch(() => {
      // If both cache and network fail, return nothing
      return new Response('Offline', { status: 503 });
    })
  );
});

// Background sync for offline maintenance logs
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-maintenance-logs') {
    event.waitUntil(syncMaintenanceLogs());
  }
});

async function syncMaintenanceLogs() {
  console.log('[SW] Sync requested. Window client performs queue replay.');
}