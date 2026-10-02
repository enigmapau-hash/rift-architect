import { buildRankedList, uniqueValues } from './analysis-utils.js';

export function buildStrengthsReport(baseAnalysis = {}, composition = {}) {
  const source = uniqueValues([
    ...(Array.isArray(baseAnalysis.strengths) ? baseAnalysis.strengths : []),
    ...(Array.isArray(composition.functions) ? composition.functions : []),
    ...(Array.isArray(composition.identities) ? composition.identities : []),
  ]);

  const items = buildRankedList(source, 'Apoya el plan', 'Apoya la condición principal.', 92);

  return {
    items,
    highlights: items.map((item) => item.label),
    tags: uniqueValues([
      ...(Array.isArray(composition.functions) ? composition.functions : []),
      ...(Array.isArray(composition.identities) ? composition.identities : []),
      ...(Array.isArray(baseAnalysis.tags) ? baseAnalysis.tags : []),
    ]).slice(0, 4),
  };
}
