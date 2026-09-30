import { clampNumber, ENGINE_VERSION, matchesCategory } from './utils.js';
import { summarizeIdentities } from './identityEngine.js';
import { summarizeStrengths } from './strengthEngine.js';
import { summarizeWeaknesses } from './weaknessEngine.js';
import { summarizeTempo } from './tempoEngine.js';
import { summarizeSynergies } from './synergyEngine.js';
import { summarizeDependencies } from './dependencyEngine.js';
import { evaluateCoherence } from './coherenceEngine.js';
import { determineWinCondition } from './winConditionEngine.js';
import { buildGamePlan } from './planEngine.js';
import { buildExplainability } from './explainabilityEngine.js';
import { buildCoach } from './coachEngine.js';
import { buildStrategicAdvisor } from './strategicAdvisor.js';
import { buildExecutiveSummary } from './executiveSummary.js';
import { buildDecisionFlowBase } from './decisionFlow.js';

const METRIC_LABELS = {
  frontline: 'Frontline',
  engage: 'Engage',
  damage: 'Daño',
  scaling: 'Escalado',
  objective: 'Objetivos',
  control: 'Control',
  teamfight: 'Teamfight',
  poke: 'Poke',
  mobility: 'Movilidad',
  pick: 'Pick',
  splitpush: 'Splitpush',
};

const METRIC_KEYS = Object.keys(METRIC_LABELS);
const DAMAGE_AP_TERMS = ['mage', 'battlemage', 'artillery', 'enchanter', 'burst', 'magic', 'ap'];
const DAMAGE_AD_TERMS = ['marksman', 'fighter', 'bruiser', 'assassin', 'duelist', 'ad', 'adc'];

function buildSummaryText(identitySummary, tempoSummary, coherence, winCondition, synergies, dependencies) {
  const parts = [identitySummary.primary?.label || 'Sin definir'];

  if (identitySummary.secondary.length) {
    parts.push(`Secundarias: ${identitySummary.secondary.slice(0, 2).map((item) => item.label).join(' · ')}`);
  }

  if (tempoSummary?.label && tempoSummary.label !== 'Sin definir') {
    parts.push(`Tempo: ${tempoSummary.label}`);
  }

  if (coherence?.label) {
    parts.push(`Coherencia: ${coherence.label}`);
  }

  if (winCondition?.label) {
    parts.push(`Victoria: ${winCondition.label}`);
  }

  if (synergies?.length) {
    parts.push(`Sinergia: ${synergies[0].label}`);
  }

  if (dependencies?.items?.length) {
    parts.push(`Dependencia: ${dependencies.items[0].label}`);
  }

  if (identitySummary.dominance === 'hybrid') {
    parts.push('Perfil híbrido');
  } else if (identitySummary.dominance === 'dominant') {
    parts.push('Identidad dominante');
  }

  return parts.join(' · ');
}

