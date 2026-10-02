import { buildRankedList, cleanText, clamp, gradeFromScore, labelFromConfidence, uniqueValues } from './analysis-utils.js';
import { buildContextualNarrative } from './contextual-engine.js';

export function buildAnalysisStory(report = {}) {
  const identity = report.identity || {};
  const score = report.score || {};
  const contextual = buildContextualNarrative(report);
  const strategic = report.strategic || contextual.reasoning || null;
  if (strategic) contextual.reasoning = strategic;
  const banRecommendations = report.banRecommendations || report.bans || null;
  const confidence = clamp(score.value ?? report.confidence ?? 0, 0, 100);
  const primaryIdentity = cleanText(identity.primaryIdentity || report.primaryIdentity || 'Sin definir');
  const winLabel = cleanText(report.winConditions?.[0]?.label || identity.winLabel || 'Jugar a tu plan');
  const title = cleanText(
    strategic?.focus
      ? `${primaryIdentity} · ${strategic.focus}`
      : contextual.headline || identity.title || report.executiveSummary?.title || `${primaryIdentity} · ${winLabel}`
  );
  const summaryText = cleanText(
    strategic?.summary || strategic?.claims?.[0]?.detail || contextual.lead || identity.summaryText || report.summaryText || report.executiveSummary?.text || 'Resumen compacto basado en la composición propia.'
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
  const strategicClaims = Array.isArray(strategic?.claims) ? strategic.claims : [];
  const bans = normalizeBans(banRecommendations);

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
      contextual.strategyProfile?.label,
      contextual.strategyProfile?.kind,
      strategic?.focus,
      banRecommendations?.focus,
      ...(Array.isArray(strategicClaims) ? strategicClaims.map((claim) => claim.label) : []),
      ...(Array.isArray(bans) ? bans.map((ban) => ban.champion) : []),
      ...(Array.isArray(report.tags) ? report.tags : []),
      ...(Array.isArray(contextual.tags) ? contextual.tags : []),
    ]).slice(0, 8),
    primaryIdentity,
    identityCopy: cleanText(identity.summaryText || report.summaryText || strategic?.summary || contextual.lead || summaryText),
    secondaryIdentities,
    strengths,
    weaknesses,
    synergies,
    risks,
    phases,
    tempo,
    dominance,
    contextual,
    strategic,
    bans,
    banFocus: cleanText(banRecommendations?.focus || strategic?.focus || ''),
    banSummary: cleanText(banRecommendations?.summary || ''),
  };
}

function normalizeBans(banRecommendations) {
  const source = Array.isArray(banRecommendations?.bans)
    ? banRecommendations.bans
    : Array.isArray(banRecommendations)
      ? banRecommendations
      : [];

  return source
    .slice(0, 5)
    .map((item, index) => ({
      champion: cleanText(item.champion || item.name || item.label || 'Sin definir'),
      reason: cleanText(item.reason || item.detail || item.summary || ''),
      priority: cleanText(item.priority || (index === 0 ? 'critical' : 'high')),
      score: clamp(Number(item.score ?? item.weight ?? 0), 0, 100),
      tags: uniqueValues(Array.isArray(item.tags) ? item.tags : []),
    }))
    .filter((item) => item.champion);
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
