const CACHE_NAME = 'rift-architect-v152';
const CORE_ASSETS = [
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
  './css/responsive-story.css',
  './css/accordion.css',
  './js/bootstrap.js',
  './js/pwa-reset.js',
  './js/picker-a11y-fix.js',
  './js/site-bootstrap.js',
  './js/app-v2.js',
  './js/composition-ia.js',
  './js/analysis-failsafe.js',
  './js/analyzer.js',
  './js/analysis/story-sync.js',
  './js/analysis/analysis-engine.js',
  './js/analysis/story-engine.js',
  './js/analysis/renderer.js',
  './js/core/data-loader.js',
  './js/core/draft-state.js',
  './js/core/workbook.js',
  './js/ui/composition-controller.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || Response.error()))
  );
});
