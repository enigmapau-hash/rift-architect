const CACHE_NAME = 'rift-architect-v173';
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
  './js/bootstrap.js?v=94',
  './js/pwa-reset.js?v=94',
  './js/picker-a11y-fix.js?v=94',
  './js/site-bootstrap.js?v=94',
  './js/app-v2.js?v=94',
  './js/composition-ia.js?v=94',
  './js/analysis-failsafe.js?v=94',
  './js/analyzer.js',
  './js/analysis/analysis-utils.js',
  './js/analysis/comparison-store.js',
  './js/analysis/comparison-renderer.js',
  './js/analysis/composition-profile.js',
  './js/analysis/identity-engine.js',
  './js/analysis/strengths-engine.js',
  './js/analysis/weakness-engine.js',
  './js/analysis/gameplan-engine.js',
  './js/analysis/timeline-engine.js',
  './js/analysis/score-engine.js',
  './js/analysis/analysis-engine.js?v=94',
  './js/analysis/strategic-engine.js?v=94',
  './js/analysis/ban-engine.js',
  './js/analysis/last-pick-engine.js',
  './js/analysis/contextual-engine.js',
  './js/analysis/story-engine.js?v=94',
  './js/analysis/renderer.js?v=94',
  './js/core/data-loader.js',
  './js/core/draft-state.js',
  './js/core/workbook.js',
  './js/core/dataset-normalizer.js',
  './js/ui/composition-controller.js',
  './js/engine/comparisonEngine.js',
  './knowledge/index.js?v=94',
  './knowledge/knowledge-v3.js?v=94',
  './knowledge/knowledge-v3-context.js?v=94',
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