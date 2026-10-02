import { createDraftState, restoreDraftFromState, ROLE_SHEETS } from './core/draft-state.js';
import { loadChampionCatalog, loadWorkbook, parseSheet } from './core/workbook.js';
import { createCompositionController } from './ui/composition-controller.js';

const state = createDraftState();
const controller = createCompositionController({ state });

init().catch((error) => console.error(error));

async function init() {
  controller.cacheElements();
  wireEvents();

  await Promise.allSettled([loadData(), loadChampionCatalogIntoState()]);
  restoreDraftFromState(state);
  controller.renderAll();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  }
}

function wireEvents() {
  controller.bindEvents({
    onRefreshData: async () => {
      await loadData(true);
      controller.renderAll();
    },
  });
}

async function loadData(force = false) {
  if (state.loading) return;
  if (Object.values(state.data).some((rows) => rows.length) && !force) return;

  state.loading = true;
  try {
    const workbook = await loadWorkbook(force);
    if (!workbook) return;

    ROLE_SHEETS.forEach(({ key, sheet }) => {
      state.data[key] = parseSheet(workbook.Sheets[sheet]);
    });

    restoreDraftFromState(state);
  } catch (error) {
    console.error(error);
  } finally {
    state.loading = false;
  }
}

async function loadChampionCatalogIntoState() {
  state.iconCatalog = await loadChampionCatalog();
}
