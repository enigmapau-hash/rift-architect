import { ROLE_ORDER, normalizeRole } from '../core/draft-state.js';
import { cleanText, toText, uniqueValues } from './analysis-utils.js';

export function buildCompositionProfile(selectedChampions = []) {
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

  return {
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
