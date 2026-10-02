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
  const targetRole = mode === 'last-pick' ? cleanText(report.targetRole || report.targetRoleLabel || '') : '';
  const targetRoleLabel = mode === 'last-pick' ? cleanText(report.targetRoleLabel || report.targetRole || '') : '';

  const summaryText = buildNarrativeSummary([
    strategic?.summary,
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
  const title = buildStoryTitle(primaryIdentity, strategicFocus, winLabel);
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
    identityTokens: uniqueValues([primaryIdentity, tempo, dominance, report.identity?.focus, ...(Array.isArray(report.secondaryIdentities) ? report.secondaryIdentities : [])]).slice(0, 4),
    summaryTokens: uniqueValues([primaryIdentity, tempo, strategicFocus, winLabel, scoreBadge, ...(Array.isArray(report.tags) ? report.tags : [])]).slice(0, 5),
    heroMetrics: mode === 'last-pick'
      ? [
          { label: 'Rol', value: cleanText(targetRoleLabel || targetRole || 'Por cerrar') },
          { label: 'Objetivo', value: cleanText(report.focus || strategicFocus || 'Cierre') },
          { label: 'Score', value: `${String(confidence)}%` },
        ]
      : [
          { label: 'Identidad', value: primaryIdentity },
          { label: 'Tempo', value: tempo },
          { label: 'Plan', value: strategicFocus },
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
  return uniqueValues(candidates.map((value) => cleanText(value)).filter(Boolean)).slice(0, 12);
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

function normalizePhases(items = []) {
  if (!Array.isArray(items)) return [];
  return items.map((item, index) => {
    if (!item) return null;
    if (typeof item === 'string') {
      const text = cleanText(item);
      return text ? { label: text, title: '', detail: '', actions: [] } : null;
    }
    return {
      label: cleanText(item.label || item.phase || item.title || `Fase ${index + 1}`),
      title: cleanText(item.title || item.name || ''),
      detail: cleanText(item.detail || item.description || item.summary || ''),
      actions: uniqueValues(Array.isArray(item.actions) ? item.actions : []),
    };
  }).filter(Boolean);
}

function normalizeBans(input = []) {
  const list = Array.isArray(input) ? input : input?.bans || [];
  return list.map((item, index) => {
    if (!item) return null;
    if (typeof item === 'string') return cleanText(item) ? { champion: cleanText(item), reason: '' } : null;
    return { champion: cleanText(item.champion || item.name || `Ban ${index + 1}`), reason: cleanText(item.reason || item.detail || item.summary || '') };
  }).filter(Boolean);
}

function normalizeClaims(items = []) {
  if (!Array.isArray(items)) return [];
  return items.map((item) => {
    if (!item) return null;
    if (typeof item === 'string') {
      const text = cleanText(item);
      return text ? { label: text, detail: text, kind: '', priority: '', evidence: [] } : null;
    }
    const label = cleanText(item.label || item.title || item.name || '');
    const detail = cleanText(item.detail || item.summary || item.text || item.reason || '');
    if (!label && !detail) return null;
    return {
      label: label || detail,
      detail: detail || label,
      kind: cleanText(item.kind || ''),
      priority: cleanText(item.priority || ''),
      evidence: uniqueValues(Array.isArray(item.evidence) ? item.evidence : []),
    };
  }).filter(Boolean);
}

function normalizeBestPick(item = null) {
  if (!item || typeof item !== 'object') return {};
  return {
    champion: cleanText(item.champion || item.name || ''),
    name: cleanText(item.name || item.champion || ''),
    role: cleanText(item.role || item.roleLabel || ''),
    roleLabel: cleanText(item.roleLabel || item.role || ''),
    reason: cleanText(item.reason || item.detail || item.summary || ''),
    detail: cleanText(item.detail || item.reason || ''),
    fit: cleanText(item.fit || item.tags?.[0] || ''),
    score: Number.isFinite(Number(item.score)) ? Number(item.score) : null,
  };
}

function normalizeAlternatives(items = []) {
  if (!Array.isArray(items)) return [];
  return items.map((item) => {
    if (!item) return null;
    if (typeof item === 'string') return cleanText(item) ? { label: cleanText(item), detail: '', score: null } : null;
    return {
      label: cleanText(item.label || item.name || item.champion || ''),
      detail: cleanText(item.detail || item.reason || item.summary || ''),
      score: Number.isFinite(Number(item.score)) ? Number(item.score) : null,
    };
  }).filter(Boolean);
}

function clamp(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, number));
}

function pick(...values) {
  for (const value of values) {
    const text = stringify(value);
    if (text) return text;
  }
  return '';
}

function stringify(value) {
  if (value == null) return '';
  if (Array.isArray(value)) return uniqueText(value).join(' · ');
  if (typeof value === 'object') return pick(value.label, value.title, value.name, value.headline, value.summary, value.detail, value.text, value.value, value.focus, value.role, value.kind, value.badge);
  const text = cleanText(value);
  if (!text) return '';
  const normalized = normalize(text);
  if (!normalized || ['sindefinir', 'undefined', 'null', 'nan'].includes(normalized)) return '';
  return text;
}

function uniqueText(values = []) {
  const seen = new Set();
  const result = [];
  for (const value of Array.isArray(values) ? values : [values]) {
    const text = stringify(value);
    if (!text) continue;
    const key = normalize(text);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(text);
  }
  return result;
}

function normalize(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function banLabelList(bans = []) {
  return uniqueValues((Array.isArray(bans) ? bans : []).map((ban) => ban?.champion || ban?.name || ban?.label || ''));
}
