import { normalizeText } from '../engine/utils.js';
import {
  DEFAULT_DRAGON_VERSION,
  DRAGON_CHAMPION_URL,
  DRAGON_VERSIONS_URL,
  ROLE_SHEETS,
  WORKBOOK_FALLBACK_URLS,
  WORKBOOK_URL,
} from './draft-state.js';

const XLSX_SCRIPT_URL = 'https://unpkg.com/xlsx/dist/xlsx.full.min.js';
let workbookCache = null;
let workbookPromise = null;
let championCatalogCache = null;
let championCatalogPromise = null;
let xlsxPromise = null;

async function ensureXlsx() {
  if (window.XLSX) return window.XLSX;
  if (xlsxPromise) return xlsxPromise;

  xlsxPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${XLSX_SCRIPT_URL}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(window.XLSX), { once: true });
      existing.addEventListener('error', () => reject(new Error('No se pudo cargar XLSX')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = XLSX_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve(window.XLSX);
    script.onerror = () => reject(new Error('No se pudo cargar XLSX'));
    document.head.appendChild(script);
  });

  try {
    return await xlsxPromise;
  } finally {
    xlsxPromise = null;
  }
}

export async function loadWorkbook(force = false) {
  if (!(await ensureXlsx())) return null;
  if (!force && workbookCache) return workbookCache;
  if (!force && workbookPromise) return workbookPromise;

  const promise = (async () => {
    const urls = Array.from(new Set([WORKBOOK_URL, ...WORKBOOK_FALLBACK_URLS].filter(Boolean)));
    for (const url of urls) {
      try {
        const response = await fetch(url, { cache: force ? 'reload' : 'default' });
        if (!response.ok) continue;
        const workbook = window.XLSX.read(await response.arrayBuffer(), { type: 'array' });
        workbookCache = workbook;
        return workbook;
      } catch {
        // try next URL
      }
    }

    return null;
  })();

  workbookPromise = promise;
  try {
    return await promise;
  } finally {
    workbookPromise = null;
  }
}

export function parseSheet(worksheet) {
  if (!worksheet || !window.XLSX) return [];

  const rows = window.XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    blankrows: false,
    defval: '',
  });

  return rows
    .slice(1)
    .filter((row) => row[0])
    .map((row) => ({
      champion: String(row[0]).trim(),
      identity: String(row[1] || '').trim() || 'Sin definir',
      function: String(row[2] || '').trim() || 'Sin definir',
      tempo: String(row[3] || '').trim() || 'Sin definir',
      strengths: splitTags(row[4]),
      weaknesses: splitTags(row[5]),
    }));
}

export function splitTags(value) {
  if (!value) return [];
  return String(value)
    .split('·')
    .map((part) => part.trim())
    .filter(Boolean);
}

export async function loadChampionCatalog(force = false) {
  if (!force && championCatalogCache) return championCatalogCache;
  if (!force && championCatalogPromise) return championCatalogPromise;

  const promise = (async () => {
    try {
      const versionsResponse = await fetch(DRAGON_VERSIONS_URL, { cache: 'reload' });
      const versions = versionsResponse.ok ? await versionsResponse.json() : [];
      const version = Array.isArray(versions) && versions.length ? versions[0] : DEFAULT_DRAGON_VERSION;

      const response = await fetch(DRAGON_CHAMPION_URL(version), { cache: 'reload' });
      if (!response.ok) throw new Error('No se pudo leer el catálogo de iconos');

      const payload = await response.json();
      const map = {};
      Object.values(payload?.data || {}).forEach((champion) => {
        const key = normalizeText(champion.name || '');
        const id = String(champion.id || '').trim();
        if (key && id) map[key] = id;
        const normalizedId = normalizeText(id);
        if (normalizedId && id) map[normalizedId] = id;
      });

      championCatalogCache = { version, map };
      return championCatalogCache;
    } catch {
      championCatalogCache = null;
      return null;
    }
  })();

  championCatalogPromise = promise;
  try {
    return await promise;
  } finally {
    championCatalogPromise = null;
  }
}

export function getRoleSheetKeys() {
  return ROLE_SHEETS.map(({ key }) => key);
}

export function invalidateWorkbookCache() {
  workbookCache = null;
  workbookPromise = null;
}

export function invalidateChampionCatalogCache() {
  championCatalogCache = null;
  championCatalogPromise = null;
}