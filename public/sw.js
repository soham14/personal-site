// Cache-first app shell. Bump VERSION to invalidate.
const VERSION = 'cq-v1';
const SHELL = ['/', '/index.html', '/resume/', '/favicon.svg', '/manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const fonts = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!sameOrigin && !fonts) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: req.mode === 'navigate' }).then((hit) => {
      if (hit) {
        // Refresh the shell in the background so the next visit picks up a new deploy.
        if (req.mode === 'navigate') fetch(req).then((res) => { if (res.ok) caches.open(VERSION).then((c) => c.put(req, res)); }).catch(() => {});
        return hit;
      }
      return fetch(req).then((res) => {
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => (req.mode === 'navigate' ? caches.match('/') : Response.error()));
    })
  );
});
