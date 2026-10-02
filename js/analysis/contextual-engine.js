import {
  CONFLICT_RULES,
  DEPENDENCY_RULES,
  IDENTITY_RELATIONS,
  MACRO_SYNERGY_RULES,
  PATTERN_RULES,
  WIN_CONDITION_RULES,
} from '../../knowledge/index.js';
import { clamp, cleanText, toText, uniqueValues } from './analysis-utils.js';

export function buildContextualNarrative(report = {}) {
  const composition = report.composition || {};
  const primaryIdentity = cleanText(
    report.primaryIdentity || report.identity?.primaryIdentity || composition.identities?.[0] || 'Sin definir'
  );
  const tempo = cleanText(report.tempo || report.identity?.tempo || composition.tempos?.[0] || 'Sin definir');
  const confidence = clamp(Number(report.confidence ?? report.score?.value ?? report.score ?? 0), 0, 100);

  const signalSet = buildSignalSet(report, composition, primaryIdentity, tempo);
  const identityRule = findIdentityRule(primaryIdentity, signalSet);
  const winRule = pickBestRule(WIN_CONDITION_RULES, signalSet) || fallbackWinRule(report);
  const dependencyRule = pickBestRule(DEPENDENCY_RULES, signalSet);
  const patternRule = pickBestRule(PATTERN_RULES, signalSet);
  const macroRule = pickBestRule(MACRO_SYNERGY_RULES, signalSet);
  const conflictRules = CONFLICT_RULES.map((rule) => ({
    ...rule,
    hits: countRuleHits(rule, signalSet),
  }))
    .filter((rule) => rule.hits >= 2)
    .sort((a, b) => b.hits - a.hits || a.penalty - b.penalty);

  const identityLine = buildIdentityLine({
    primaryIdentity,
    identityRule,
    dependencyRule,
    signalSet,
  });
  const winLine = buildWinLine({
    primaryIdentity,
    tempo,
    winRule,
    patternRule,
    macroRule,
    signalSet,
  });
  const conflictLine = buildConflictLine({
    primaryIdentity,
    conflictRules,
    signalSet,
    report,
  });
  const tempoLine = buildTempoLine({
    primaryIdentity,
    tempo,
    winRule,
    confidence,
    signalSet,
  });
  const macroLine = buildMacroLine({
    macroRule,
    patternRule,
    dependencyRule,
    signalSet,
  });

  const rules = uniqueRuleList([
    { label: 'Condición de victoria', detail: winLine, kind: 'win' },
    { label: 'Tensión del plan', detail: conflictLine, kind: 'risk' },
    { label: 'Ritmo recomendado', detail: tempoLine, kind: 'tempo' },
    { label: 'Acelerador', detail: macroLine, kind: 'opportunity' },
    { label: 'Lectura de identidad', detail: identityLine, kind: 'identity' },
  ]).slice(0, 4);

  const lead = uniqueSentences([winLine, identityLine, conflictLine, tempoLine]).slice(0, 3).join(' ');
  const headline = cleanText(`${primaryIdentity} · ${winRule?.label || patternRule?.label || 'Lectura contextual'}`);

  return {
    headline,
    lead,
    summary: lead,
    rules,
    signals: signalSet.signals.slice(0, 8),
    tags: uniqueValues([
      primaryIdentity,
      tempo,
      winRule?.label,
      patternRule?.label,
      macroRule?.label,
      dependencyRule?.label,
      identityRule?.label,
      ...rules.map((rule) => rule.label),
      ...signalSet.signals,
    ]).slice(0, 8),
    primaryIdentity,
    tempo,
    confidence,
    winCondition: winRule ? { label: winRule.label, detail: winLine } : null,
    dependency: dependencyRule ? { label: dependencyRule.label, detail: dependencyRule.detail } : null,
    pattern: patternRule ? { label: patternRule.label, detail: patternRule.detail } : null,
    macro: macroRule ? { label: macroRule.label, detail: macroRule.detail } : null,
    conflicts: conflictRules.map((rule) => rule.label),
  };
}

function buildSignalSet(report, composition, primaryIdentity, tempo) {
  const rawSignals = [
    primaryIdentity,
    tempo,
    report.dominance,
    report.identity?.dominance,
    report.identity?.focus,
    report.identity?.primaryIdentity,
    report.identity?.tempo,
    report.executiveSummary?.title,
    report.executiveSummary?.text,
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
    ...(Array.isArray(report.winConditions) ? report.winConditions.flatMap((item) => [item?.label, item?.detail]) : []),
    report.winCondition?.label,
    report.winCondition?.detail,
  ];

  const labels = uniqueValues(rawSignals.map((value) => toText(value)));
  const categories = uniqueValues(labels.flatMap((label) => resolveIdentityCategories(label)));

  return {
    labels,
    categories,
    signals: uniqueValues([...labels, ...categories]),
  };
}

