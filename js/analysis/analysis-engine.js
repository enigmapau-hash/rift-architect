import { analyzeComposition as analyzeCompositionEngine } from '../analyzer.js';
import { buildCompositionProfile } from './composition-profile.js';
import { uniqueValues } from './analysis-utils.js';
import { buildStrategicReasoning } from './strategic-engine.js?v=89';
import { buildBanRecommendations } from './ban-engine.js';
import { buildIdentityReport } from './identity-engine.js';
import { buildStrengthsReport } from './strengths-engine.js';
import { buildWeaknessReport } from './weakness-engine.js';
import { buildGamePlanReport } from './gameplan-engine.js';
import { buildTimelineReport } from './timeline-engine.js';
import { buildScoreReport } from './score-engine.js';

export function runAnalysis(selectedChampions = []) {
  const composition = buildCompositionProfile(selectedChampions);
  const baseAnalysis = analyzeCompositionEngine(composition.selectedChampions);

  const identity = buildIdentityReport(baseAnalysis, composition);
  const strengthsReport = buildStrengthsReport(baseAnalysis, composition);
  const weaknessReport = buildWeaknessReport(baseAnalysis, composition);
  const gameplan = buildGamePlanReport(baseAnalysis, composition);
  const timeline = buildTimelineReport(gameplan, baseAnalysis, composition);
  const score = buildScoreReport(baseAnalysis, composition);

  const synergies = uniqueValues([
    ...(Array.isArray(baseAnalysis.synergies) ? baseAnalysis.synergies : []),
    ...(Array.isArray(baseAnalysis.dependencies?.items) ? baseAnalysis.dependencies.items : []),
  ]).slice(0, 4);

  const risks = uniqueValues([
    ...(Array.isArray(baseAnalysis.coherence?.conflicts) ? baseAnalysis.coherence.conflicts : []),
    ...(Array.isArray(weaknessReport.threats) ? weaknessReport.threats : []),
  ]).slice(0, 4);

  const strategic = buildStrategicReasoning({
    ...baseAnalysis,
    composition,
    identity,
    strengths: strengthsReport.items,
    weaknesses: weaknessReport.items,
    synergies,
    risks,
    score,
  });

  const banRecommendations = buildBanRecommendations({
    ...baseAnalysis,
    composition,
    identity,
    strengths: strengthsReport.items,
    weaknesses: weaknessReport.items,
    synergies,
    risks,
    score,
    strategic,
  });

  const winConditions = normalizeWinConditions(baseAnalysis);
  const tags = uniqueValues([
    ...composition.tags,
    ...identity.tags,
    ...score.tags,
    ...(Array.isArray(strengthsReport.highlights) ? strengthsReport.highlights : []),
    ...(Array.isArray(weaknessReport.threats) ? weaknessReport.threats : []),
    strategic.focus,
    ...(Array.isArray(strategic.claims) ? strategic.claims.map((claim) => claim.label) : []),
    banRecommendations.focus,
    ...(Array.isArray(banRecommendations.bans) ? banRecommendations.bans.map((ban) => ban.champion) : []),
  ]).slice(0, 10);

  const report = {
    composition,
    rawAnalysis: baseAnalysis,
    identity,
    strengths: strengthsReport.items,
    strengthsReport,
    weaknesses: weaknessReport.items,
    weaknessReport,
    gameplan,
    timeline,
    score,
    winConditions,
    synergies,
    risks,
    tags,
    strategic,
    banRecommendations,
    primaryIdentity: identity.primaryIdentity,
    secondaryIdentities: identity.secondaryIdentities,
    summaryText: identity.summaryText,
    tempo: identity.tempo,
    dominance: identity.dominance,
    confidence: score.value,
    executiveSummary: {
      title: identity.title,
      text: identity.summaryText,
      score: score.value,
    },
    coach: { phases: gameplan.phases, focus: gameplan.focus },
    gamePlan: gameplan.phases.map((phase) => phase.title),
    threats: weaknessReport.threats,
  };

  return report;
}

export const analyze = runAnalysis;

function normalizeWinConditions(baseAnalysis = {}) {
  const current = baseAnalysis?.winConditions || baseAnalysis?.winCondition;
  const items = Array.isArray(current) ? current : current ? [current] : [];

  return items.map((item) => ({
    label: toText(item?.label ?? item?.title ?? item?.name ?? item),
    detail: toText(item?.detail ?? item?.text ?? item?.summary ?? ''),
  }));
}

function toText(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(toText).filter(Boolean).join(' · ');
  if (typeof value === 'object') {
    return toText(
      value.label ??
        value.name ??
        value.title ??
        value.text ??
        value.value ??
        value.detail ??
        value.summary ??
        value.reason ??
        value.description ??
        value.champion ??
        value.item ??
        ''
    );
  }
  return String(value).trim();
}