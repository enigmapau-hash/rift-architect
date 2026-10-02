import { createDraftState, saveDraft } from './core/draft-state.js';
import { loadDraftData, loadChampionCatalogData } from './core/data-loader.js';
import { loadWorkbook } from './core/workbook.js';
import { createCompositionController } from './ui/composition-controller.js';

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
  controller.renderAll();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  }
}

function wireEvents() {
  controller.bindEvents({
    onRefreshData: async () => {
      await loadDraftData(state, true);
      controller.renderAll();
    },
  });
}

export { loadWorkbook };
