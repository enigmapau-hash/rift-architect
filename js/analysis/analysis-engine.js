import { analyzeComposition as analyzeCompositionEngine } from '../analyzer.js';
import { buildCompositionProfile } from './composition-profile.js';
import { uniqueValues } from './analysis-utils.js';
import { buildStrategicReasoning } from './strategic-engine.js?v=98';
import { buildBanRecommendations } from './ban-engine.js';
import { buildIdentityReport } from './identity-engine.js';
import { buildStrengthsReport } from './strengths-engine.js';
import { buildWeaknessReport } from './weakness-engine.js';
import { buildGamePlanReport } from './gameplan-engine.js';
import { buildTimelineReport } from './timeline-engine.js';
import { buildScoreReport } from './score-engine.js';
import { buildKnowledgeV3Context } from '../../knowledge/knowledge-v3-context.js?v=98';

const ANALYSIS_CACHE = new Map();
const ANALYSIS_CACHE_LIMIT = 32;

export function runAnalysis(selectedChampions = []) {
  const cacheKey = buildAnalysisCacheKey(selectedChampions);
  const cached = ANALYSIS_CACHE.get(cacheKey);
  if (cached) return cached;

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
    gameplan,
    timeline,
    score,
  });
  const knowledgeV3 = buildKnowledgeV3Context(
    {
      ...baseAnalysis,
      composition,
      identity,
      strategic,
      score,
      strengths: strengthsReport.items,
      weaknesses: weaknessReport.items,
      synergies,
      risks,
    },
    composition,
    strategic
  );

  const analysis = {
    ...baseAnalysis,
    composition,
    identity,
    strengths: strengthsReport.items,
    weaknesses: weaknessReport.items,
    gameplan,
    timeline,
    score,
    strategic,
    knowledgeV3,
    synergyHighlights: synergies,
    riskHighlights: risks,
    banRecommendations: buildBanRecommendations(baseAnalysis, composition),
  };

  ANALYSIS_CACHE.set(cacheKey, analysis);
  if (ANALYSIS_CACHE.size > ANALYSIS_CACHE_LIMIT) {
    const oldestKey = ANALYSIS_CACHE.keys().next().value;
    ANALYSIS_CACHE.delete(oldestKey);
  }

  return analysis;
}

export function invalidateAnalysisCache() {
  ANALYSIS_CACHE.clear();
}

function buildAnalysisCacheKey(selectedChampions = []) {
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
