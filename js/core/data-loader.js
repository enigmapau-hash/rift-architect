import { restoreDraftFromState, ROLE_SHEETS } from './draft-state.js';
import { loadChampionCatalog, loadWorkbook, parseSheet } from './workbook.js';

export async function loadDraftData(state, force = false) {
  if (state.loading) return false;
  if (Object.values(state.data).some((rows) => rows.length) && !force) return false;

  state.loading = true;
  try {
    const workbook = await loadWorkbook(force);
    if (!workbook) return false;

    ROLE_SHEETS.forEach(({ key, sheet }) => {
      state.data[key] = parseSheet(workbook.Sheets[sheet]);
    });

    restoreDraftFromState(state);
    return true;
  } catch (error) {
    console.error(error);
    return false;
  } finally {
    state.loading = false;
  }
}

export async function loadChampionCatalogData(state) {
  state.iconCatalog = await loadChampionCatalog();
  return state.iconCatalog;
}