function findIdentityRule(primaryIdentity, signalSet) {
  const target = normalizeKey(primaryIdentity);
  if (!target) return null;

  return IDENTITY_RELATIONS.find((rule) => {
    const key = normalizeKey(rule.key || rule.label);
    if (key === target) return true;
    return signalSet.signals.some((signal) => normalizeKey(signal) === key);
  }) || null;
}

function pickBestRule(rules, signalSet) {
  const scored = rules
    .map((rule) => ({
      ...rule,
      hits: countRuleHits(rule, signalSet),
    }))
    .filter((rule) => rule.hits >= (rule.minHits || 1))
    .sort((a, b) => b.hits - a.hits || (b.minHits || 0) - (a.minHits || 0));

  return scored[0] || null;
}

function fallbackWinRule(report) {
  const current = report?.winConditions?.[0] || report?.winCondition || null;
  if (!current) return null;

  return {
    label: cleanText(current.label || current.title || current.name || 'Jugar a tu plan'),
    detail: cleanText(current.detail || current.text || current.summary || ''),
    priorities: Array.isArray(current.priorities) ? current.priorities : [],
    avoid: Array.isArray(current.avoid) ? current.avoid : [],
  };
}

function buildIdentityLine({ primaryIdentity, identityRule, dependencyRule, signalSet }) {
  const key = normalizeKey(primaryIdentity);

  if (key === 'dive') {
    return 'Aunque eres Dive, tu backline es frágil: entra con visión y no abras de frente si todavía no has fijado la respuesta del rival.';
  }

  if (key === 'splitpush') {
    return 'La partida se abre por laterales; si la reduces a un 5v5 frontal, te quitas tu ventaja natural.';
  }

  if (key === 'poke') {
    return 'Tu plan vive en el desgaste; no cambies el asedio por una entrada corta sin haber ganado espacio primero.';
  }

  if (key === 'protect' || key === 'fronttoback') {
    return 'Tu estructura necesita tiempo: ralentiza el early para alcanzar tu pico de poder con carry y peel listos.';
  }

  if (key === 'pick' || key === 'engage' || key === 'skirmish') {
    return 'Tu mejor ventana es corta: visión, entrada limpia y objetivo antes de que la pelea se alargue.';
  }

  if (key === 'teamfight' || key === 'control') {
    return 'Tu valor crece cuando la pelea está ordenada; evita improvisar y fuerza el combate en terreno favorable.';
  }

  if (dependencyRule?.detail) {
    return dependencyRule.detail;
  }

  if (identityRule?.label) {
    return `La composición gira alrededor de ${identityRule.label}.`;
  }

  if (signalSet.categories.includes('frontline') || signalSet.categories.includes('control')) {
    return 'La composición necesita orden y espacio para que su plan funcione.';
  }

  return 'La composición todavía no define una narrativa dominante.';
}

function buildWinLine({ primaryIdentity, tempo, winRule, patternRule, macroRule, signalSet }) {
  const key = normalizeKey(primaryIdentity);
  const tempoKey = normalizeKey(tempo);

  if (key === 'dive' || key === 'engage' || key === 'pick' || key === 'skirmish') {
    return 'Si enfrente hay más engage, tu condición cambia: deja de abrir de frente y castiga la segunda entrada.';
  }

  if (key === 'splitpush') {
    return 'Tu condición cambia si el mapa se cierra: abre laterales antes de agruparte y no regales un 5v5 sin presión.';
  }

  if (key === 'poke') {
    return 'Tu condición cambia si el rival te fuerza all-in: desgasta primero y sólo comprométete cuando hayas ganado espacio.';
  }

  if (key === 'protect' || key === 'fronttoback' || tempoKey === 'late') {
    return 'Necesitas ralentizar el early para alcanzar tu pico de poder con front line, peel y carry listos.';
  }

  if (winRule?.detail) {
    return winRule.detail;
  }

  if (patternRule?.detail) {
    return patternRule.detail;
  }

  if (macroRule?.detail) {
    return macroRule.detail;
  }

  if (signalSet.signals.length) {
    return `Juega alrededor de ${signalSet.signals[0].toLowerCase()} y evita improvisar en una pelea sin preparación.`;
  }

  return 'Juega alrededor de tu plan dominante y evita pelear sin ventaja clara.';
}

