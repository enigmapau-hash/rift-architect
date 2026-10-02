export function syncAnalysisStory({ selectedChampions = [], activeRole = 'top' } = {}) {
  globalThis.__RIFT_ARCHITECT_SELECTED__ = selectedChampions;

  try {
    window.dispatchEvent(
      new CustomEvent('rift-architect:composition-changed', {
        detail: {
          selectedChampions,
          selectedCount: selectedChampions.length,
          activeRole,
        },
      })
    );
  } catch {
    // ignore dispatch errors
  }

  if (typeof globalThis.renderAnalysisStory !== 'function') return;

  window.requestAnimationFrame(() => {
    try {
      globalThis.renderAnalysisStory();
    } catch (error) {
      console.error('[Rift Architect] renderAnalysisStory failed', error);
    }
  });
}
