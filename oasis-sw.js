// Oasis — minimal service worker (installability + basic offline app-shell caching)
const CACHE_NAME = 'oasis-shell-v3';
const SHELL_FILES = [
  './',
  './oasis-manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// Network-first for the app shell (so you always get the latest build when online),
// falling back to cache when offline. Supabase API calls are left alone (network only).
// cache: 'no-store' forces a true round-trip past the browser's own HTTP cache and
// GitHub Pages' CDN cache headers — without this, "network-first" could still silently
// hand back a stale cached response even when you're online.
self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  if (url.includes('supabase.co')) return; // never intercept API calls

  event.respondWith(
    fetch(event.request, { cache: 'no-store' })
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
