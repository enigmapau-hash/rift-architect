import { ROLE_ORDER, normalizeRole } from '../core/draft-state.js';
import { cleanText, toText, uniqueValues } from './analysis-utils.js';

const COMPOSITION_PROFILE_CACHE = new Map();
const COMPOSITION_PROFILE_CACHE_LIMIT = 32;

export function buildCompositionProfile(selectedChampions = []) {
  const cacheKey = buildCompositionProfileKey(selectedChampions);
  const cached = COMPOSITION_PROFILE_CACHE.get(cacheKey);
  if (cached) return cached;

  const normalizedSlots = ROLE_ORDER.map((role, index) => {
    const champion = pickChampionForRole(selectedChampions, role, index);
    return {
      role,
      champion: champion ? normalizeChampion(champion) : null,
    };
  });

  const selected = normalizedSlots
    .filter((slot) => slot.champion)
    .map((slot) => ({ role: slot.role, ...slot.champion }));

  const names = selected.map((item) => item.champion);
  const identities = uniqueValues(selected.map((item) => item.identity));
  const functions = uniqueValues(selected.map((item) => item.function));
  const tempos = uniqueValues(selected.map((item) => item.tempo));
  const tags = uniqueValues([...names, ...identities, ...functions, ...tempos]);

  const profile = {
    slots: normalizedSlots,
    selectedChampions: selected,
    count: selected.length,
    complete: selected.length === ROLE_ORDER.length,
    roles: selected.map((item) => item.role),
    missingRoles: normalizedSlots.filter((slot) => !slot.champion).map((slot) => slot.role),
    names,
    identities,
    functions,
    tempos,
    tags,
    primaryChampion: selected[0] || null,
  };

  COMPOSITION_PROFILE_CACHE.set(cacheKey, profile);
  if (COMPOSITION_PROFILE_CACHE.size > COMPOSITION_PROFILE_CACHE_LIMIT) {
    const oldestKey = COMPOSITION_PROFILE_CACHE.keys().next().value;
    COMPOSITION_PROFILE_CACHE.delete(oldestKey);
  }

  return profile;
}

function buildCompositionProfileKey(selectedChampions = []) {
  return selectedChampions
    .map((champion) => [
      champion?.role || '',
      champion?.champion || champion?.name || '',
      champion?.identity || '',
      champion?.function || '',
      champion?.tempo || '',
      Array.isArray(champion?.strengths) ? champion.strengths.join('|') : '',
      Array.isArray(champion?.weaknesses) ? champion.weaknesses.join('|') : '',
    ].join('::'))
    .join('||');
}

function pickChampionForRole(selectedChampions, role, index) {
  const directMatch = selectedChampions.find((item) => normalizeRole(item?.role) === role);
  if (directMatch) return directMatch;

  const fallback = selectedChampions[index];
  if (fallback && normalizeRole(fallback?.role) === role) return fallback;

  return null;
}

function normalizeChampion(champion) {
  return {
    ...champion,
    role: normalizeRole(champion.role),
    champion: cleanText(champion.champion),
    identity: cleanText(champion.identity || 'Sin definir'),
    function: cleanText(champion.function || 'Sin definir'),
    tempo: cleanText(champion.tempo || 'Sin definir'),
    strengths: Array.isArray(champion.strengths) ? champion.strengths.map(toText).filter(Boolean) : [],
    weaknesses: Array.isArray(champion.weaknesses) ? champion.weaknesses.map(toText).filter(Boolean) : [],
  };
}