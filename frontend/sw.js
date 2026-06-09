const CACHE_NAME = 'jotit-v60';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

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

// Routes that must always hit the network and never be served from cache.
const BYPASS_PREFIXES = ['/api', '/auth', '/notes', '/health'];

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // API routes: bypass the service worker entirely (network-only).
  // No respondWith() => the browser performs its default fetch, so a cache
  // miss can never resolve to undefined and break respondWith.
  if (BYPASS_PREFIXES.some(prefix => url.pathname.startsWith(prefix))) {
    return;
  }

  // Only handle GET; let the browser deal with POST/PUT/etc. directly.
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(async () => {
        // Offline fallback. Guarantee a Response so respondWith never
        // receives undefined.
        const fallback = await caches.match('/index.html') || await caches.match('/');
        return fallback || Response.error();
      });
    })
  );
});
