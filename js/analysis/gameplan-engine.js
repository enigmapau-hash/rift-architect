import { cleanText, uniqueValues } from './analysis-utils.js';

export function buildGamePlanReport(baseAnalysis = {}, composition = {}) {
  const coachPhases = Array.isArray(baseAnalysis.coach?.phases) ? baseAnalysis.coach.phases : [];
  if (coachPhases.length >= 3) {
    return {
      phases: coachPhases.slice(0, 3).map((phase, index) => ({
        phase: phase.phase || ['EARLY (0–10)', 'MID (10–20)', 'LATE (20+)'][index],
        title: cleanText(phase.title || phase.label || 'Ajusta tu plan'),
        detail: cleanText(phase.detail || 'Sigue la condición de victoria principal.'),
        actions: uniqueValues(Array.isArray(phase.actions) ? phase.actions : []).slice(0, 3),
      })),
      focus: cleanText(baseAnalysis.coach?.focus || baseAnalysis.coherence?.label || 'Ejecuta el plan'),
    };
  }

  const gamePlan = Array.isArray(baseAnalysis.gamePlan) ? baseAnalysis.gamePlan : [];

  return {
    phases: [
      {
        phase: 'EARLY (0–10)',
        title: cleanText(gamePlan[0] || 'Gana tiempo'),
        detail: 'Evita regalar ventajas y prepara tu ventana real.',
        actions: ['Visión', 'Tempo', 'Primer objetivo'],
      },
      {
        phase: 'MID (10–20)',
        title: cleanText(gamePlan[1] || 'Convierte ventaja'),
        detail: 'Transforma tu plan en mapa y objetivos.',
        actions: ['Agrupar', 'Pick', 'Objetivos'],
      },
      {
        phase: 'LATE (20+)',
        title: cleanText(gamePlan[2] || 'Cierra limpio'),
        detail: 'Juega tu condición de victoria principal sin improvisar.',
        actions: ['Proteger carry', 'Teamfight', 'Cerrar'],
      },
    ],
    focus: cleanText(baseAnalysis.coherence?.label || composition.primaryChampion?.identity || 'Ejecuta el plan'),
  };
}
