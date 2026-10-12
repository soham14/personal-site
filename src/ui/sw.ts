/** Register the cache-first service worker (production hosts only), and warm the résumé. */
export function registerSW(): void {
  window.addEventListener('load', () => {
    // Prefetch the résumé page so opening it is instant.
    const l = document.createElement('link');
    l.rel = 'prefetch'; l.href = 'resume/';
    document.head.appendChild(l);

    const h = location.hostname;
    if (h === 'localhost' || h === '127.0.0.1' || h === '' || !('serviceWorker' in navigator)) return;
    const sw = navigator.serviceWorker;
    // On the very first visit the page loaded before the worker existed, so its scripts, styles and
    // fonts were never cached. Once the worker controls the page, fetch them again through it.
    const recache = () => {
      const urls = performance.getEntriesByType('resource').map((e) => e.name)
        .filter((u) => u.startsWith(location.origin) || u.includes('fonts.g'));
      urls.concat(['resume/']).forEach((u) => { fetch(u, { mode: u.startsWith(location.origin) ? 'same-origin' : 'no-cors' }).catch(() => {}); });
    };
    const hadController = !!sw.controller;
    sw.register('sw.js').then(() => {
      if (hadController) return;
      sw.addEventListener('controllerchange', recache, { once: true });
    }).catch(() => { /* offline support is optional */ });
  });
}
