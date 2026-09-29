import { ENGINE_VERSION } from './utils.js';
import { summarizeIdentities } from './identityEngine.js';
import { summarizeStrengths } from './strengthEngine.js';
import { summarizeWeaknesses } from './weaknessEngine.js';
import { summarizeTempo } from './tempoEngine.js';
import { buildGamePlan } from './planEngine.js';

function buildSummaryText(primaryIdentity, secondaryIdentities, tempo) {
  const parts = [primaryIdentity || 'Sin definir'];
  if (secondaryIdentities.length) {
    parts.push(`Secundarias: ${secondaryIdentities.slice(0, 2).join(' · ')}`);
  }
  if (tempo && tempo !== 'Sin definir') {
    parts.push(`Tempo: ${tempo}`);
  }
  return parts.join(' · ');
}

export function analyzeComposition(selectedChampions = []) {
  const identitySummary = summarizeIdentities(selectedChampions);
  const strengths = summarizeStrengths(selectedChampions, 4);
  const weaknesses = summarizeWeaknesses(selectedChampions, 3);
  const tempo = summarizeTempo(selectedChampions);
  const gamePlan = buildGamePlan(identitySummary.primary.label, tempo, strengths, weaknesses);
  const secondaryIdentities = identitySummary.secondary.map((item) => item.label).filter(Boolean);

  return {
    engineVersion: ENGINE_VERSION,
    primaryIdentity: identitySummary.primary.label,
    secondaryIdentities,
    strengths,
    weaknesses,
    tempo,
    gamePlan,
    summaryText: buildSummaryText(identitySummary.primary.label, secondaryIdentities, tempo),
  };
}
