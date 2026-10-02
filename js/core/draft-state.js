import { normalizeText } from '../engine/utils.js';

export const WORKBOOK_URL = './Draft%20Pool.xlsx';
export const WORKBOOK_FALLBACK_URLS = [
  './Draft%20Pool.xlsx',
  'https://raw.githubusercontent.com/enigmapau-hash/rift-architect/main/Draft%20Pool.xlsx',
];
export const STORAGE_KEY = 'rift-architect:draft-v2';
export const DRAGON_VERSIONS_URL = 'https://ddragon.leagueoflegends.com/api/versions.json';
export const DEFAULT_DRAGON_VERSION = '15.16.1';
export const DRAGON_CHAMPION_URL = (version) => `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`;
export const DRAGON_ICON_URL = (version, id) => `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${id}.png`;

export const ROLE_SHEETS = [
  { key: 'top', label: 'Top', sheet: 'Tabla Top' },
  { key: 'jungle', label: 'Jungla', sheet: 'Tabla Jungla' },
  { key: 'mid', label: 'Mid', sheet: 'Tabla Mid' },
  { key: 'botline', label: 'Botline', sheet: 'Tabla Botline' },
  { key: 'support', label: 'Support', sheet: 'Tabla Support' },
];

export const ROLE_LABELS = Object.fromEntries(ROLE_SHEETS.map(({ key, label }) => [key, label]));
export const ROLE_ORDER = ROLE_SHEETS.map(({ key }) => key);
export const DEFAULT_SELECTED = Object.fromEntries(ROLE_ORDER.map((role) => [role, null]));

export const ICON_ALIASES = {
  shacoad: 'Shaco',
  shacoap: 'Shaco',
  varusonhit: 'Varus',
  varuslethality: 'Varus',
  varusap: 'Varus',
  kaynrhaast: 'Kayn',
  kaynassassin: 'Kayn',
  kaynblue: 'Kayn',
  kaynred: 'Kayn',
  nunuwillump: 'Nunu & Willump',
  nunuandwillump: 'Nunu & Willump',
};

export function createDraftState() {
  return {
    data: Object.fromEntries(ROLE_ORDER.map((role) => [role, []])),
    selected: { ...DEFAULT_SELECTED },
    activeRole: 'top',
    search: '',
    pickerOpen: false,
    loading: false,
    iconCatalog: null,
    dataset: null,
    datasetStats: null,
    savedDraft: loadDraft(),
  };
}

export function normalizeRole(role) {
  return ROLE_ORDER.includes(role) ? role : 'top';
}

export function loadDraft(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) return { activeRole: 'top', selected: {}, selectedKeys: {} };

    const parsed = JSON.parse(raw);
    const activeRole = normalizeRole(parsed?.activeRole);
    const selected = Object.fromEntries(
      ROLE_ORDER.map((role) => [role, readDraftChampion(parsed?.selected?.[role])])
    );
    const selectedKeys = Object.fromEntries(
      ROLE_ORDER.map((role) => [role, readDraftChampionKey(parsed?.selectedKeys?.[role] ?? parsed?.selected?.[role])])
    );

    return { activeRole, selected, selectedKeys };
  } catch {
    return { activeRole: 'top', selected: {}, selectedKeys: {} };
  }
}

export function restoreDraftFromState(state, draft = loadDraft()) {
  if (!state) return false;

  state.activeRole = normalizeRole(draft?.activeRole);

  const nextSelection = Object.fromEntries(ROLE_ORDER.map((role) => [role, null]));
  let restoredCount = 0;

  for (const role of ROLE_ORDER) {
    const savedChampion = readDraftChampion(draft?.selected?.[role]);
    const savedKey = readDraftChampionKey(draft?.selectedKeys?.[role] ?? draft?.selected?.[role]);

    if (!savedChampion && !savedKey) continue;

    const champion = findChampionInRole(state.data?.[role], savedChampion, savedKey);
    if (champion) {
      nextSelection[role] = champion;
      restoredCount += 1;
    }
  }

  state.selected = nextSelection;
  state.savedDraft = buildSavedDraftPayload(state);

  return restoredCount > 0;
}

export function saveDraft(state) {
  const payload = buildSavedDraftPayload(state);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    state.savedDraft = payload;
  } catch {
    // ignore storage errors
  }
}

export function getSelectedChampions(state) {
  return ROLE_ORDER.filter((role) => state.selected[role]).map((role) => ({ role, ...state.selected[role] }));
}

function buildSavedDraftPayload(state) {
  const selected = Object.fromEntries(ROLE_ORDER.map((role) => [role, state.selected[role]?.champion || null]));
  const selectedKeys = Object.fromEntries(
    ROLE_ORDER.map((role) => [role, state.selected[role]?.championKey || normalizeText(state.selected[role]?.champion || '') || null])
  );

  return {
    activeRole: normalizeRole(state.activeRole),
    selected,
    selectedKeys,
  };
}

function readDraftChampion(value) {
  if (typeof value === 'string') return String(value).trim();
  if (value && typeof value === 'object') {
    return String(value.champion || value.name || value.label || value.title || '').trim();
  }
  return '';
}

function readDraftChampionKey(value) {
  if (typeof value === 'string') return normalizeText(String(value).trim());
  if (value && typeof value === 'object') {
    return normalizeText(value.key || value.championKey || value.name || value.label || value.title || value.champion || '');
  }
  return '';
}

function findChampionInRole(rows, savedChampion, savedKey) {
  if (!Array.isArray(rows) || (!savedChampion && !savedKey)) return null;

  const normalizedChampion = normalizeText(savedChampion || '');
  const normalizedKey = normalizeText(savedKey || savedChampion || '');

  return (
    rows.find((item) => {
      if (!item) return false;

      const candidateName = normalizeText(item.champion || item.name || item.displayName || '');
      const candidateKey = normalizeText(item.championKey || candidateName || '');

      return (
        (savedChampion && item.champion === savedChampion) ||
        (normalizedChampion && candidateName === normalizedChampion) ||
        (normalizedKey && candidateKey === normalizedKey)
      );
    }) || null
  );
}
