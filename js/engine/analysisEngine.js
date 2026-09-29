import { clampNumber, ENGINE_VERSION, matchesCategory, normalizeText } from './utils.js';
import { summarizeIdentities } from './identityEngine.js';
import { summarizeStrengths } from './strengthEngine.js';
import { summarizeWeaknesses } from './weaknessEngine.js';
import { summarizeTempo } from './tempoEngine.js';
import { buildGamePlan } from './planEngine.js';

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

function buildSummaryText(identitySummary, tempoSummary) {
  const parts = [identitySummary.primary?.label || 'Sin definir'];

  if (identitySummary.secondary.length) {
    parts.push(`Secundarias: ${identitySummary.secondary.slice(0, 2).map((item) => item.label).join(' · ')}`);
  }

  if (tempoSummary?.label && tempoSummary.label !== 'Sin definir') {
    parts.push(`Tempo: ${tempoSummary.label}`);
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

function computeConfidence(identitySummary, tempoSummary, strengths, weaknesses) {
  const analysisWeight = strengths.reduce((sum, item) => sum + (item?.score || 0), 0) + weaknesses.reduce((sum, item) => sum + (item?.score || 0), 0);
  const raw = (identitySummary.confidence * 0.45) + (tempoSummary.confidence * 0.25) + Math.min(35, analysisWeight * 1.2);
  return clampNumber(Math.round(raw), 0, 100);
}

export function analyzeComposition(selectedChampions = []) {
  const safeChampions = Array.isArray(selectedChampions) ? selectedChampions : [];
  const identitySummary = summarizeIdentities(safeChampions);
  const strengths = summarizeStrengths(safeChampions, 4);
  const weaknesses = summarizeWeaknesses(safeChampions, 3);
  const tempoSummary = summarizeTempo(safeChampions);
  const gamePlan = buildGamePlan(identitySummary.primary.label, tempoSummary.label, strengths, weaknesses);
  const secondaryIdentities = identitySummary.secondary.map((item) => item.label).filter(Boolean);
  const profiles = safeChampions.map(buildChampionProfile);
  const metrics = buildAggregateMetrics(profiles);
  const damageSplit = buildDamageSplit(safeChampions);
  const confidence = computeConfidence(identitySummary, tempoSummary, strengths, weaknesses);

  return {
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
    summaryText: buildSummaryText(identitySummary, tempoSummary),
    identityBreakdown: identitySummary.ranked,
    tempoBreakdown: tempoSummary.ranked,
    metrics,
    profiles,
    damageSplit,
  };
}
