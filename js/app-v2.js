import { createDraftState, loadDraft, restoreDraftFromState, saveDraft, clearDraft } from './core/draft-state.js?v=106';
import { loadDraftData, loadChampionCatalogData } from './core/data-loader.js?v=106';
import { loadWorkbook } from './core/workbook.js?v=106';
import { clearComparisonSnapshots } from './analysis/comparison-store.js?v=106';
import { createCompositionController } from './ui/composition-controller.js?v=106';

const state = createDraftState();
const controller = createCompositionController({
  state,
  persistDraft: () => saveDraft(state),
});

init().catch((error) => console.error(error));

async function init() {
  controller.cacheElements();
  wireEvents();

  const build = await loadBuildMetadata();
  state.buildVersion = build.version;

  const savedDraft = loadDraft();
  if (build.version && savedDraft.buildVersion && savedDraft.buildVersion !== build.version) {
    clearDraft();
    clearComparisonSnapshots();
  }

  await Promise.allSettled([loadDraftData(state), loadChampionCatalogData(state)]);
  restoreDraftFromState(state, loadDraft());
  controller.renderAll();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  }
}

function wireEvents() {
  controller.bindEvents({
    onRefreshData: async (draftSnapshot) => {
      await loadDraftData(state, true);
      restoreDraftFromState(state, draftSnapshot || loadDraft());
      saveDraft(state);
      controller.renderAll();
    },
  });
}

async function loadBuildMetadata() {
  const globalBuild = globalThis.__RIFT_ARCHITECT_BUILD__;
  if (globalBuild && typeof globalBuild === 'object') {
    return normalizeBuildMetadata(globalBuild);
  }

  try {
    const response = await fetch('./version.json', { cache: 'no-store' });
    if (!response.ok) return { version: '', stage: '', date: '', cache: '' };

    return normalizeBuildMetadata(await response.json());
  } catch {
    return { version: '', stage: '', date: '', cache: '' };
  }
}

function normalizeBuildMetadata(build = {}) {
  return {
    version: String(build?.version || '').trim(),
    stage: String(build?.stage || '').trim(),
    date: String(build?.date || '').trim(),
    cache: String(build?.cache || '').trim(),
  };
}

export { loadWorkbook };