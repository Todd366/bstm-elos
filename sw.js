/* sw.js — caches the app shell so ELOS works fully offline in the field.
   Bump CACHE_NAME whenever you ship changes, so old clients pick up the update. */

const CACHE_NAME = 'elos-shell-v2';
const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './style.css',
  './db.js',
  './rooms.js',
  './schema.js',
  './markdown.js',
  './scorecard.js',
  './views.js',
  './trialForm.js',
  './app.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
