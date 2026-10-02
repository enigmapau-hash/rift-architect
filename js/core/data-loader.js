import { normalizeWorkbookDataset } from './dataset-normalizer.js';
import { ROLE_SHEETS } from './draft-state.js';
import { loadChampionCatalog, loadWorkbook, parseSheet } from './workbook.js';

export async function loadDraftData(state, force = false) {
  if (state.loading) return false;
  if (Object.values(state.data).some((rows) => rows.length) && !force) return false;

  state.loading = true;
  try {
    const workbook = await loadWorkbook(force);
    if (!workbook) return false;

    const rawRows = {};
    ROLE_SHEETS.forEach(({ key, sheet }) => {
      rawRows[key] = parseSheet(workbook.Sheets[sheet]);
    });

    const normalized = normalizeWorkbookDataset(rawRows);
    state.data = normalized.data;
    state.dataset = normalized.taxonomy;
    state.datasetStats = normalized.stats;

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
