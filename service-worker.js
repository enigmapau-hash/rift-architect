const CACHE_NAME = 'rift-architect-v121';
const STATIC_ASSETS = [
  './',
  './index.html',
  './version.json',
  './manifest.webmanifest',
  './Draft%20Pool.xlsx',
  './assets/icon.svg',
  './css/main.css',
  './css/v2.css',
  './css/v2_patch.css',
  './css/fixes.css',
  './css/analysis.css',
  './css/analysis-v2.css',
  './css/design-tokens.css',
  './css/components.css',
  './css/design-system.css',
  './css/analysis-modal.css',
  './css/composition-story.css',
  './css/accordion.css',
  './js/bootstrap.js',
  './js/block-legacy-data-fetches.js',
  './js/picker-a11y-fix.js',
  './js/app-v2.js',
  './js/v2_patch.js',
  './js/escape-html.js',
  './js/modal-helpers.js',
  './js/story-sync.js',
  './js/composition-ia.js',
  './js/composition-modal-final.js',
  './js/analyzer.js',
  './data/index.json',
  './data/top.json',
  './data/jungle.json',
  './data/mid.json',
  './data/bot.json',
  './data/support.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.mode === 'navigate' || (request.method === 'GET' && request.destination === 'document')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
        return response;
      });
    })
  );
});