export const WORKBOOK_URL = './Draft%20Pool.xlsx';
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
    savedDraft: { activeRole: 'top', selected: {} },
  };
}

export function normalizeRole(role) {
  return ROLE_ORDER.includes(role) ? role : 'top';
}

export function loadDraft() {
  return { activeRole: 'top', selected: {} };
}

export function restoreDraftFromState(state) {
  state.activeRole = 'top';
  state.selected = { ...DEFAULT_SELECTED };
}

export function saveDraft(state) {
  const payload = {
    activeRole: state.activeRole,
    selected: Object.fromEntries(ROLE_ORDER.map((role) => [role, state.selected[role]?.champion || null])),
  };

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
