/** Register the cache-first service worker (production hosts only). */
export function registerSW(): void {
  const h = location.hostname;
  if (h === 'localhost' || h === '127.0.0.1' || h === '' || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => { /* offline support is optional */ });
  });
}
