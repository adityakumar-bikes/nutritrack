// NutriTrack Service Worker
const CACHE_NAME = 'nutritrack-v3';

const STATIC_ASSETS = [
  '/nutritrack/icons/icon-192.png',
  '/nutritrack/icons/icon-512.png',
  '/nutritrack/icons/apple-touch-icon.png'
];

// ── Install: cache only static assets (not HTML) ─────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
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

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Never intercept non-GET or external API calls
  if (request.method !== 'GET') return;
  if (url.hostname.includes('anthropic.com') || url.hostname.includes('firebaseio.com') ||
      url.hostname.includes('googleapis.com') || url.hostname.includes('gstatic.com')) return;

  // Network-first for HTML and JS files — always get latest on deploy
  if (request.mode === 'navigate' ||
      url.pathname.endsWith('.html') ||
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('version.js') ||
      url.pathname === '/nutritrack/' ||
      url.pathname === '/nutritrack') {
    event.respondWith(
      fetch(request).then(response => {
        return response;
      }).catch(() => caches.match(request))
    );
    return;
  }

  // Cache-first for static assets (icons, images)
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      });
    })
  );
});
