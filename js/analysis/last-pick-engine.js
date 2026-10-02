import { findPickProfile, summarizePickProfile } from '../../knowledge/index.js';
import { matchesCategory, normalizeText } from '../engine/utils.js';
import { buildCompositionProfile } from './composition-profile.js';
import { clamp, cleanText, uniqueValues } from './analysis-utils.js';

const CATEGORY_RULES = [
  {
    key: 'frontline',
    labels: ['frontline', 'protect'],
    score: 30,
    reason: 'Te aporta frontline y peel',
    problem: 'te falta una línea frontal estable',
  },
  {
    key: 'engage',
    labels: ['engage', 'pick'],
    score: 28,
    reason: 'Te da una entrada limpia',
    problem: 'te falta iniciar con seguridad',
  },
  {
    key: 'control',
    labels: ['control', 'objective'],
    score: 24,
    reason: 'Añade visión y control de zona',
    problem: 'te falta orden alrededor de objetivos',
  },
  {
    key: 'carry',
    labels: ['carry', 'scaling'],
    score: 22,
    reason: 'Completa el daño y el escalado',
    problem: 'te falta un cierre más sólido',
  },
  {
    key: 'poke',
    labels: ['poke', 'siege'],
    score: 20,
    reason: 'Refuerza el rango y el asedio',
    problem: 'te falta daño a distancia para jugar el mapa',
  },
  {
    key: 'splitpush',
    labels: ['splitpush'],
    score: 18,
    reason: 'Abre laterales y presión en side lane',
    problem: 'te falta castigar el mapa abierto',
  },
  {
    key: 'mobility',
    labels: ['mobility'],
    score: 12,
    reason: 'Aporta movilidad y ángulos',
    problem: 'te falta acceso o salida en la jugada',
  },
];

export function buildLastPickRecommendations(report = {}, rolePools = {}) {
  const composition = report.composition || buildCompositionProfile(report.selectedChampions || []);
  const selectedChampions = Array.isArray(composition.selectedChampions) ? composition.selectedChampions : [];
  if (composition.count < 4 || composition.count >= 5) return null;

  const missingRoles = Array.isArray(composition.missingRoles) ? composition.missingRoles : [];
  const targetRole = missingRoles[0] || inferTargetRole(selectedChampions, rolePools);
  const pool = Array.isArray(rolePools?.[targetRole]) ? rolePools[targetRole] : [];
  if (!targetRole || !pool.length) return null;

  const teamSignals = buildTeamSignals(report, composition, selectedChampions);
  const teamWeaknesses = uniqueValues([
    ...(Array.isArray(report.weaknesses) ? report.weaknesses : []),
    ...(Array.isArray(report.threats) ? report.threats : []),
    ...(Array.isArray(report.risks) ? report.risks : []),
  ]);

  const strategicProfile = report.strategic?.strategyProfile
    ? summarizeProfileLike(report.strategic.strategyProfile)
    : findPickProfile(report.primaryIdentity || report.identity?.primaryIdentity || '', teamSignals);
  const pickProfile =
    findPickProfile(
      [
        report.primaryIdentity,
        report.identity?.primaryIdentity,
        strategicProfile?.label,
        report.strategic?.focus,
        report.strategic?.summary,
        report.strategic?.claims?.[0]?.label,
      ]
        .filter(Boolean)
        .join(' '),
      teamSignals
    ) || findPickProfile(report.primaryIdentity || '', teamSignals);

  const recommendations = pool
    .map((candidate) => evaluateCandidate(candidate, { targetRole, teamSignals, teamWeaknesses, strategicProfile, pickProfile, selectedChampions }))
    .sort((a, b) => b.score - a.score || a.champion.localeCompare(b.champion, 'es'))
    .slice(0, 5);

  if (!recommendations.length) return null;

  const bestPick = recommendations[0];

  return {
    title: cleanText(`Último pick · ${pickProfile?.label || strategicProfile?.label || cleanText(targetRole)}`),
    summary: cleanText(
      pickProfile?.summary || strategicProfile?.summary || 'El último pick debería cerrar el hueco más visible de la composición.'
    ),
    focus: cleanText(
      pickProfile?.focus || strategicProfile?.focus || 'Cerrar el hueco del draft sin romper el plan'
    ),
    targetRole,
    targetRoleLabel: cleanText(targetRole),
    profile: pickProfile ? summarizePickProfile(pickProfile) : null,
    strategicProfile,
    recommendations,
    bestPick,
    alternatives: recommendations.slice(1),
    tags: uniqueValues([
      targetRole,
      pickProfile?.label,
      strategicProfile?.label,
      bestPick?.champion,
      ...(bestPick?.solves || []),
      ...recommendations.flatMap((item) => item.solves || []),
    ]).slice(0, 10),
  };
}

