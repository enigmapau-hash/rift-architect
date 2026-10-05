import { normalizeText } from '../engine/utils.js';
import { buildContextualNarrative } from './contextual-engine.js';
import { cleanText, gradeFromScore, labelFromConfidence, uniqueValues } from './analysis-utils.js';
import { buildKnowledgeV3Context } from '../../knowledge/knowledge-v3-context.js?v=115';

export const ANALYSIS_CONTRACT_SPECS = {
  compositionProfile: [
    'slots',
    'selectedChampions',
    'count',
    'complete',
    'roles',
    'missingRoles',
    'names',
    'identities',
    'functions',
    'tempos',
    'tags',
    'primaryChampion',
  ],
  strategicEngine: [
    'focus',
    'headline',
    'summary',
    'claims',
    'dependencies',
    'cascades',
    'redundancies',
    'powerSpikes',
    'conflicts',
    'risks',
    'robustness',
    'flexibility',
    'contingencies',
    'adaptations',
    'profiles',
    'anchors',
    'windows',
    'dominantWindow',
    'signals',
    'profile',
    'metrics',
    'execution',
    'robustnessSummary',
    'flexibilitySummary',
    'contingency',
    'adaptation',
  ],
  knowledgeLayer: [
    'primaryStyle',
    'rivalStyle',
    'matchup',
    'style',
    'macro',
    'vision',
    'tempo',
    'objectives',
    'victory',
    'defeat',
    'mistake',
    'lead',
    'summary',
    'rules',
    'claims',
    'tags',
    'signals',
  ],
  banEngine: ['title', 'summary', 'focus', 'profile', 'bans', 'tags', 'signals'],
  lastPick: [
    'title',
    'summary',
    'focus',
    'targetRole',
    'targetRoleLabel',
    'profile',
    'strategicProfile',
    'recommendations',
    'bestPick',
    'alternatives',
    'tags',
  ],
};

