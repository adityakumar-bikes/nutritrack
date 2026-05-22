// NutriTrack Service Worker
const CACHE_NAME = 'nutritrack-v1';

const ASSETS = [
  '/nutritrack/',
  '/nutritrack/index.html',
  '/nutritrack/manifest.json',
  '/nutritrack/firebase-config.js',
  '/nutritrack/icons/icon-192.png',
  '/nutritrack/icons/icon-512.png',
  '/nutritrack/icons/apple-touch-icon.png'
];

// ── Install: cache all shell assets ──────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// ── Activate: purge old caches ────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: cache-first for shell, network-first for API calls ─────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Let Anthropic API calls go straight to network (never cache)
  if (url.hostname.includes('anthropic.com') || url.hostname.includes('claude.ai')) {
    return;
  }

  // Cache-first for everything else
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;

      return fetch(request).then(response => {
        // Only cache same-origin GET responses
        if (
          request.method === 'GET' &&
          url.origin === self.location.origin &&
          response.status === 200
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback: return cached index.html for navigation requests
        if (request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