function buildChampionText(champion) {
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

function scoreMetric(champion, key) {
  const sources = [
    { value: champion?.identity, weight: 5 },
    { value: champion?.function, weight: 4 },
    { value: champion?.tempo, weight: 3 },
    ...((Array.isArray(champion?.strengths) ? champion.strengths : []).map((value) => ({ value, weight: 2 }))),
    ...((Array.isArray(champion?.weaknesses) ? champion.weaknesses : []).map((value) => ({ value, weight: 1 }))),
  ];

  const score = sources.reduce((total, source) => {
    return total + (matchesCategory(source.value, key) ? source.weight : 0);
  }, 0);

  return Math.min(10, score);
}

function buildChampionProfile(champion) {
  return {
    champion: champion?.champion || champion?.displayName || 'Sin definir',
    profile: {
      damageType: detectDamageType(champion),
      metrics: METRIC_KEYS.map((key) => ({
        key,
        label: METRIC_LABELS[key],
        score: scoreMetric(champion, key),
      })),
    },
  };
}

function detectDamageType(champion) {
  const text = buildChampionText(champion);
  const hasAp = DAMAGE_AP_TERMS.some((term) => text.includes(term));
  const hasAd = DAMAGE_AD_TERMS.some((term) => text.includes(term));

  if (hasAp && hasAd) return 'hybrid';
  if (hasAp) return 'ap';
  if (hasAd) return 'ad';
  return 'hybrid';
}

function buildDamageSplit(selectedChampions) {
  return selectedChampions.reduce(
    (acc, champion) => {
      const type = detectDamageType(champion);
      acc[type] += 1;
      return acc;
    },
    { ap: 0, ad: 0, hybrid: 0 }
  );
}

function buildAggregateMetrics(profiles) {
  if (!profiles.length) return [];

  return METRIC_KEYS.map((key) => {
    const scores = profiles.map((entry) => entry.profile.metrics.find((metric) => metric.key === key)?.score ?? 0);
    const total = scores.reduce((sum, score) => sum + score, 0);
    return {
      key,
      label: METRIC_LABELS[key],
      score: Math.round(total / profiles.length),
    };
  });
}

function computeConfidence(identitySummary, tempoSummary, coherence, synergies, winCondition, dependencies) {
  const identityScore = Number(identitySummary?.confidence) || 0;
  const tempoScore = Number(tempoSummary?.confidence) || 0;
  const coherenceScore = Number(coherence?.score) || 0;
  const synergyBonus = Math.min(16, (Array.isArray(synergies) ? synergies.length : 0) * 5);
  const dependencyBonus = Math.min(14, (Array.isArray(dependencies?.items) ? dependencies.items.length : 0) * 4);
  const winBonus = Math.min(10, (Array.isArray(winCondition?.priorities) ? winCondition.priorities.length : 0) * 3);
  const raw = identityScore * 0.3 + tempoScore * 0.2 + coherenceScore * 0.3 + synergyBonus + dependencyBonus + winBonus;
  return clampNumber(Math.round(raw), 0, 100);
}

export function analyzeComposition(selectedChampions = []) {
  const safeChampions = Array.isArray(selectedChampions) ? selectedChampions : [];
  const identitySummary = summarizeIdentities(safeChampions);
  const strengths = summarizeStrengths(safeChampions, 4);
  const weaknesses = summarizeWeaknesses(safeChampions, 3);
  const tempoSummary = summarizeTempo(safeChampions);
  const synergies = summarizeSynergies(safeChampions, identitySummary, strengths);
  const dependencies = summarizeDependencies(safeChampions, 4);
  const coherence = evaluateCoherence({ identitySummary, synergies, selectedChampions: safeChampions });
  const winCondition = determineWinCondition({ identitySummary, tempoSummary, synergies, coherence });
  const gamePlan = buildGamePlan(winCondition, strengths, weaknesses, tempoSummary, synergies, coherence);
  const secondaryIdentities = identitySummary.secondary.map((item) => item.label).filter(Boolean);
  const profiles = safeChampions.map(buildChampionProfile);
  const metrics = buildAggregateMetrics(profiles);
  const damageSplit = buildDamageSplit(safeChampions);
  const confidence = computeConfidence(identitySummary, tempoSummary, coherence, synergies, winCondition, dependencies);

  const analysis = {
    engineVersion: ENGINE_VERSION,
    primaryIdentity: identitySummary.primary.label,
    secondaryIdentities,
    strengths,
    weaknesses,
    tempo: tempoSummary.label,
    tempoDetail: tempoSummary,
    gamePlan,
    confidence,
    dominance: identitySummary.dominance,
    summaryText: buildSummaryText(identitySummary, tempoSummary, coherence, winCondition, synergies, dependencies),
    identityBreakdown: identitySummary.ranked,
    tempoBreakdown: tempoSummary.ranked,
    synergies,
    dependencies,
    coherence,
    winCondition,
    metrics,
    profiles,
    damageSplit,
  };

  analysis.explanation = buildExplainability(analysis, safeChampions);
  analysis.coach = buildCoach(analysis, safeChampions);
  analysis.advisor = buildStrategicAdvisor(analysis, safeChampions);
  analysis.assistant = {
    summary: analysis.advisor.summary,
    insights: analysis.coach.insights,
    alerts: analysis.coach.alerts,
    primaryObjective: analysis.advisor.primaryObjective,
    objectivePriority: analysis.advisor.objectivePriority,
    gameWindows: analysis.advisor.gameWindows,
    loseConditions: analysis.advisor.loseConditions,
  };
  analysis.summary = analysis.advisor.summary;
  analysis.executiveSummary = buildExecutiveSummary(analysis);
  analysis.draftProfile = analysis.executiveSummary.profile;
  analysis.priorities = analysis.executiveSummary.priorities;
  analysis.decisionFlowBase = buildDecisionFlowBase(analysis, safeChampions);

  return analysis;
}
