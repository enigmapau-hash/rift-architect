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
  const primaryIdentity = cleanText(report.primaryIdentity || report.identity?.primaryIdentity || composition.identities?.[0] || 'Sin definir');
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

  const identityLine = buildIdentityLine({ strategicProfile, identityRule, dependencyRule, signalSet, primaryIdentity });
  const winLine = buildWinLine({ strategicProfile, winRule, patternRule, macroRule, signalSet, primaryIdentity, tempo });
  const conflictLine = buildConflictLine({ strategicProfile, conflictRules });
  const tempoLine = buildTempoLine({ strategicProfile, tempo, winRule, confidence });
  const macroLine = buildMacroLine({ strategicProfile, macroRule, patternRule, dependencyRule });

  const rules = uniqueRuleList([
    { label: 'Lectura de identidad', detail: identityLine, kind: 'identity' },
    { label: 'Condición de victoria', detail: winLine, kind: 'win' },
    { label: 'Ritmo recomendado', detail: tempoLine, kind: 'tempo' },
    { label: 'Plan macro', detail: macroLine, kind: 'macro' },
    { label: 'Riesgo principal', detail: conflictLine, kind: 'risk' },
  ]).slice(0, 4);

  const lead = buildLead([identityLine, tempoLine, winLine, macroLine, conflictLine]);
  const headline = buildContextualHeadline(primaryIdentity, strategicProfile?.label || winRule?.label || patternRule?.label || 'Lectura contextual');

  return {
    headline,
    lead,
    summary: lead,
    rules,
    signals: signalSet.signals.slice(0, 8),
    tags: buildContextualTags({
      primaryIdentity,
      tempo,
      strategicProfile,
      winRule,
      patternRule,
      macroRule,
      dependencyRule,
      identityRule,
      rules,
      signalSet,
    }),
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
  if (['scaling', 'late'].includes(normalized)) return ['scaling'];
  if (['early'].includes(normalized)) return ['early'];
  if (['mid'].includes(normalized)) return ['mid'];
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
    return 'Si juegas Dive, no abras de frente: entra con visión, ángulo y follow-up preparado.';
  }

  if (key === 'splitpush') {
    return 'Si cierras el mapa en un 5v5, le regalas al rival el terreno que quería; abre laterales y fuerza respuestas.';
  }

  if (key === 'poke') {
    return 'Si el desgaste no te compra espacio, el asedio se queda corto; empuja primero, comprométete después.';
  }

  if (key === 'protect' || key === 'fronttoback') {
    return 'Tu estructura necesita tiempo y orden: baja el ritmo temprano y llega al cierre con carry y peel listos.';
  }

  if (key === 'pick' || key === 'engage' || key === 'skirmish') {
    return 'Tu ventana de valor dura poco: fija una entrada limpia y convierte la primera respuesta enemiga en ventaja.';
  }

  if (key === 'teamfight' || key === 'control') {
    return 'Ganas cuando el combate está preparado: visión, espacio cerrado y una pelea limpia.';
  }

  if (dependencyRule?.detail) {
    return dependencyRule.detail;
  }

  if (identityRule?.label) {
    return `Tu eje es ${identityRule.label}; no lo disperses con peleas sueltas.`;
  }

  if (signalSet.categories.includes('frontline') || signalSet.categories.includes('control')) {
    return 'La composición necesita orden y espacio para que el plan no se rompa.';
  }

  return 'Aún no hay una historia dominante; decide si vas a entrar, desgastar o abrir mapa.';
}

function buildWinLine({ strategicProfile, winRule, patternRule, macroRule, signalSet, primaryIdentity, tempo }) {
  if (strategicProfile?.condition) return strategicProfile.condition;

  const key = normalizeText(primaryIdentity);
  const tempoKey = normalizeText(tempo);

  if (key === 'dive' || key === 'engage' || key === 'pick' || key === 'skirmish') {
    return 'Si enfrente hay más engage, tu condición cambia: no abras de frente; espera a que la respuesta enemiga ya esté fijada.';
  }

  if (key === 'splitpush') {
    return 'Si el mapa se aprieta, abre laterales antes de agruparte; no regales el 5v5 que quieres evitar.';
  }

  if (key === 'poke') {
    return 'Si te fuerzan a all-in, ya llegaste tarde; desgasta primero, toma espacio y sólo entra con ventaja de rango.';
  }

  if (key === 'protect' || key === 'fronttoback' || tempoKey === 'late') {
    return 'Ralentiza el early: tu pico de poder llega cuando front line, peel y carry ya están listos.';
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
    return `Juega alrededor de ${signalSet.signals[0].toLowerCase()} y evita improvisar la pelea.`;
  }

  return 'Juega alrededor de tu plan dominante y no conviertas una ventaja pequeña en una pelea caótica.';
}

