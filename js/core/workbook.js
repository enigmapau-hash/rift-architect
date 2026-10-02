import { normalizeText } from '../analyzer.js';
import {
  DEFAULT_DRAGON_VERSION,
  DRAGON_CHAMPION_URL,
  DRAGON_VERSIONS_URL,
  ROLE_SHEETS,
  WORKBOOK_URL,
} from './draft-state.js';

export async function loadWorkbook(force = false) {
  if (!window.XLSX) return null;

  const response = await fetch(WORKBOOK_URL, { cache: force ? 'reload' : 'default' });
  if (!response.ok) return null;

  return window.XLSX.read(await response.arrayBuffer(), { type: 'array' });
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

export async function loadChampionCatalog() {
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

    return { version, map };
  } catch {
    return null;
  }
}

export function getRoleSheetKeys() {
  return ROLE_SHEETS.map(({ key }) => key);
}
