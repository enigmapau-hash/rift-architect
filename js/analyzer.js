export { ENGINE_VERSION, normalizeText, normalizeTags, cleanLabel, normalizeIdentityLabel, normalizeTempoLabel, matchesCategory } from './engine/utils.js';
export { analyzeComposition } from './engine/analysisEngine.js';
export { compareAnalyses, compareCompositions, buildComparisonSummary } from './engine/comparisonEngine.js';
export { simulateDraftChange, simulateChampionSwap } from './engine/simulationEngine.js';
export { buildExplainability as explainAnalysis } from './engine/explainabilityEngine.js';
