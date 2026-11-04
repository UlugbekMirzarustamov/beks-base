/**
 * Service worker = the bit that makes Ulu's Base work OFFLINE.
 *
 * Strategy:
 *  - Pages (navigation): try the network first so you get updates, fall back to
 *    the saved copy when offline.
 *  - Everything else from this site (JS, CSS, fonts, icons): use the saved copy
 *    if we have it, otherwise download and save it for next time.
 *
 * Your DATA is not stored here — that's in IndexedDB. This only stores the app itself.
 * Bump VERSION to force phones to drop the old cached files.
 */
const VERSION = 'ulus-base-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png']))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html')),
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
