(() => {
  const keysToClear = ['rift-architect:draft-v2', 'rift-architect:draft'];

  try {
    keysToClear.forEach((key) => localStorage.removeItem(key));
  } catch {
    // ignore storage errors
  }
})();