function evaluateCandidate(candidate, context) {
  const champion = cleanText(candidate?.champion || candidate?.name || candidate?.label || 'Sin definir');
  const identity = cleanText(candidate?.identity || 'Sin definir');
  const functionLabel = cleanText(candidate?.function || 'Sin definir');
  const tempo = cleanText(candidate?.tempo || 'Sin definir');
  const strengths = uniqueValues(Array.isArray(candidate?.strengths) ? candidate.strengths : []);
  const weaknesses = uniqueValues(Array.isArray(candidate?.weaknesses) ? candidate.weaknesses : []);
  const text = [champion, identity, functionLabel, tempo, ...strengths, ...weaknesses].join(' ');
  const categories = deriveCategories(text);
  const candidateSignals = {
    labels: uniqueValues([champion, identity, functionLabel, tempo, ...strengths, ...weaknesses]),
    categories,
    signals: uniqueValues([champion, identity, functionLabel, tempo, ...strengths, ...weaknesses, ...categories]),
  };
  const candidateProfile = findPickProfile(identity || functionLabel || champion, candidateSignals);
  const candidateStrategic = candidateProfile?.key ? candidateProfile : findPickProfile(text, candidateSignals);
  const solves = [];
  const reasons = [];
  let score = 0;

  if (context.pickProfile?.key && candidateStrategic?.key === context.pickProfile.key) {
    score += 24;
    reasons.push(`Encaja con ${context.pickProfile.label}`);
  }

  if (context.strategicProfile?.key && candidateStrategic?.key === context.strategicProfile.key) {
    score += 18;
    reasons.push(`Refuerza ${context.strategicProfile.label}`);
  }

  CATEGORY_RULES.forEach((rule) => {
    const matches = rule.labels.some((label) => categories.includes(label));
    const teamHasCategory = context.teamSignals.categories.some((category) => rule.labels.includes(category));
    const teamNeedsCategory = !teamHasCategory;

    if (matches && teamNeedsCategory) {
      score += rule.score;
      solves.push(rule.problem);
      reasons.push(rule.reason);
    }
  });

  const tempoScore = tempoMatches(tempo, context.pickProfile?.timings || context.strategicProfile?.timings || []);
  if (tempoScore > 0) {
    score += tempoScore;
    reasons.push(`Acompaña el timing ${tempo}`);
  }

  const weaknessMatches = strengths.filter((strength) =>
    context.teamWeaknesses.some((weakness) => normalizeText(weakness) && normalizeText(weakness).includes(normalizeText(strength)))
  );
  if (weaknessMatches.length) {
    score += 10 + weaknessMatches.length * 4;
    solves.push(`cubre ${weaknessMatches.join(' y ')}`);
    reasons.push(`Cubre ${weaknessMatches.join(' y ')}`);
  }

  if (context.selectedChampions.some((selected) => normalizeText(selected.champion) === normalizeText(champion))) {
    score -= 100;
  }

  if (context.pickProfile?.avoid?.some((avoid) => categories.includes(avoid))) {
    score -= 12;
  }

  if (!reasons.length) {
    reasons.push('Es la opción más equilibrada de la pool disponible');
  }

  const selectedReason = uniqueValues(reasons).slice(0, 3).join(' · ');
  const problem = solves[0] || context.pickProfile?.focus || context.strategicProfile?.focus || 'Cierra el hueco más evidente del draft';

  return {
    champion,
    role: candidate?.role || context.targetRole,
    identity,
    function: functionLabel,
    tempo,
    score: clamp(Math.round(score), 0, 100),
    reason: selectedReason,
    problem,
    solves: uniqueValues(solves).slice(0, 4),
    strengths,
    weaknesses,
    tags: uniqueValues([identity, functionLabel, tempo, ...categories, ...strengths]).slice(0, 8),
    profile: candidateStrategic ? summarizeProfileLike(candidateStrategic) : null,
  };
}

