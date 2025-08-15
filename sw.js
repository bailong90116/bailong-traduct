
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('es-zh-pwa-v1').then((cache) => cache.addAll([
      './',
      './index.html',
      './app.js',
      './styles.css',
      './manifest.webmanifest',
      './assets/icon-192.png',
      './assets/icon-512.png',
      // We'll rely on runtime caching for the DB and CDN libs
    ]))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Cache-first for same-origin static
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then((resp) => resp || fetch(event.request))
    );
    return;
  }
  // Network-first for CDN (sql.js & wasm) and others; fallback to cache
  event.respondWith(
    fetch(event.request).then((resp) => {
      const respClone = resp.clone();
      caches.open('es-zh-runtime').then((cache) => cache.put(event.request, respClone));
      return resp;
    }).catch(() => caches.match(event.request))
  );
});
