const CACHE_NAME = 'rift-architect-v208';
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
  './css/analysis-a11y.css',
  './css/analysis-dashboard.css',
  './css/analysis-dashboard-rc2.css',
  './js/bootstrap.js?v=111',
  './js/pwa-reset.js?v=111',
  './js/picker-a11y-fix.js?v=111',
  './js/site-bootstrap.js?v=120',
  './js/app-v2.js?v=115',
  './js/analysis-failsafe.js?v=120',
  './js/ui/composition-controller-a11y.js?v=115',
  './js/ui/composition-controller.js?v=111',
  './js/analysis/renderer-report.js?v=120',
  './js/analysis/renderer-dashboard-rc2.js?v=120',
  './js/analysis/report-contract.js?v=120',
  './js/analysis/analysis-engine.js?v=115',
  './js/analysis/composition-profile.js?v=115',
  './js/analysis/strategic-engine.js?v=115',
  './js/analysis/story-engine.js?v=115',
  './js/analysis/last-pick-engine.js?v=115',
  './js/analysis/comparison-store.js?v=115',
  './js/analysis/comparison-store.js',
  './js/analysis/comparison-renderer.js?v=115',
  './js/analysis/comparison-renderer.js',
  './js/engine/comparisonEngine.js?v=115',
  './js/engine/comparisonEngine.js',
  './knowledge/index.js?v=111',
  './knowledge/knowledge-v3.js?v=115',
  './knowledge/knowledge-v3-context.js?v=115',
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