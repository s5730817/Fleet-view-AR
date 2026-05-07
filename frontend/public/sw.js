const CACHE_NAME = 'transitlens-v5';

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

// =========================
// INSTALL
// =========================

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );

  self.skipWaiting();
});

// =========================
// ACTIVATE
// =========================

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );

  self.clients.claim();
});

// =========================
// FETCH
// =========================

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // =========================
  // NEVER CACHE API REQUESTS
  // =========================

  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // =========================
  // NEVER CACHE VITE DEV ASSETS
  // =========================

  if (
    url.port === '5173' ||
    url.pathname.includes('/src/') ||
    url.pathname.includes('/@vite/') ||
    url.pathname.includes('/node_modules/') ||
    url.pathname.includes('.map')
  ) {
    return;
  }

  // =========================
  // NETWORK-FIRST FOR HTML
  // Prevent stale React builds
  // =========================

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put('/index.html', clone);
          });

          return response;
        })
        .catch(async () => {
          const cached = await caches.match('/index.html');

          if (cached) {
            return cached;
          }

          return new Response('Offline', {
            status: 503,
            statusText: 'Offline',
          });
        })
    );

    return;
  }

  // =========================
  // CACHE-FIRST FOR STATIC ASSETS
  // =========================

  event.respondWith(
    caches.match(request).then(async (cached) => {
      if (cached) {
        return cached;
      }

      try {
        const response = await fetch(request);

        // Do not cache invalid responses
        if (
          !response ||
          response.status !== 200 ||
          response.type === 'opaque'
        ) {
          return response;
        }

        const clone = response.clone();

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, clone);
        });

        return response;
      } catch (err) {
        return new Response('Offline', {
          status: 503,
          statusText: 'Offline',
        });
      }
    })
  );
});

// =========================
// BACKGROUND SYNC
// =========================

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-maintenance-logs') {
    event.waitUntil(syncMaintenanceLogs());
  }
});

async function syncMaintenanceLogs() {
  console.log('[SW] Sync requested. Window client performs queue replay.');
}