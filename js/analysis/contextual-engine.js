import {
  CONFLICT_RULES,
  DEPENDENCY_RULES,
  IDENTITY_RELATIONS,
  MACRO_SYNERGY_RULES,
  PATTERN_RULES,
  WIN_CONDITION_RULES,
  findStrategicProfile,
  summarizeStrategicProfile,
} from '../../knowledge/index.js';
import { CATEGORY_TERMS, matchesCategory, normalizeText } from '../engine/utils.js';
import { clamp, cleanText, toText, uniqueValues } from './analysis-utils.js';

export function buildContextualNarrative(report = {}) {
  const composition = report.composition || {};
  const primaryIdentity = cleanText(
    report.primaryIdentity || report.identity?.primaryIdentity || composition.identities?.[0] || 'Sin definir'
  );
  const tempo = cleanText(report.tempo || report.identity?.tempo || composition.tempos?.[0] || 'Sin definir');
  const confidence = clamp(Number(report.confidence ?? report.score?.value ?? report.score ?? 0), 0, 100);

  const signalSet = buildSignalSet(report, composition, primaryIdentity, tempo);
  const strategicProfile = findStrategicProfile(primaryIdentity, signalSet);
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
    strategicProfile,
    identityRule,
    dependencyRule,
    signalSet,
    primaryIdentity,
  });
  const winLine = buildWinLine({
    strategicProfile,
    winRule,
    patternRule,
    macroRule,
    signalSet,
    primaryIdentity,
    tempo,
  });
  const conflictLine = buildConflictLine({
    strategicProfile,
    conflictRules,
    signalSet,
  });
  const tempoLine = buildTempoLine({
    strategicProfile,
    tempo,
    winRule,
    confidence,
    signalSet,
  });
  const macroLine = buildMacroLine({
    strategicProfile,
    macroRule,
    patternRule,
    dependencyRule,
    signalSet,
  });

  const rules = uniqueRuleList([
    { label: 'Lectura de identidad', detail: identityLine, kind: 'identity' },
    { label: 'Condición de victoria', detail: winLine, kind: 'win' },
    { label: 'Ritmo recomendado', detail: tempoLine, kind: 'tempo' },
    { label: 'Plan macro', detail: macroLine, kind: 'macro' },
    { label: 'Riesgo principal', detail: conflictLine, kind: 'risk' },
  ]).slice(0, 4);

  const lead = uniqueSentences([identityLine, winLine, conflictLine, tempoLine, macroLine]).slice(0, 3).join(' ');
  const headline = cleanText(`${primaryIdentity} · ${strategicProfile?.label || winRule?.label || patternRule?.label || 'Lectura contextual'}`);

  return {
    headline,
    lead,
    summary: lead,
    rules,
    signals: signalSet.signals.slice(0, 8),
    tags: uniqueValues([
      primaryIdentity,
      tempo,
      strategicProfile?.label,
      strategicProfile?.kind,
      ...(Array.isArray(strategicProfile?.timings) ? strategicProfile.timings : []),
      ...(Array.isArray(strategicProfile?.needs) ? strategicProfile.needs : []),
      ...(Array.isArray(strategicProfile?.macro) ? strategicProfile.macro : []),
      winRule?.label,
      patternRule?.label,
      macroRule?.label,
      dependencyRule?.label,
      identityRule?.label,
      ...rules.map((rule) => rule.label),
      ...signalSet.categories,
    ]).slice(0, 10),
    primaryIdentity,
    tempo,
    confidence,
    winCondition: winRule ? { label: winRule.label, detail: winLine } : null,
    dependency: dependencyRule ? { label: dependencyRule.label, detail: dependencyRule.detail } : null,
    pattern: patternRule ? { label: patternRule.label, detail: patternRule.detail } : null,
    macro: macroRule ? { label: macroRule.label, detail: macroRule.detail } : null,
    conflicts: conflictRules.map((rule) => rule.label),
    strategyProfile: summarizeStrategicProfile(strategicProfile),
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
  const categories = uniqueValues([
    ...labels.flatMap((label) => resolveIdentityCategories(label)),
    ...labels.flatMap((label) => resolveSignalCategories(label)),
  ]);

  return {
    labels,
    categories,
    signals: uniqueValues([...labels, ...categories]),
  };
}

function resolveIdentityCategories(label = '') {
  const normalized = normalizeText(label);
  if (!normalized) return [];

  return Object.entries(CATEGORY_TERMS)
    .filter(([, terms]) => terms.some((term) => normalizeText(term) === normalized || normalized.includes(normalizeText(term))))
    .map(([category]) => category);
}

function resolveSignalCategories(label = '') {
  const normalized = normalizeText(label);
  if (!normalized) return [];

  if (['dive', 'pick', 'skirmish', 'engage'].includes(normalized)) return ['engage', 'pick', 'mobility'];
  if (['splitpush', 'splitpressure', 'split'].includes(normalized)) return ['splitpush', 'mobility', 'objective'];
  if (['fronttoback', 'teamfight', 'protect', 'control'].includes(normalized)) return ['frontline', 'teamfight', 'control'];
  if (['poke', 'siege'].includes(normalized)) return ['poke', 'control', 'objective'];
  return [];
}