export function buildAnalysisReportContract(report = {}, mode = 'analysis') {
  const identity = report.identity || {};
  const score = report.score || {};
  const contextual = buildContextualNarrative(report);
  const strategic = report.strategic || contextual.reasoning || null;
  const knowledgeV3 = report.knowledgeV3 || buildKnowledgeV3Context(report, report.composition || {}, strategic || contextual);

  if (strategic) contextual.reasoning = strategic;

  const banRecommendations = report.banRecommendations || report.bans || null;
  const confidence = clamp(score.value ?? report.confidence ?? 0, 0, 100);
  const scoreBadge = cleanText(score.badge || labelFromConfidence(confidence));
  const primaryIdentity = cleanText(identity.primaryIdentity || report.primaryIdentity || 'Sin definir');
  const winLabel = cleanText(report.winConditions?.[0]?.label || identity.winLabel || 'Jugar a tu plan');
  const strategicFocus = cleanText(strategic?.focus || contextual.headline || identity.title || report.executiveSummary?.title || winLabel);
  const coreTheme = pickCoreTheme(strategicFocus, primaryIdentity, contextual, strategic, knowledgeV3, winLabel);
  const targetRole = mode === 'last-pick' ? cleanText(report.targetRole || report.targetRoleLabel || '') : '';
  const targetRoleLabel = mode === 'last-pick' ? cleanText(report.targetRoleLabel || report.targetRole || '') : '';

  const summaryText = buildNarrativeSummary([
    coreTheme,
    strategic?.summary,
    identity.summaryText,
    contextual.lead,
    knowledgeV3?.summary,
    report.summaryText,
    report.executiveSummary?.text,
  ]);
  const title = buildStoryTitle(primaryIdentity, coreTheme, winLabel);
  const tempo = cleanText(identity.tempo || report.tempo || contextual.tempo || 'Tempo medio');
  const dominance = cleanText(identity.dominance || report.dominance || 'Sin definir');

  const secondaryIdentities = uniqueValues(identity.secondaryIdentities || report.secondaryIdentities || [])
    .filter((value) => value !== primaryIdentity)
    .slice(0, 2);

  const strengths = buildRankedList(report.strengths || [], 'Apoya el plan', 'Suma valor cuando juegas alrededor de esta pieza.', 92);
  const weaknesses = buildRankedList(report.weaknesses || [], 'A vigilar', 'Si lo fuerzas, te expone antes de tiempo.', 72);
  const synergies = uniqueValues(report.synergies || []).slice(0, 2);
  const risks = uniqueValues([...(Array.isArray(report.risks) ? report.risks : []), ...(Array.isArray(report.threats) ? report.threats : [])]).slice(0, 2);
  const phases = normalizePhases(report.timeline || report.gameplan?.phases || []);
  const strategicClaims = Array.isArray(strategic?.claims) ? strategic.claims : [];
  const bans = normalizeBans(banRecommendations);

  const contract = {
    mode,
    title,
    summaryText,
    confidence,
    scoreBadge,
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
      coreTheme,
    }),
    primaryIdentity,
    coreTheme,
    identityCopy: cleanText(identity.summaryText || contextual.lead || strategic?.summary || knowledgeV3?.summary || summaryText),
    secondaryIdentities,
    strengths,
    weaknesses,
    synergies,
    risks,
    phases,
    tempo,
    dominance,
    winLabel,
    contextual,
    strategic,
    knowledgeV3,
    knowledge: knowledgeV3,
    bans,
    banFocus: cleanText(banRecommendations?.focus || strategic?.focus || ''),
    banSummary: cleanText(banRecommendations?.summary || ''),
    bestPick: normalizeBestPick(report.bestPick),
    alternatives: normalizeAlternatives(report.alternatives),
    needs: uniqueValues(Array.isArray(report.profile?.needs) ? report.profile.needs : []).slice(0, 4),
    identityTokens: uniqueValues([primaryIdentity, tempo, dominance, coreTheme, ...(Array.isArray(report.secondaryIdentities) ? report.secondaryIdentities : [])]).slice(0, 4),
    summaryTokens: uniqueValues([primaryIdentity, tempo, coreTheme, winLabel, scoreBadge, ...(Array.isArray(report.tags) ? report.tags : [])]).slice(0, 5),
    heroMetrics: mode === 'last-pick'
      ? [
          { label: 'Rol', value: cleanText(targetRoleLabel || targetRole || 'Por cerrar') },
          { label: 'Objetivo', value: cleanText(report.focus || coreTheme || 'Cierre') },
          { label: 'Score', value: `${String(confidence)}%` },
        ]
      : [
          { label: 'Identidad', value: primaryIdentity },
          { label: 'Tempo', value: tempo },
          { label: 'Plan', value: coreTheme },
        ],
    strategicTokens: uniqueValues([
      strategic?.focus,
      strategic?.dominantWindow,
      strategic?.metrics?.dominantWindow,
      strategic?.execution?.label,
      strategic?.contingency?.label,
      strategic?.adaptation?.label,
      ...(Array.isArray(strategic?.signals) ? strategic.signals : []),
    ]).slice(0, 6),
    knowledgeTokens: uniqueValues([
      knowledgeV3?.primaryStyle?.label,
      knowledgeV3?.style?.label,
      knowledgeV3?.matchup?.label,
      knowledgeV3?.macro?.label,
      knowledgeV3?.vision?.label,
      knowledgeV3?.tempo?.label,
      knowledgeV3?.objectives?.label,
      knowledgeV3?.victory?.label,
      knowledgeV3?.defeat?.label,
      knowledgeV3?.mistake?.label,
      ...(Array.isArray(knowledgeV3?.tags) ? knowledgeV3.tags : []),
    ]).slice(0, 6),
    dependencyClaims: normalizeClaims([
      ...(Array.isArray(strategic?.dependencies) ? strategic.dependencies : []),
      ...(Array.isArray(strategic?.cascades) ? strategic.cascades : []),
      ...(Array.isArray(strategic?.conflicts) ? strategic.conflicts : []),
      ...(Array.isArray(strategic?.risks) ? strategic.risks : []),
    ]).slice(0, 4),
    riskClaims: normalizeClaims([
      ...(Array.isArray(strategic?.risks) ? strategic.risks : []),
      ...(Array.isArray(strategic?.conflicts) ? strategic.conflicts : []),
    ]).slice(0, 4),
    signalTokens: uniqueValues([
      ...(Array.isArray(strategic?.signals) ? strategic.signals : []),
      ...(Array.isArray(report.synergyHighlights) ? report.synergyHighlights : []),
      ...(Array.isArray(report.riskHighlights) ? report.riskHighlights : []),
    ]).slice(0, 6),
    sourceMap: {
      compositionProfile: 'Composition Profile',
      strategicEngine: 'Strategic Engine',
      knowledgeLayer: 'Knowledge Layer',
      banEngine: 'Ban Engine',
      lastPick: 'Last Pick Engine',
    },
  };

  contract.sections = buildContractSections(contract);
  return contract;
}

