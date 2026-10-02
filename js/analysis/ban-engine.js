import { BAN_PROFILE_RULES, findBanProfile, summarizeBanProfile } from '../../knowledge/index.js';
import { clamp, cleanText, uniqueValues } from './analysis-utils.js';

export function buildBanRecommendations(report = {}) {
  const strategic = report.strategic || report.strategicReasoning || {};
  const composition = report.composition || {};
  const signalSet = buildSignalSet(report, strategic, composition);
  const profileQuery = [
    report.primaryIdentity,
    report.identity?.primaryIdentity,
    strategic.strategyProfile?.label,
    strategic.strategyProfile?.key,
    strategic.focus,
    strategic.summary,
    strategic.claims?.[0]?.label,
  ]
    .filter(Boolean)
    .join(' ');

  const banProfile =
    findBanProfile(profileQuery, signalSet) ||
    findBanProfile(report.primaryIdentity || '', signalSet) ||
    findBanProfile(report.identity?.primaryIdentity || '', signalSet) ||
    findBanProfile('control', signalSet) ||
    BAN_PROFILE_RULES[0];

  const summary = cleanText(
    strategic.claims?.[0]?.detail ||
      strategic.summary ||
      banProfile.summary ||
      'Bloquea lo que más corta el plan de la composición.'
  );

  const focus = cleanText(banProfile.focus || strategic.focus || 'Neutralizar el plan rival');
  const profile = summarizeBanProfile(banProfile);
  const bans = (profile?.bans || banProfile.bans || [])
    .map((ban, index) => normalizeBan(ban, index))
    .slice(0, 5);

  return {
    title: cleanText(`Bans inteligentes · ${banProfile.label || 'Plan'}`),
    summary,
    focus,
    profile,
    bans,
    tags: uniqueValues([
      report.primaryIdentity,
      strategic.strategyProfile?.label,
      strategic.strategyProfile?.key,
      banProfile.label,
      focus,
      ...bans.flatMap((ban) => [ban.champion, ...(Array.isArray(ban.tags) ? ban.tags : [])]),
    ]).slice(0, 10),
    signals: signalSet.signals.slice(0, 12),
  };
}

function buildSignalSet(report, strategic, composition) {
  const rawSignals = [
    report.primaryIdentity,
    report.tempo,
    report.dominance,
    report.identity?.primaryIdentity,
    report.identity?.tempo,
    report.identity?.dominance,
    strategic?.focus,
    strategic?.summary,
    ...(Array.isArray(strategic?.claims) ? strategic.claims.flatMap((claim) => [claim?.label, claim?.detail]) : []),
    ...(Array.isArray(composition.identities) ? composition.identities : []),
    ...(Array.isArray(composition.functions) ? composition.functions : []),
    ...(Array.isArray(composition.tempos) ? composition.tempos : []),
    ...(Array.isArray(composition.tags) ? composition.tags : []),
    ...(Array.isArray(report.tags) ? report.tags : []),
    ...(Array.isArray(report.winConditions) ? report.winConditions.flatMap((item) => [item?.label, item?.detail]) : []),
  ];

  const labels = uniqueValues(rawSignals.map((value) => cleanText(value)));
  const categories = uniqueValues([
    ...labels.flatMap((label) => resolveBanCategories(label)),
    ...(Array.isArray(report.strategic?.claims) ? report.strategic.claims.flatMap((claim) => resolveBanCategories(claim?.label || claim?.detail || '')) : []),
  ]);

  return {
    labels,
    categories,
    signals: uniqueValues([...labels, ...categories]),
  };
}

function resolveBanCategories(label = '') {
  const normalized = cleanText(label).toLowerCase();
  if (!normalized) return [];

  if (normalized.includes('dive') || normalized.includes('engage') || normalized.includes('pick') || normalized.includes('skirmish')) {
    return ['engage', 'pick', 'mobility'];
  }

  if (normalized.includes('splitpush') || normalized.includes('split') || normalized.includes('lateral')) {
    return ['splitpush', 'global', 'mobility'];
  }

  if (normalized.includes('front') || normalized.includes('protect') || normalized.includes('teamfight')) {
    return ['frontline', 'teamfight', 'control'];
  }

  if (normalized.includes('poke') || normalized.includes('siege')) {
    return ['poke', 'control', 'objective'];
  }

  if (normalized.includes('control') || normalized.includes('objective') || normalized.includes('vision') || normalized.includes('nashor')) {
    return ['control', 'objective', 'global'];
  }

  return [];
}

function normalizeBan(ban = {}, index = 0) {
  const champion = cleanText(ban.champion || ban.name || ban.label || ban.title || 'Sin definir');
  const reason = cleanText(ban.reason || ban.detail || ban.summary || '');
  const priority = cleanText(ban.priority || (index === 0 ? 'critical' : 'high'));
  const weight = clamp(Number(ban.weight) || 100 - index * 4, 10, 100);

  return {
    champion,
    reason,
    priority,
    score: weight,
    tags: uniqueValues(Array.isArray(ban.tags) ? ban.tags : []),
  };
}