function findIdentityRule(primaryIdentity, signalSet) {
  const target = normalizeText(primaryIdentity);
  if (!target) return null;

  return IDENTITY_RELATIONS.find((rule) => {
    const key = normalizeText(rule.key || rule.label);
    if (key === target) return true;
    return signalSet.signals.some((signal) => normalizeText(signal) === key);
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

function buildIdentityLine({ strategicProfile, identityRule, dependencyRule, signalSet, primaryIdentity }) {
  if (strategicProfile?.summary) return strategicProfile.summary;

  const key = normalizeText(primaryIdentity);

  if (key === 'dive') {
    return 'Aunque eres Dive, tu backline es frágil: entra con visión y no abras de frente.';
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

function buildWinLine({ strategicProfile, winRule, patternRule, macroRule, signalSet, primaryIdentity, tempo }) {
  if (strategicProfile?.condition) return strategicProfile.condition;

  const key = normalizeText(primaryIdentity);
  const tempoKey = normalizeText(tempo);

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

function buildConflictLine({ strategicProfile, conflictRules }) {
  const profileMistakes = Array.isArray(strategicProfile?.mistakes) && strategicProfile.mistakes.length
    ? `Errores frecuentes: ${joinPhrase(strategicProfile.mistakes)}.`
    : '';

  if (conflictRules.length) {
    const conflict = conflictRules[0];
    const labels = conflict.labels.join(' y ');
    const text = `La tensión principal aparece entre ${labels}; ${conflict.detail}`;
    return uniqueSentences([profileMistakes, text]).join(' ');
  }

  if (profileMistakes) return profileMistakes;
  return 'No hay una tensión estratégica dominante visible.';
}

function buildTempoLine({ strategicProfile, tempo, confidence, winRule }) {
  if (Array.isArray(strategicProfile?.timings) && strategicProfile.timings.length) {
    const timings = joinPhrase(strategicProfile.timings);
    return `Tu ventana principal está en ${timings}; no alargues la partida más de lo necesario.`;
  }

  const tempoKey = normalizeText(tempo);
  if (tempoKey === 'early') return 'Tu mejor margen está en el early: acelera antes de que el rival estabilice el mapa.';
  if (tempoKey === 'late') return 'Tu plan pide tiempo: no te precipites y guarda recursos para el cierre.';

  const confidenceText = confidence >= 80 ? 'alto' : confidence >= 60 ? 'medio' : 'limitado';
  if (winRule?.label) {
    return `El ritmo adecuado es ${confidenceText}: construye la pelea alrededor de ${winRule.label.toLowerCase()}.`;
  }

  return 'El ritmo adecuado es estable: evita acelerar sin una ventana clara.';
}

function buildMacroLine({ strategicProfile, macroRule, patternRule, dependencyRule }) {
  const macro = joinPhrase(Array.isArray(strategicProfile?.macro) ? strategicProfile.macro : []);
  const objectives = joinPhrase(Array.isArray(strategicProfile?.objectives) ? strategicProfile.objectives : []);

  if (macro || objectives) {
    return [macro ? `Macro: ${macro}.` : '', objectives ? `Objetivos prioritarios: ${objectives}.` : '']
      .filter(Boolean)
      .join(' ');
  }

  if (macroRule?.detail) return macroRule.detail;
  if (patternRule?.detail) return patternRule.detail;
  if (dependencyRule?.detail) return dependencyRule.detail;
  return 'Tu macro debe seguir la identidad dominante y el mapa no al revés.';
}

function countRuleHits(rule, signalSet) {
  const tokens = uniqueValues([
    rule?.key,
    rule?.label,
    ...(Array.isArray(rule?.labels) ? rule.labels : []),
    ...(Array.isArray(rule?.categories) ? rule.categories : []),
    ...(Array.isArray(rule?.match) ? rule.match : []),
    ...(Array.isArray(rule?.needs) ? rule.needs : []),
    ...(Array.isArray(rule?.wants) ? rule.wants : []),
    ...(Array.isArray(rule?.avoids) ? rule.avoids : []),
    ...(Array.isArray(rule?.evidence) ? rule.evidence : []),
    ...(Array.isArray(rule?.priorities) ? rule.priorities : []),
    rule?.detail,
  ]).map((value) => normalizeText(value));

  let hits = 0;
  for (const token of tokens) {
    if (!token) continue;
    if (signalSet.signals.some((signal) => {
      const normalizedSignal = normalizeText(signal);
      return normalizedSignal === token || normalizedSignal.includes(token) || token.includes(normalizedSignal);
    })) {
      hits += 1;
    }
  }
  return hits;
}

function uniqueRuleList(rules = []) {
  const seen = new Set();
  return rules.filter((rule) => {
    const key = `${normalizeText(rule.label)}::${normalizeText(rule.detail)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return Boolean(rule.label || rule.detail);
  });
}

function uniqueSentences(sentences = []) {
  return [...new Set(sentences.map((sentence) => cleanText(sentence)).filter(Boolean))];
}

function joinPhrase(values = []) {
  return uniqueValues(Array.isArray(values) ? values : [values]).join(' · ');
}