function buildTeamSignals(report, composition, selectedChampions) {
  const labels = uniqueValues([
    report.primaryIdentity,
    report.tempo,
    report.dominance,
    report.identity?.primaryIdentity,
    report.identity?.tempo,
    report.identity?.dominance,
    report.strategic?.focus,
    report.strategic?.summary,
    ...(Array.isArray(composition.identities) ? composition.identities : []),
    ...(Array.isArray(composition.functions) ? composition.functions : []),
    ...(Array.isArray(composition.tempos) ? composition.tempos : []),
    ...(Array.isArray(composition.tags) ? composition.tags : []),
    ...(Array.isArray(report.tags) ? report.tags : []),
    ...(Array.isArray(report.strengths) ? report.strengths : []),
    ...(Array.isArray(report.weaknesses) ? report.weaknesses : []),
    ...(Array.isArray(report.risks) ? report.risks : []),
    ...(Array.isArray(report.threats) ? report.threats : []),
    ...(Array.isArray(report.synergies) ? report.synergies : []),
  ]);

  const categories = uniqueValues([
    ...labels.flatMap((label) => deriveCategories(label)),
    ...selectedChampions.flatMap((champion) => deriveCategories([champion.champion, champion.identity, champion.function, champion.tempo, ...(champion.strengths || []), ...(champion.weaknesses || [])].join(' '))),
  ]);

  return {
    labels,
    categories,
    signals: uniqueValues([...labels, ...categories]),
  };
}

function deriveCategories(text = '') {
  const normalized = normalizeText(text);
  if (!normalized) return [];

  const categories = [
    'frontline',
    'engage',
    'damage',
    'poke',
    'teamfight',
    'mobility',
    'control',
    'scaling',
    'objective',
    'splitpush',
    'pick',
  ].filter((category) => matchesCategory(normalized, category));

  if (normalized.includes('protect') || normalized.includes('peel')) categories.push('protect');
  if (normalized.includes('carry') || normalized.includes('hypercarry')) categories.push('carry');
  if (normalized.includes('waveclear')) categories.push('waveclear');
  if (normalized.includes('vision')) categories.push('vision');
  if (normalized.includes('duel')) categories.push('duel');
  if (normalized.includes('global')) categories.push('global');
  if (normalized.includes('range') || normalized.includes('ranged')) categories.push('range');
  if (normalized.includes('burst')) categories.push('burst');
  if (normalized.includes('followup')) categories.push('followup');

  return uniqueValues(categories);
}

function tempoMatches(candidateTempo = '', targetTimings = []) {
  const normalizedTempo = normalizeText(candidateTempo);
  const target = uniqueValues(Array.isArray(targetTimings) ? targetTimings : []).map((value) => normalizeText(value));
  if (!normalizedTempo || !target.length) return 0;

  if (target.some((item) => normalizedTempo.includes(item))) return 12;
  if (normalizedTempo.includes('early') && target.includes('early')) return 12;
  if (normalizedTempo.includes('mid') && target.includes('mid')) return 10;
  if (normalizedTempo.includes('late') && target.includes('late')) return 12;
  return 0;
}

function inferTargetRole(selectedChampions, rolePools) {
  const roles = ['top', 'jungle', 'mid', 'botline', 'support'];
  const selectedRoles = new Set((Array.isArray(selectedChampions) ? selectedChampions : []).map((champion) => normalizeText(champion.role)));
  const missing = roles.find((role) => !selectedRoles.has(role) && Array.isArray(rolePools?.[role]));
  return missing || roles.find((role) => !selectedRoles.has(role)) || 'support';
}

function summarizeProfileLike(profile) {
  if (!profile) return null;

  return {
    key: profile.key,
    label: profile.label,
    kind: profile.kind,
    focus: profile.focus || profile.summary || '',
    summary: profile.summary || profile.focus || '',
    timings: uniqueValues(profile.timings || []).slice(0, 6),
  };
}
