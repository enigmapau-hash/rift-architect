import { clampNumber, normalizeText } from './utils.js';
import { DEPENDENCY_RULES } from '../../knowledge/dependencies.js';

function championText(champion) {
  return [
    champion?.champion || champion?.displayName || 'Sin definir',
    champion?.identity,
    champion?.function,
    champion?.tempo,
    ...(Array.isArray(champion?.strengths) ? champion.strengths : []),
    ...(Array.isArray(champion?.weaknesses) ? champion.weaknesses : []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function matchTerms(text, terms = []) {
  const normalizedText = normalizeText(text);
  return terms.filter((term) => normalizedText.includes(normalizeText(term)));
}

function collectEvidence(selectedChampions, terms = []) {
  const evidence = [];

  selectedChampions.forEach((champion) => {
    const text = championText(champion);
    const name = champion?.champion || champion?.displayName || 'Sin definir';
    if (terms.some((term) => text.includes(normalizeText(term)))) {
      evidence.push(name);
    }
  });

  return [...new Set(evidence)].slice(0, 3);
}

function scoreDependency(rule, selectedChampions) {
  const compText = selectedChampions.map(championText).join(' ');
  const matchedMatch = matchTerms(compText, rule.match);
  const matchedNeeds = matchTerms(compText, rule.needs);
  const matchedWants = matchTerms(compText, rule.wants);
  const matchedAvoids = matchTerms(compText, rule.avoids);
  const evidence = collectEvidence(selectedChampions, rule.evidence);
  const matchedSignal = matchedMatch.length || matchedNeeds.length || evidence.length;

  if (!matchedSignal) return null;

  const missing = rule.needs.filter((need) => !matchedNeeds.some((term) => normalizeText(term) === normalizeText(need)));
  const status = matchedNeeds.length === rule.needs.length && rule.needs.length
    ? 'Activo'
    : matchedNeeds.length > 0
      ? 'Parcial'
      : 'Incompleto';

  const score = clampNumber(
    32 + matchedMatch.length * 10 + matchedNeeds.length * 14 + matchedWants.length * 6 + evidence.length * 8 - matchedAvoids.length * 4,
    0,
    100
  );

  return {
    key: rule.key,
    label: rule.label,
    kind: rule.kind,
    status,
    detail: rule.detail,
    needs: rule.needs.slice(0, 3),
    wants: rule.wants.slice(0, 3),
    avoids: rule.avoids.slice(0, 3),
    evidence,
    missing: missing.slice(0, 3),
    score,
  };
}

export function summarizeDependencies(selectedChampions = [], limit = 4) {
  const items = DEPENDENCY_RULES
    .map((rule) => scoreDependency(rule, Array.isArray(selectedChampions) ? selectedChampions : []))
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label, 'es'))
    .slice(0, limit);

  const complete = items.filter((item) => item.status === 'Activo').length;
  const partial = items.filter((item) => item.status === 'Parcial').length;
  const incomplete = items.filter((item) => item.status === 'Incompleto').length;

  return {
    items,
    complete,
    partial,
    incomplete,
    summary: items.length
      ? `${complete} activas · ${partial} parciales · ${incomplete} incompletas`
      : 'Sin dependencias claras',
  };
}
