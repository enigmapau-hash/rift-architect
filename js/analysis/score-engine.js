import { clamp, gradeFromScore, labelFromConfidence, uniqueValues } from './analysis-utils.js';

export function buildScoreReport(baseAnalysis = {}, composition = {}) {
  const value = clamp(
    baseAnalysis.executiveSummary?.score ?? baseAnalysis.confidence ?? baseAnalysis.score ?? 0,
    0,
    100
  );

  return {
    value,
    grade: gradeFromScore(value),
    badge: labelFromConfidence(value),
    tone: value >= 85 ? 'is-strong' : value >= 70 ? 'is-mid' : 'is-low',
    tags: uniqueValues([
      gradeFromScore(value),
      labelFromConfidence(value),
      ...(Array.isArray(composition.names) ? composition.names : []),
    ]).slice(0, 4),
  };
}