function buildConflictLine({ primaryIdentity, conflictRules, signalSet, report }) {
  if (conflictRules.length) {
    const conflict = conflictRules[0];
    const labels = conflict.labels.join(' y ');
    return `${conflict.detail} En esta composición, ${labels.toLowerCase()} compiten por el mismo espacio.`;
  }

  const key = normalizeKey(primaryIdentity);
  if ((key === 'dive' || key === 'pick' || key === 'engage') && !signalSet.categories.includes('frontline') && !signalSet.categories.includes('protect')) {
    return 'Aunque eres Dive, tu backline es frágil: no abras primero y fuerza el contraengage con visión.';
  }

  if (key === 'splitpush' && signalSet.categories.includes('teamfight')) {
    return 'La presión lateral y el 5v5 frontal no deberían pedirse al mismo tiempo; elige una sola prioridad por ventana.';
  }

  if (Array.isArray(report.weaknesses) && report.weaknesses.length) {
    return `La primera alerta sigue siendo ${toText(report.weaknesses[0])}.`;
  }

  return 'No hay una tensión mayor que rompa el plan, pero conviene no forzar peleas largas sin preparación.';
}

function buildTempoLine({ primaryIdentity, tempo, winRule, confidence, signalSet }) {
  const key = normalizeKey(primaryIdentity);
  const tempoKey = normalizeKey(tempo);
  const winLabel = normalizeKey(winRule?.label || '');

  if (tempoKey === 'late' || winLabel.includes('escalar') || key === 'protect' || key === 'fronttoback') {
    return 'Necesitas ralentizar el early para alcanzar tu pico de poder.';
  }

  if (tempoKey === 'early' && (key === 'dive' || key === 'pick' || key === 'engage' || key === 'skirmish')) {
    return 'Tu mejor ventana está al principio: acelera el mapa antes de que el rival ordene la pelea.';
  }

  if (tempoKey === 'mid') {
    return 'El punto de inflexión aparece en mid game: convierte rotaciones en objetivo y no en ruido.';
  }

  if (confidence < 60) {
    return 'La estructura aún necesita disciplina: reduce improvisación y busca una ventana limpia.';
  }

  if (signalSet.categories.includes('control')) {
    return 'Tu ritmo óptimo pasa por controlar espacios y traducir visión en objetivos.';
  }

  return 'Tu ritmo óptimo está en ejecutar limpio la ventana principal sin alargar la decisión.';
}

function buildMacroLine({ macroRule, patternRule, dependencyRule, signalSet }) {
  if (macroRule?.detail) {
    return macroRule.detail;
  }

  if (patternRule?.detail) {
    return patternRule.detail;
  }

  if (dependencyRule?.detail) {
    return dependencyRule.detail;
  }

  if (signalSet.categories.includes('control') || signalSet.categories.includes('objective')) {
    return 'La prioridad es controlar zonas y convertir espacio en objetivos.';
  }

  return 'No hay un acelerador dominante; juega limpio y evita forzar un plan todavía incompleto.';
}

function countRuleHits(rule, signalSet) {
  const tokens = collectRuleTokens(rule);
  return tokens.reduce((count, token) => {
    return signalSet.signals.some((signal) => matchesToken(signal, token)) ? count + 1 : count;
  }, 0);
}

function collectRuleTokens(rule = {}) {
  return uniqueValues([
    rule.key,
    rule.label,
    ...(Array.isArray(rule.labels) ? rule.labels : []),
    ...(Array.isArray(rule.match) ? rule.match : []),
    ...(Array.isArray(rule.categories) ? rule.categories : []),
    ...(Array.isArray(rule.needs) ? rule.needs : []),
    ...(Array.isArray(rule.wants) ? rule.wants : []),
    ...(Array.isArray(rule.avoids) ? rule.avoids : []),
    ...(Array.isArray(rule.avoid) ? rule.avoid : []),
  ]);
}

function resolveIdentityCategories(label) {
  const key = normalizeKey(label);
  if (!key) return [];

  return IDENTITY_RELATIONS.filter((relation) => normalizeKey(relation.key) === key || normalizeKey(relation.label) === key)
    .flatMap((relation) => relation.categories || []);
}

function uniqueRuleList(rules = []) {
  const seen = new Set();
  return rules.filter((rule) => {
    if (!rule || !rule.label) return false;
    const key = `${normalizeKey(rule.label)}::${normalizeKey(rule.detail)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function uniqueSentences(values = []) {
  return uniqueValues(values.map((value) => cleanText(value)).filter(Boolean));
}

function matchesToken(signal, token) {
  const signalKey = normalizeKey(signal);
  const tokenKey = normalizeKey(token);
  if (!signalKey || !tokenKey) return false;
  return signalKey === tokenKey || signalKey.includes(tokenKey) || tokenKey.includes(signalKey);
}

function normalizeKey(value) {
  return cleanText(toText(value))
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '')
    .toLowerCase();
}
