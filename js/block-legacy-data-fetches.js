const LEGACY_DATA_PATH = /(^|\/)data\/(?:index|top|jungle|mid|bot|support)\.json(?:[?#].*)?$/i;

if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
  const originalFetch = window.fetch.bind(window);

  window.fetch = (input, init) => {
    try {
      const rawUrl = typeof input === 'string' ? input : input?.url || '';
      const parsed = new URL(rawUrl, window.location.href);

      if (LEGACY_DATA_PATH.test(parsed.pathname)) {
        return Promise.reject(new TypeError(`Blocked legacy data fetch: ${parsed.pathname}`));
      }
    } catch {
      // Let the original fetch handle non-standard inputs.
    }

    return originalFetch(input, init);
  };
}
