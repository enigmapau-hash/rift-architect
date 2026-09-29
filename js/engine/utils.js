export const ENGINE_VERSION = '3.1.0';

export const CATEGORY_TERMS = {
  frontline: ['frontline', 'tank', 'tanque', 'bruiser', 'warden', 'sustain', 'vanguard', 'juggernaut', 'front to back'],
  engage: ['engage', 'pick', 'hook', 'dive', 'flank', 'initiate', 'catch'],
  damage: ['dps', 'burst', 'carry', 'marksman', 'mage', 'battlemage', 'fighter', 'assassin', 'bruiser'],
  poke: ['poke', 'siege', 'artillery', 'zone control'],
  teamfight: ['teamfight', 'front to back', 'wombo', 'group', 'grupal', 'objective', 'control'],
  mobility: ['mobility', 'movilidad', 'dash', 'roam', 'mobile'],
  control: ['cc', 'control', 'vision', 'anti-engage', 'anti engage', 'waveclear', 'zone control', 'peel'],
  scaling: ['scaling', 'escalado', 'late', 'late game', 'mid/late', 'mid late', 'hypercarry'],
  objective: ['objective', 'objectives', 'dragon', 'nashor', 'herald', 'zone control'],
  splitpush: ['splitpush', 'split', 'side lane', 'duel', 'dueling', '1v1'],
  pick: ['pick', 'catch', 'hook', 'flank', 'dive', 'assassin'],
};

const IDENTITY_ALIASES = new Map([
  ['fronttoback', 'Front to Back'],
  ['front2back', 'Front to Back'],
  ['teamfight', 'Teamfight'],
  ['engage', 'Engage'],
  ['pick', 'Pick'],
  ['poke', 'Poke'],
  ['splitpush', 'Splitpush'],
  ['sidelane', 'Splitpush'],
  ['dive', 'Dive'],
  ['skirmish', 'Skirmish'],
  ['protect', 'Protect'],
  ['control', 'Control'],
  ['siege', 'Siege'],
  ['catch', 'Catch'],
  ['flexible', 'Flexible'],
  ['brawl', 'Skirmish'],
]);

export const TEMPO_ORDER = ['Early', 'Mid', 'Late'];

export function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

export function cleanLabel(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return 'Sin definir';

  const stripped = raw
    .replace(/^[^\p{L}\p{N}]+/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

  return stripped || raw;
}

export function normalizeTags(values) {
  if (!Array.isArray(values)) return [];
  return values.map((value) => cleanLabel(value)).filter(Boolean);
}

export function normalizeIdentityLabel(value) {
  const label = cleanLabel(value);
  const normalized = normalizeText(label);

  if (!normalized || normalized === normalizeText('Sin definir')) {
    return 'Sin definir';
  }

  return IDENTITY_ALIASES.get(normalized) || label;
}

export function normalizeTempoLabel(value) {
  const label = cleanLabel(value);
  const normalized = normalizeText(label);

  if (!normalized || normalized === normalizeText('Sin definir')) {
    return 'Sin definir';
  }

  if (normalized.includes('earlymidlate')) return 'Early/Mid/Late';
  if (normalized.includes('earlymid')) return 'Early/Mid';
  if (normalized.includes('midlate')) return 'Mid/Late';
  if (normalized.includes('earlylate')) return 'Early/Late';
  if (normalized.includes('early')) return 'Early';
  if (normalized.includes('mid')) return 'Mid';
  if (normalized.includes('late')) return 'Late';

  return label;
}

export function matchesCategory(tag, category) {
  const normalizedTag = normalizeText(tag);
  if (!normalizedTag) return false;

  const terms = CATEGORY_TERMS[category] || [];
  return terms.some((term) => {
    const normalizedTerm = normalizeText(term);
    return normalizedTag.includes(normalizedTerm) || normalizedTerm.includes(normalizedTag);
  });
}

export function uniqueOrdered(values) {
  return [...new Set(values)];
}

export function sortByFrequency(entries) {
  return [...entries].sort((a, b) => b.count - a.count || a.firstIndex - b.firstIndex || a.label.localeCompare(b.label, 'es'));
}

export function clampNumber(value, min, max) {
  const numeric = Number.isFinite(Number(value)) ? Number(value) : min;
  return Math.min(max, Math.max(min, numeric));
}