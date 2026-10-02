import { buildRankedList, uniqueValues } from './analysis-utils.js';

export function buildWeaknessReport(baseAnalysis = {}, composition = {}) {
  const source = uniqueValues([
    ...(Array.isArray(baseAnalysis.weaknesses) ? baseAnalysis.weaknesses : []),
    ...(Array.isArray(baseAnalysis.risks) ? baseAnalysis.risks : []),
    ...(Array.isArray(baseAnalysis.threats) ? baseAnalysis.threats : []),
    ...(Array.isArray(composition.missingRoles) ? composition.missingRoles.map((role) => `Falta ${role}`) : []),
  ]);

  const items = buildRankedList(source, 'A vigilar', 'Te expone si lo fuerzas mal.', 72);
  const threats = uniqueValues([
    ...(Array.isArray(baseAnalysis.threats) ? baseAnalysis.threats : []),
    ...(Array.isArray(baseAnalysis.risks) ? baseAnalysis.risks : []),
    ...(Array.isArray(baseAnalysis.coherence?.conflicts) ? baseAnalysis.coherence.conflicts : []),
  ]).slice(0, 3);

  return {
    items,
    threats,
  };
}
