(() => {
  if (globalThis.__RIFT_ARCHITECT_PRELOAD__) return;
  globalThis.__RIFT_ARCHITECT_PRELOAD__ = true;

  const legacyDataPath = /\/data\/(?:index\.json|(?:top|jungle|mid|bot|support)\.json)$/i;
  const nativeFetch = globalThis.fetch.bind(globalThis);

  globalThis.fetch = (input, init) => {
    try {
      const url = typeof input === 'string' ? input : input?.url || '';
      const resolved = new URL(url, location.href);
      if (resolved.origin === location.origin && legacyDataPath.test(resolved.pathname)) {
        return Promise.resolve(new Response('', { status: 404, statusText: 'Not Found' }));
      }
    } catch {
      // fall through to the real fetch
    }

    return nativeFetch(input, init);
  };
})();