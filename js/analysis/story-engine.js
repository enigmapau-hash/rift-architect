import { buildRankedList, cleanText, clamp, gradeFromScore, labelFromConfidence, uniqueValues } from './analysis-utils.js';
import { buildContextualNarrative } from './contextual-engine.js';

export function buildAnalysisStory(report = {}) {
  const identity = report.identity || {};
  const score = report.score || {};
  const contextual = buildContextualNarrative(report);
  const confidence = clamp(score.value ?? report.confidence ?? 0, 0, 100);
  const primaryIdentity = cleanText(identity.primaryIdentity || report.primaryIdentity || 'Sin definir');
  const winLabel = cleanText(report.winConditions?.[0]?.label || identity.winLabel || 'Jugar a tu plan');
  const title = cleanText(contextual.headline || identity.title || report.executiveSummary?.title || `${primaryIdentity} · ${winLabel}`);
  const summaryText = cleanText(
    contextual.lead || identity.summaryText || report.summaryText || report.executiveSummary?.text || 'Resumen compacto basado en la composición propia.'
  );
  const tempo = cleanText(identity.tempo || report.tempo || contextual.tempo || 'Tempo medio');
  const dominance = cleanText(identity.dominance || report.dominance || 'Sin definir');

  const secondaryIdentities = uniqueValues(identity.secondaryIdentities || report.secondaryIdentities || [])
    .filter((value) => value !== primaryIdentity)
    .slice(0, 3);

  const strengths = buildRankedList(report.strengths || [], 'Apoya el plan', 'Apoya la condición principal.', 92);
  const weaknesses = buildRankedList(report.weaknesses || [], 'A vigilar', 'Te expone si lo fuerzas mal.', 72);
  const synergies = uniqueValues(report.synergies || []).slice(0, 3);
  const risks = uniqueValues([...(Array.isArray(report.risks) ? report.risks : []), ...(Array.isArray(report.threats) ? report.threats : [])]).slice(0, 3);
  const phases = normalizePhases(report.timeline || report.gameplan?.phases || []);

  return {
    title,
    summaryText,
    confidence,
    scoreBadge: score.badge || labelFromConfidence(confidence),
    grade: score.grade || gradeFromScore(confidence),
    tags: uniqueValues([
      primaryIdentity,
      tempo,
      winLabel,
      identity.focus,
      identity.dominance,
      contextual.headline,
      contextual.winCondition?.label,
      ...(Array.isArray(report.tags) ? report.tags : []),
      ...(Array.isArray(contextual.tags) ? contextual.tags : []),
    ]).slice(0, 6),
    primaryIdentity,
    identityCopy: cleanText(identity.summaryText || report.summaryText || contextual.lead || summaryText),
    secondaryIdentities,
    strengths,
    weaknesses,
    synergies,
    risks,
    phases,
    tempo,
    dominance,
    contextual,
  };
}

function normalizePhases(phases = []) {
  return (Array.isArray(phases) ? phases : [])
    .slice(0, 3)
    .map((phase, index) => ({
      phase: cleanText(phase.phase || phase.window || ['EARLY (0–10)', 'MID (10–20)', 'LATE (20+)'][index]),
      title: cleanText(phase.title || phase.label || 'Ajusta tu plan'),
      detail: cleanText(phase.detail || 'Sigue la condición de victoria principal.'),
      actions: uniqueValues(Array.isArray(phase.actions) ? phase.actions : []).slice(0, 3),
    }));
}
