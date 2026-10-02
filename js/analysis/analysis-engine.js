import { analyzeComposition } from '../analyzer.js';

export function runAnalysis(selectedChampions = []) {
  const safeSelectedChampions = Array.isArray(selectedChampions) ? selectedChampions : [];
  const analysis = analyzeComposition(safeSelectedChampions);
  const score = clamp(Number(analysis?.executiveSummary?.score ?? analysis?.confidence ?? analysis?.score ?? 0), 0, 100);

  return {
    ...analysis,
    composition: safeSelectedChampions,
    score,
    tags: uniqueValues([
      ...(Array.isArray(analysis?.tags) ? analysis.tags : []),
      ...(safeSelectedChampions.map((item) => item?.champion).filter(Boolean)),
      analysis?.primaryIdentity,
      analysis?.coherence?.label,
      analysis?.tempo,
    ]).slice(0, 6),
    winConditions: normalizeWinConditions(analysis),
    threats: normalizeEntries(analysis?.threats || analysis?.risks),
  };
}

function normalizeWinConditions(analysis = {}) {
  const current = analysis?.winConditions || analysis?.winCondition;
  const items = Array.isArray(current) ? current : current ? [current] : [];
  return items.map((item) => ({
    label: toText(item?.label ?? item?.title ?? item?.name ?? item),
    detail: toText(item?.detail ?? item?.text ?? item?.summary ?? ''),
  }));
}

function normalizeEntries(value) {
  return uniqueValues(Array.isArray(value) ? value.map(toText) : value ? [toText(value)] : []);
}

function uniqueValues(values = []) {
  return [...new Set(values.map(toText).filter(Boolean))];
}

function toText(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(toText).filter(Boolean).join(' · ');
  if (typeof value === 'object') {
    return toText(value.label ?? value.name ?? value.title ?? value.text ?? value.value ?? value.detail ?? value.summary ?? value.reason ?? value.description ?? value.champion ?? value.item ?? '');
  }
  return String(value).trim();
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