function pickCoreTheme(strategicFocus, primaryIdentity, contextual, strategic, knowledgeV3, winLabel) {
  const candidates = [
    strategicFocus,
    primaryIdentity,
    contextual?.headline,
    contextual?.winCondition?.label,
    strategic?.execution?.label,
    strategic?.dominantWindow,
    knowledgeV3?.primaryStyle?.label,
    knowledgeV3?.macro?.label,
    knowledgeV3?.victory?.label,
    winLabel,
  ];

  const selected = [];
  const seen = new Set();
  for (const candidate of candidates) {
    const text = cleanText(candidate);
    const key = normalizeText(text);
    if (!text || !key || seen.has(key)) continue;
    seen.add(key);
    selected.push(text);
    if (selected.length >= 1) break;
  }
  return selected[0] || strategicFocus || primaryIdentity || winLabel || 'Lectura estratégica';
}

function buildContractSections(contract) {
  if (contract.mode === 'last-pick') {
    return [
      { id: 'summary', title: 'Executive Summary', source: 'Composition Profile + Last Pick Engine', fields: ['title', 'summaryText', 'scoreBadge', 'confidence', 'grade'] },
      { id: 'best-pick', title: 'Último pick', source: 'Last Pick Engine', fields: ['bestPick', 'alternatives', 'needs'] },
      { id: 'strategy', title: 'Lectura estratégica', source: 'Strategic Engine + Knowledge Layer', fields: ['strategic', 'knowledgeV3', 'strategicTokens', 'knowledgeTokens', 'dependencyClaims', 'riskClaims'] },
    ];
  }

  return [
    { id: 'summary', title: 'Executive Summary', source: 'Composition Profile + Strategic Engine', fields: ['title', 'summaryText', 'scoreBadge', 'confidence', 'grade'] },
    { id: 'identity', title: 'Identidad', source: 'Composition Profile', fields: ['primaryIdentity', 'tempo', 'dominance', 'identityTokens'] },
    { id: 'plan', title: 'Plan de partida', source: 'Strategic Engine', fields: ['phases', 'strategicClaims'] },
    { id: 'knowledge', title: 'Knowledge Layer', source: 'Knowledge Layer', fields: ['knowledgeV3', 'knowledgeTokens'] },
    { id: 'strengths', title: 'Fortalezas', source: 'Strategic Engine', fields: ['strengths', 'synergies'] },
    { id: 'weaknesses', title: 'Debilidades', source: 'Strategic Engine', fields: ['weaknesses', 'risks'] },
    { id: 'bans', title: 'Bans prioritarios', source: 'Ban Engine', fields: ['bans', 'banFocus', 'banSummary'] },
    { id: 'timeline', title: 'Lectura estratégica', source: 'Strategic Engine + Knowledge Layer', fields: ['strategicTokens', 'knowledgeTokens', 'dependencyClaims', 'riskClaims', 'signalTokens'] },
  ];
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
    if (selected.length >= 2) break;
  }

  return selected.length ? selected.join(' ') : 'Resumen compacto basado en la composición propia.';
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

