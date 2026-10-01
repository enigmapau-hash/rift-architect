(async () => {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.allSettled(registrations.map((registration) => registration.unregister()));

      // Keep the beta running as a normal web app while we stabilize the UI.
      try {
        navigator.serviceWorker.register = () => Promise.resolve();
      } catch {
        // ignore read-only assignments
      }
    }
  } catch {
    // ignore service worker errors
  }

  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.allSettled(
        keys.filter((key) => String(key).startsWith('rift-architect')).map((key) => caches.delete(key))
      );
    }
  } catch {
    // ignore cache errors
  }
})();