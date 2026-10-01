import { ENGINE_VERSION, normalizeText, normalizeTags, cleanLabel, normalizeIdentityLabel, normalizeTempoLabel, matchesCategory } from './engine/utils.js';
import { analyzeComposition as analyzeCompositionEngine } from './engine/analysisEngine.js';
import { buildUnifiedAnalysisModel } from './engine/unifiedAnalysisModel.js';
import { compareAnalyses, compareCompositions, buildComparisonSummary } from './engine/comparisonEngine.js';
import { simulateDraftChange, simulateChampionSwap } from './engine/simulationEngine.js';
import { buildExplainability as explainAnalysis } from './engine/explainabilityEngine.js';

export function analyzeComposition(selectedChampions = []) {
  const analysis = analyzeCompositionEngine(selectedChampions);
  const model = buildUnifiedAnalysisModel(analysis, selectedChampions);

  return {
    ...analysis,
    model,
    unified: model,
    analysisModel: model,
  };
}

export {
  ENGINE_VERSION,
  normalizeText,
  normalizeTags,
  cleanLabel,
  normalizeIdentityLabel,
  normalizeTempoLabel,
  matchesCategory,
  compareAnalyses,
  compareCompositions,
  buildComparisonSummary,
  simulateDraftChange,
  simulateChampionSwap,
  explainAnalysis,
};