function buildStoryTags({ primaryIdentity, tempo, winLabel, contextual, strategic, knowledgeV3, strategicClaims, bans, report, coreTheme }) {
  const candidates = [
    coreTheme,
    primaryIdentity,
    tempo,
    winLabel,
    contextual?.headline,
    contextual?.winCondition?.label,
    contextual?.strategyProfile?.label,
    contextual?.strategyProfile?.kind,
    strategic?.focus,
    strategic?.execution?.label,
    strategic?.dominantWindow,
    strategic?.metrics?.dominantWindow,
    knowledgeV3?.primaryStyle?.label,
    knowledgeV3?.macro?.label,
    knowledgeV3?.victory?.label,
    banLabelList(bans),
    ...(Array.isArray(strategicClaims) ? strategicClaims.map((claim) => claim.label) : []),
    ...(Array.isArray(report.tags) ? report.tags : []),
    ...(Array.isArray(contextual?.tags) ? contextual.tags : []),
    ...(Array.isArray(knowledgeV3?.tags) ? knowledgeV3.tags : []),
  ];
  return uniqueValues(candidates.map((value) => cleanText(value)).filter(Boolean)).slice(0, 6);
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

function buildRankedList(items = [], badge = '', fallbackDetail = '', score = null) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item, index) => {
      if (!item) return null;
      if (typeof item === 'string') {
        const text = cleanText(item);
        return text ? { label: text, detail: fallbackDetail, badge, score: score != null ? score : null } : null;
      }
      return {
        label: cleanText(item.label || item.title || item.name || `Elemento ${index + 1}`),
        detail: cleanText(item.detail || item.summary || item.text || item.reason || fallbackDetail),
        badge: cleanText(item.badge || item.priority || item.kind || badge),
        score: Number.isFinite(Number(item.score ?? item.value ?? item.weight)) ? Number(item.score ?? item.value ?? item.weight) : score,
        tags: uniqueValues(Array.isArray(item.tags) ? item.tags : []),
      };
    })
    .filter(Boolean);
}

function normalizeBestPick(bestPick = null) {
  if (!bestPick) return { champion: '', reason: '', score: null, role: '', roleLabel: '', fit: '' };
  if (typeof bestPick === 'string') return { champion: cleanText(bestPick), reason: '', score: null, role: '', roleLabel: '', fit: '' };
  return {
    champion: cleanText(bestPick.champion || bestPick.name || ''),
    name: cleanText(bestPick.name || bestPick.champion || ''),
    reason: cleanText(bestPick.reason || bestPick.detail || ''),
    score: Number.isFinite(Number(bestPick.score ?? bestPick.value)) ? Number(bestPick.score ?? bestPick.value) : null,
    role: cleanText(bestPick.role || ''),
    roleLabel: cleanText(bestPick.roleLabel || bestPick.role || ''),
    fit: cleanText(bestPick.fit || ''),
  };
}

function normalizeAlternatives(alternatives = []) {
  if (!Array.isArray(alternatives)) return [];
  return alternatives
    .map((alt, index) => {
      if (!alt) return null;
      if (typeof alt === 'string') return { champion: cleanText(alt), reason: '', score: null, role: '' };
      return {
        champion: cleanText(alt.champion || alt.name || `Alternativa ${index + 1}`),
        reason: cleanText(alt.reason || alt.detail || ''),
        score: Number.isFinite(Number(alt.score ?? alt.value)) ? Number(alt.score ?? alt.value) : null,
        role: cleanText(alt.role || ''),
      };
    })
    .filter(Boolean);
}

function normalizeClaims(claims = []) {
  if (!Array.isArray(claims)) return [];
  return claims
    .map((claim, index) => {
      if (!claim) return null;
      if (typeof claim === 'string') return { label: cleanText(claim), detail: '', kind: 'claim', priority: 'low', evidence: [] };
      return {
        label: cleanText(claim.label || claim.title || `Lectura ${index + 1}`),
        detail: cleanText(claim.detail || claim.summary || claim.text || ''),
        kind: cleanText(claim.kind || 'claim'),
        priority: cleanText(claim.priority || 'low'),
        evidence: uniqueValues(Array.isArray(claim.evidence) ? claim.evidence : []),
      };
    })
    .filter((claim) => claim && claim.label);
}