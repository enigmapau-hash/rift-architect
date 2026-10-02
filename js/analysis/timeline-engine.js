import { cleanText, uniqueValues } from './analysis-utils.js';

export function buildTimelineReport(gameplanReport = {}, baseAnalysis = {}) {
  const phases = Array.isArray(gameplanReport.phases) ? gameplanReport.phases : [];

  return phases.map((phase, index) => ({
    index,
    window: cleanText(phase.phase || `Fase ${index + 1}`),
    title: cleanText(phase.title || phase.label || 'Ajusta tu plan'),
    detail: cleanText(phase.detail || 'Sigue la condición de victoria principal.'),
    actions: uniqueValues(Array.isArray(phase.actions) ? phase.actions : []).slice(0, 3),
    tempo: cleanText(baseAnalysis.tempoDetail?.label || baseAnalysis.tempo || 'Tempo medio'),
  }));
}