function buildConflictLine({ strategicProfile, conflictRules }) {
  const profileMistakes = Array.isArray(strategicProfile?.mistakes) && strategicProfile.mistakes.length
    ? `Si repites ${joinPhrase(strategicProfile.mistakes)}, pierdes orden.`
    : '';

  if (conflictRules.length) {
    const conflict = conflictRules[0];
    const labels = conflict.labels.join(' y ');
    const text = `Aquí chocan ${labels}: ${conflict.detail}`;
    return uniqueSentences([profileMistakes, text]).join(' ');
  }

  if (profileMistakes) return profileMistakes;
  return 'No hay una tensión estratégica dominante visible.';
}

function buildTempoLine({ strategicProfile, tempo, confidence, winRule }) {
  if (Array.isArray(strategicProfile?.timings) && strategicProfile.timings.length) {
    const timings = joinPhrase(strategicProfile.timings);
    return `Tu ventana útil está en ${timings}; si te sales de ese rango, el rival estabiliza el mapa.`;
  }

  const tempoKey = normalizeText(tempo);
  if (tempoKey === 'early') return 'Acelera el early antes de que el rival estabilice el mapa.';
  if (tempoKey === 'late') return 'Ralentiza el early: tu pico de poder aparece más tarde y no conviene forzarlo antes de tiempo.';

  const confidenceText = confidence >= 80 ? 'alto' : confidence >= 60 ? 'medio' : 'limitado';
  if (winRule?.label) {
    return `El ritmo correcto es ${confidenceText}: construye la pelea alrededor de ${winRule.label.toLowerCase()}.`;
  }

  return 'El ritmo adecuado es estable: evita acelerar sin una ventana clara.';
}

function buildMacroLine({ strategicProfile, macroRule, patternRule, dependencyRule }) {
  const macro = joinPhrase(Array.isArray(strategicProfile?.macro) ? strategicProfile.macro : []);
  const objectives = joinPhrase(Array.isArray(strategicProfile?.objectives) ? strategicProfile.objectives : []);

  if (macro || objectives) {
    return [macro ? `Prioridad macro: ${macro}.` : '', objectives ? `Objetivos a buscar: ${objectives}.` : '']
      .filter(Boolean)
      .join(' ');
  }

  if (macroRule?.detail) return macroRule.detail;
  if (patternRule?.detail) return patternRule.detail;
  if (dependencyRule?.detail) return dependencyRule.detail;
  return 'Juega el mapa desde tu identidad dominante, no al revés.';
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

function buildLead(sentences = []) {
  return uniqueSentences(sentences).filter(Boolean).slice(0, 3).join(' ');
}

function buildContextualHeadline(primaryIdentity, focus) {
  const identity = cleanText(primaryIdentity);
  const strategicFocus = cleanText(focus);
  const identityKey = normalizeText(identity);
  const focusKey = normalizeText(strategicFocus);

  if (!identity && !strategicFocus) return 'Lectura contextual';
  if (!strategicFocus) return identity || 'Lectura contextual';

  if (focusKey === identityKey) return identity || strategicFocus;

  if (identityKey && focusKey.startsWith(`${identityKey} `)) {
    return strategicFocus;
  }

  if (identityKey && strategicFocus.includes('·')) {
    const parts = strategicFocus.split('·').map((part) => cleanText(part)).filter(Boolean);
    if (parts.length === 2 && normalizeText(parts[0]) === identityKey && normalizeText(parts[1]) === identityKey) {
      return identity;
    }
  }

  return identity ? `${identity} · ${strategicFocus}` : strategicFocus;
}

function buildContextualTags({
  primaryIdentity,
  tempo,
  strategicProfile,
  winRule,
  patternRule,
  macroRule,
  dependencyRule,
  identityRule,
  rules,
  signalSet,
}) {
  const candidates = [
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
  ];

  return uniqueValues(candidates.flat ? candidates.flat() : candidates)
    .filter((value) => {
      const normalized = normalizeText(value);
      return normalized && normalized !== 'sin definir' && normalized !== 'lectura contextual' && normalized !== 'narrativa adaptativa';
    })
    .slice(0, 10);
}

function joinPhrase(values = []) {
  return uniqueValues(Array.isArray(values) ? values : [values]).join(' · ');
}
