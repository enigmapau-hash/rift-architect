const CACHE_NAME = 'rift-architect-v189';
const CORE_ASSETS = [
  './',
  './index.html',
  './version.json',
  './manifest.webmanifest',
  './Draft%20Pool.xlsx',
  './assets/icon.svg',
  './css/main.css',
  './css/design-tokens.css',
  './css/ui-polish.css',
  './css/rc-polish.css',
  './css/analysis-report.css',
  './css/analysis-polish.css',
  './css/analysis-report-polish.css',
  './css/analysis-visual-finesse.css',
  './js/bootstrap.js?v=111',
  './js/pwa-reset.js?v=111',
  './js/picker-a11y-fix.js?v=111',
  './js/site-bootstrap.js?v=111',
  './js/app-v2.js?v=111',
  './js/analysis-failsafe.js?v=111',
  './js/analysis/renderer-report.js?v=111',
  './js/analysis/analysis-engine.js?v=111',
  './js/analysis/story-engine.js?v=111',
  './js/core/data-loader.js?v=111',
  './js/core/draft-state.js?v=111',
  './js/core/workbook.js?v=111',
  './js/core/dataset-normalizer.js?v=111',
  './js/ui/composition-controller.js?v=111',
  './js/engine/comparisonEngine.js?v=111',
  './knowledge/index.js?v=111',
  './knowledge/knowledge-v3.js?v=111',
  './knowledge/knowledge-v3-context.js?v=111',
  './knowledge/identity-relations.js',
  './knowledge/synergies.js',
  './knowledge/patterns.js',
  './knowledge/dependencies.js',
  './knowledge/conflicts.js',
  './knowledge/win-conditions.js',
  './knowledge/strategy-profiles.js',
  './knowledge/ban-profiles.js',
  './knowledge/pick-profiles.js',
  './knowledge/validator.js',
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