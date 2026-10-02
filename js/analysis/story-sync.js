export function syncAnalysisStory({ selectedChampions = [], activeRole = 'top', rolePools = {} } = {}) {
  globalThis.__RIFT_ARCHITECT_SELECTED__ = selectedChampions;
  globalThis.__RIFT_ARCHITECT_ROLE_POOLS__ = rolePools;

  try {
    window.dispatchEvent(
      new CustomEvent('rift-architect:composition-changed', {
        detail: {
          selectedChampions,
          selectedCount: selectedChampions.length,
          activeRole,
          rolePools,
        },
      })
    );
  } catch {
    // ignore dispatch errors
  }
}
