// Cache-first app shell with background refresh. Bump VERSION to invalidate.
const VERSION = 'cq-v4';
const SCOPE = self.registration.scope; // e.g. https://soham.io/
const abs = (p) => new URL(p, SCOPE).href;
const SHELL = ['', 'index.html', 'resume/', 'resume/index.html', 'favicon.svg', 'manifest.webmanifest', 'apple-touch-icon.png'].map(abs);
// Safari compares Vary headers strictly (GitHub Pages sends Vary: Accept-Encoding), so always ignore them.
const MATCH = { ignoreVary: true, ignoreSearch: false };

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION)
      // cache each shell file on its own so one failure can't abort the whole install
      .then((c) => Promise.all(SHELL.map((u) => fetch(u, { cache: 'reload' }).then((r) => (r.ok ? c.put(u, r) : null)).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function offlinePage() {
  return new Response(
    '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Soham · Offline</title><body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;' +
    'background:#0b1330;color:#f4f1e8;font-family:ui-monospace,Menlo,monospace;text-align:center;padding:24px;box-sizing:border-box">' +
    '<div><div style="font-size:40px;font-weight:700;letter-spacing:4px">SOHAM</div>' +
    '<p style="color:#f2b632">You\'re offline. Reconnect and refresh to play.</p></div>',
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

async function fromCache(req) {
  const c = await caches.open(VERSION);
  return (await c.match(req, MATCH)) || (await c.match(req, { ...MATCH, ignoreSearch: true }));
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    // Pages: cached copy first (instant, works offline), refreshed in the background.
    e.respondWith((async () => {
      const c = await caches.open(VERSION);
      const hit = await fromCache(req);
      const net = fetch(req).then((res) => { if (res.ok) c.put(req, res.clone()); return res; });
      if (hit) { e.waitUntil(net.catch(() => {})); return hit; }
      try { return await net; } catch {
        const isResume = url.pathname.includes('/resume');
        return (await c.match(abs(isResume ? 'resume/' : ''), MATCH)) ||
               (await c.match(abs(isResume ? 'resume/index.html' : 'index.html'), MATCH)) ||
               offlinePage();
      }
    })());
    return;
  }

  // Assets: cache first, else network (and keep a copy).
  e.respondWith((async () => {
    const hit = await fromCache(req);
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res && res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
      return res;
    } catch {
      return new Response('', { status: 504, statusText: 'Offline' });
    }
  })());
});
