import { createDraftState, loadDraft, restoreDraftFromState, saveDraft } from './core/draft-state.js?v=98';
import { loadDraftData, loadChampionCatalogData } from './core/data-loader.js?v=98';
import { loadWorkbook } from './core/workbook.js?v=98';
import { createCompositionController } from './ui/composition-controller.js?v=98';

const state = createDraftState();
const controller = createCompositionController({
  state,
  persistDraft: () => saveDraft(state),
});

init().catch((error) => console.error(error));

async function init() {
  controller.cacheElements();
  wireEvents();

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

export { loadWorkbook };