const CACHE_NAME = 'rift-architect-v46';
const STATIC_ASSETS = [
  './',
  './index.html',
  './css/main.css',
  './css/v2.css',
  './css/v2_patch.css',
  './css/fixes.css',
  './css/analysis.css',
  './css/analysis-v2.css',
  './js/bootstrap.js',
  './js/app-v2.js',
  './js/v2_patch.js',
  './js/analysis-panel.js',
  './js/analyzer.js',
  './js/engine/utils.js',
  './js/engine/identityEngine.js',
  './js/engine/strengthEngine.js',
  './js/engine/weaknessEngine.js',
  './js/engine/tempoEngine.js',
  './js/engine/synergyEngine.js',
  './js/engine/dependencyEngine.js',
  './js/engine/coherenceEngine.js',
  './js/engine/winConditionEngine.js',
  './js/engine/planEngine.js',
  './js/engine/explainabilityEngine.js',
  './js/engine/coachEngine.js',
  './js/engine/strategicAdvisor.js',
  './js/engine/simulationEngine.js',
  './js/engine/analysisEngine.js',
  './knowledge/index.js',
  './knowledge/validator.js',
  './knowledge/identity-relations.js',
  './knowledge/synergies.js',
  './knowledge/patterns.js',
  './knowledge/dependencies.js',
  './knowledge/conflicts.js',
  './knowledge/win-conditions.js',
  './tests/index.html',
  './tests/engineValidation.js',
  './tests/compositions/empty.json',
  './tests/compositions/single-shen.json',
  './tests/compositions/front-to-back.json',
  './tests/compositions/pick.json',
  './tests/compositions/poke.json',
  './tests/compositions/dive.json',
  './tests/compositions/splitpush.json',
  './tests/compositions/protect-carry.json',
  './tests/compositions/hybrid-front-pick.json',
  './tests/compositions/incoherent.json',
  './tests/compositions/wombo-combo.json',
  './tests/compositions/siege.json',
  './tests/compositions/triple-carry.json',
  './tests/compositions/global-pressure.json',
  './manifest.webmanifest',
  './Draft%20Pool.xlsx',
  './assets/icon.svg',
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
