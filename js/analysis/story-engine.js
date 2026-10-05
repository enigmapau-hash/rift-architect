import { normalizeText } from '../engine/utils.js';
import { buildContextualNarrative } from './contextual-engine.js';
import { buildRankedList, cleanText, clamp, gradeFromScore, labelFromConfidence, uniqueValues } from './analysis-utils.js';
import { buildKnowledgeV3Context } from '../../knowledge/knowledge-v3-context.js?v=115';

export function buildAnalysisStory(report = {}) {
  const identity = report.identity || {};
  const score = report.score || {};
  const contextual = buildContextualNarrative(report);
  const strategic = report.strategic || contextual.reasoning || null;
  const knowledgeV3 = report.knowledgeV3 || buildKnowledgeV3Context(report, report.composition || {}, strategic || contextual);

  if (strategic) contextual.reasoning = strategic;

  const banRecommendations = report.banRecommendations || report.bans || null;
  const confidence = clamp(score.value ?? report.confidence ?? 0, 0, 100);
  const primaryIdentity = cleanText(identity.primaryIdentity || report.primaryIdentity || 'Sin definir');
  const winLabel = cleanText(report.winConditions?.[0]?.label || identity.winLabel || 'Jugar a tu plan');
  const strategicFocus = cleanText(strategic?.focus || contextual.headline || identity.title || report.executiveSummary?.title || winLabel);

  const title = buildStoryTitle(primaryIdentity, strategicFocus, winLabel);
  const summaryText = buildNarrativeSummary([
    strategic?.summary,
    strategic?.focus,
    knowledgeV3?.summary,
    knowledgeV3?.lead,
    strategic?.execution?.detail,
    strategic?.contingency?.detail,
    strategic?.adaptation?.detail,
    strategic?.claims?.[0]?.detail,
    contextual.lead,
    contextual.summary,
    identity.summaryText,
    report.summaryText,
    report.executiveSummary?.text,
    'Resumen compacto basado en la composición propia.',
  ]);
  const tempo = cleanText(identity.tempo || report.tempo || contextual.tempo || 'Tempo medio');
  const dominance = cleanText(identity.dominance || report.dominance || 'Sin definir');

  const secondaryIdentities = uniqueValues(identity.secondaryIdentities || report.secondaryIdentities || [])
    .filter((value) => value !== primaryIdentity)
    .slice(0, 3);

  const strengths = buildRankedList(report.strengths || [], 'Apoya el plan', 'Suma valor cuando juegas alrededor de esta pieza.', 92);
  const weaknesses = buildRankedList(report.weaknesses || [], 'A vigilar', 'Si lo fuerzas, te expone antes de tiempo.', 72);
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
    tags: buildStoryTags({
      primaryIdentity,
      tempo,
      winLabel,
      identity,
      contextual,
      strategic,
      knowledgeV3,
      strategicClaims,
      bans,
      report,
    }),
    primaryIdentity,
    identityCopy: cleanText(identity.summaryText || contextual.lead || strategic?.summary || knowledgeV3?.summary || summaryText),
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
    knowledgeV3,
    bans,
    banFocus: cleanText(banRecommendations?.focus || strategic?.focus || ''),
    banSummary: cleanText(banRecommendations?.summary || ''),
  };
}

function buildStoryTitle(primaryIdentity, focus, winLabel) {
  const identity = cleanText(primaryIdentity);
  const strategicFocus = cleanText(focus);
  const win = cleanText(winLabel);
  const identityKey = normalizeText(identity);
  const focusKey = normalizeText(strategicFocus);

  if (!identity && !strategicFocus) return win || 'Análisis de composición';
  if (!strategicFocus) return identity || win || 'Análisis de composición';
  if (focusKey === identityKey) return identity || strategicFocus;
  if (identityKey && focusKey.startsWith(`${identityKey} `)) return strategicFocus;

  if (identityKey && strategicFocus.includes('·')) {
    const parts = strategicFocus.split('·').map((part) => cleanText(part)).filter(Boolean);
    if (parts.length === 2 && normalizeText(parts[0]) === identityKey && normalizeText(parts[1]) === identityKey) {
      return identity;
    }
  }

  return identity ? `${identity} · ${strategicFocus}` : strategicFocus;
}

function buildNarrativeSummary(parts = []) {
  const seen = new Set();
  const selected = [];

  for (const part of parts) {
    const text = cleanText(part);
    if (!text || isNarrativeNoise(text)) continue;
    const normalized = normalizeText(text);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    selected.push(text);
    if (selected.length >= 1) break;
  }

  return selected.length ? selected[0] : 'Resumen compacto basado en la composición propia.';
}

function isNarrativeNoise(text) {
  const normalized = normalizeText(text);
  if (!normalized) return true;

  return [
    'resumen compacto basado en la composicion propia',
    'la composicion todavia no define una narrativa dominante',
    'juega alrededor de tu plan dominante y evita pelear sin ventaja clara',
    'tu macro debe seguir la identidad dominante y el mapa no al reves',
  ].includes(normalized);
}

function buildStoryTags({ primaryIdentity, tempo, winLabel, contextual, strategic, knowledgeV3, strategicClaims, bans, report }) {
  const candidates = [
    primaryIdentity,
    tempo,
    winLabel,
    contextual?.headline,
    contextual?.winCondition?.label,
    contextual?.strategyProfile?.label,
    contextual?.strategyProfile?.kind,
    strategic?.focus,
    strategic?.execution?.label,
    strategic?.robustnessSummary?.label,
    strategic?.flexibilitySummary?.label,
    strategic?.contingency?.label,
    strategic?.adaptation?.label,
    strategic?.metrics?.dominantWindow,
    knowledgeV3?.primaryStyle?.label,
    knowledgeV3?.matchup?.label,
    knowledgeV3?.macro?.label,
    knowledgeV3?.vision?.label,
    knowledgeV3?.tempo?.label,
    knowledgeV3?.objectives?.label,
    knowledgeV3?.victory?.label,
    knowledgeV3?.defeat?.label,
    banLabelList(bans),
    ...(Array.isArray(strategicClaims) ? strategicClaims.map((claim) => claim.label) : []),
    ...(Array.isArray(report.tags) ? report.tags : []),
    ...(Array.isArray(contextual?.tags) ? contextual.tags : []),
    ...(Array.isArray(knowledgeV3?.tags) ? knowledgeV3.tags : []),
  ];

  return uniqueValues(candidates.map((value) => cleanText(value)).filter(Boolean)).slice(0, 9);
}

function normalizePhases(phases = []) {
  if (!Array.isArray(phases)) return [];
  return phases
    .map((phase) => {
      if (!phase) return null;
      if (typeof phase === 'string') return { label: phase, detail: '' };
      return {
        label: cleanText(phase.label || phase.name || phase.title || ''),
        detail: cleanText(phase.detail || phase.description || phase.summary || ''),
      };
    })
    .filter(Boolean);
}

function normalizeBans(bans = null) {
  if (!bans) return [];
  const list = Array.isArray(bans) ? bans : (Array.isArray(bans.bans) ? bans.bans : []);
  return list
    .map((entry) => {
      if (!entry) return null;
      if (typeof entry === 'string') return { champion: cleanText(entry), reason: '' };
      return {
        champion: cleanText(entry.champion || entry.name || ''),
        reason: cleanText(entry.reason || entry.detail || ''),
      };
    })
    .filter((entry) => entry && entry.champion);
}

function banLabelList(bans = []) {
  return (Array.isArray(bans) ? bans : [])
    .map((ban) => cleanText(ban?.champion || ban?.name || ban))
    .filter(Boolean)
    .join(', ');
}
