import { normalizeWorkbookDataset } from './dataset-normalizer.js';
import { ROLE_SHEETS } from './draft-state.js';
import { loadChampionCatalog, loadWorkbook, parseSheet } from './workbook.js';

const NORMALIZED_WORKBOOK_CACHE = new WeakMap();

export async function loadDraftData(state, force = false) {
  if (state.loading) return false;
  if (Object.values(state.data).some((rows) => rows.length) && !force) return false;

  state.loading = true;
  try {
    const workbook = await loadWorkbook(force);
    if (!workbook) return false;

    if (!force) {
      const cached = NORMALIZED_WORKBOOK_CACHE.get(workbook);
      if (cached) {
        state.data = cached.data;
        state.dataset = cached.taxonomy;
        state.datasetStats = cached.stats;
        return true;
      }
    }

    const rawRows = {};
    ROLE_SHEETS.forEach(({ key, sheet }) => {
      rawRows[key] = parseSheet(workbook.Sheets[sheet]);
    });

    const normalized = normalizeWorkbookDataset(rawRows);
    NORMALIZED_WORKBOOK_CACHE.set(workbook, normalized);
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