import { analyzeComposition } from './analysisEngine.js';
import { compareAnalyses } from './comparisonEngine.js';
import { normalizeText, uniqueOrdered } from './utils.js';

function cloneChampion(champion = {}) {
  return {
    ...champion,
    strengths: Array.isArray(champion.strengths) ? [...champion.strengths] : [],
    weaknesses: Array.isArray(champion.weaknesses) ? [...champion.weaknesses] : [],
  };
}

function cloneDraft(selectedChampions = []) {
  return Array.isArray(selectedChampions) ? selectedChampions.map(cloneChampion) : [];
}

function normalizeRole(role) {
  return String(role || '').trim().toLowerCase();
}

function normalizeValue(value) {
  return normalizeText(Array.isArray(value) ? value.join(' ') : value);
}

function labelList(items = []) {
  return items
    .map((item) => (typeof item === 'string' ? item : item?.label || item?.champion || item?.displayName))
    .filter(Boolean);
}

function compareText(beforeValue, afterValue) {
  return normalizeValue(beforeValue) === normalizeValue(afterValue);
}

function buildFieldChange(label, beforeValue, afterValue) {
  const before = typeof beforeValue === 'string' ? beforeValue : beforeValue?.label || beforeValue?.detail || beforeValue?.reason || '';
  const after = typeof afterValue === 'string' ? afterValue : afterValue?.label || afterValue?.detail || afterValue?.reason || '';
  return {
    label,
    before: before || 'Sin definir',
    after: after || 'Sin definir',
    changed: !compareText(before, after),
  };
}

function buildListChange(label, beforeItems = [], afterItems = []) {
  const before = labelList(beforeItems);
  const after = labelList(afterItems);
  const beforeSet = new Set(before.map((item) => normalizeValue(item)));
  const afterSet = new Set(after.map((item) => normalizeValue(item)));
  return {
    label,
    before,
    after,
    added: after.filter((item) => !beforeSet.has(normalizeValue(item))),
    removed: before.filter((item) => !afterSet.has(normalizeValue(item))),
    changed: before.join(' · ') !== after.join(' · '),
  };
}

function buildWindowChange(beforeWindows = {}, afterWindows = {}) {
  return ['early', 'mid', 'late'].map((key) => ({
    key,
    before: beforeWindows[key]?.label || 'Sin definir',
    after: afterWindows[key]?.label || 'Sin definir',
    changed: !compareText(beforeWindows[key]?.label, afterWindows[key]?.label),
  }));
}

function buildChangedFields(changes) {
  return uniqueOrdered(
    changes
      .filter((change) => change.changed)
      .map((change) => change.label)
  );
}

function buildSimulationDiff(beforeAnalysis = {}, afterAnalysis = {}) {
  return compareAnalyses(beforeAnalysis, afterAnalysis);
}

function replaceChampionByRole(selectedChampions = [], role, replacementChampion = {}) {
  const normalizedRole = normalizeRole(role);
  const draft = cloneDraft(selectedChampions);
  const replacement = cloneChampion({
    ...replacementChampion,
    role: replacementChampion.role || role,
  });

  let applied = false;
  const nextDraft = draft.map((champion) => {
    if (!applied && normalizedRole && normalizeRole(champion.role) === normalizedRole) {
      applied = true;
      return {
        ...replacement,
        role: champion.role || replacement.role,
      };
    }
    return champion;
  });

  if (!applied && replacement.champion) {
    nextDraft.push(replacement);
  }

  return {
    selectedChampions: nextDraft,
    applied,
    replacedRole: normalizedRole || null,
    replacementChampion: replacement,
  };
}

export function simulateDraftChange(selectedChampions = [], mutation = {}) {
  const beforeDraft = cloneDraft(selectedChampions);
  const role = mutation.role || mutation.slotRole || mutation.targetRole || mutation.replaceRole || '';
  const replacementChampion = mutation.replacementChampion || mutation.champion || mutation.targetChampion || mutation.newChampion || {};
  const mutationResult = replaceChampionByRole(beforeDraft, role, replacementChampion);
  const afterDraft = mutationResult.selectedChampions;

  const beforeAnalysis = analyzeComposition(beforeDraft);
  const afterAnalysis = analyzeComposition(afterDraft);
  const diff = buildSimulationDiff(beforeAnalysis, afterAnalysis);

  return {
    mutation: {
      role: mutationResult.replacedRole,
      applied: mutationResult.applied,
      replacementChampion: mutationResult.replacementChampion,
    },
    beforeDraft,
    afterDraft,
    beforeAnalysis,
    afterAnalysis,
    diff,
  };
}

export function simulateChampionSwap(selectedChampions = [], role, replacementChampion = {}) {
  return simulateDraftChange(selectedChampions, {
    role,
    replacementChampion,
  });
}

export { buildSimulationDiff, cloneDraft, replaceChampionByRole };
