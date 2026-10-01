import { normalizeText } from './utils.js';

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function toText(value, fallback = 'Sin definir') {
  if (value == null) return fallback;
  if (typeof value === 'string') return value.trim() || fallback;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map((item) => toText(item, '')).filter(Boolean).join(' · ') || fallback;
  if (typeof value === 'object') {
    return toText(
      value.label ?? value.title ?? value.name ?? value.text ?? value.value ?? value.detail ?? value.summary ?? value.reason ?? value.description ?? value.champion ?? value.item ?? '',
      fallback
    );
  }
  return String(value) || fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function formatMetric(metric) {
  if (!metric) return null;
  const label = toText(metric.label || metric.key || 'Métrica');
  const score = clamp(Math.round(Number(metric.score) || 0), 0, 100);
  return { key: toText(metric.key || label), label, score };
}

function collectMetrics(analysis, terms = []) {
  const metrics = toArray(analysis?.metrics).map(formatMetric).filter(Boolean);
  if (!metrics.length) return [];

  const normalizedTerms = unique(terms.map((term) => normalizeText(term))).filter(Boolean);
  if (!normalizedTerms.length) {
    return metrics.slice(0, 3);
  }

  const matched = metrics.filter((metric) => {
    const normalizedLabel = normalizeText(metric.label);
    return normalizedTerms.some((term) => normalizedLabel.includes(term) || term.includes(normalizedLabel));
  });

  return (matched.length ? matched : metrics).slice(0, 3);
}

function collectChampions(...groups) {
  return unique(groups.flat().map((item) => toText(item))).filter(Boolean).slice(0, 4);
}

function evidenceItem(source, label, detail, weight = 0, champions = []) {
  return {
    source: toText(source),
    label: toText(label),
    detail: toText(detail, ''),
    weight: clamp(Math.round(Number(weight) || 0), 0, 100),
    champions: collectChampions(champions),
  };
}

function normalizeEvidenceList(items = []) {
  return toArray(items)
    .map((item) => ({
      source: toText(item?.source || item?.label || item?.name || item),
      label: toText(item?.label || item?.title || item?.name || item?.source || item),
      detail: toText(item?.detail || item?.text || item?.summary || ''),
      weight: clamp(Math.round(Number(item?.weight) || 0), 0, 100),
      champions: collectChampions(item?.champions || []),
    }))
    .filter((item) => item.label || item.detail || item.source);
}

function recommendationId(prefix, title) {
  const slug = normalizeText(title || prefix).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return `${prefix}-${slug || 'item'}`;
}

function confidenceLabel(score = 0) {
  if (score >= 90) return 'Muy alta';
  if (score >= 75) return 'Alta';
  if (score >= 60) return 'Media';
  return 'Baja';
}

function makeRecommendation({ id, category, priority, action, reason, confidence, evidence = [], affectedChampions = [], metrics = [] }) {
  return {
    id,
    category,
    priority: clamp(Math.round(Number(priority) || 0), 1, 100),
    confidence: clamp(Math.round(Number(confidence) || 0), 0, 100),
    confidenceLabel: confidenceLabel(confidence),
    action: toText(action),
    reason: toText(reason, 'Sin detalle disponible.'),
    evidence: normalizeEvidenceList(evidence).slice(0, 4),
    affectedChampions: collectChampions(affectedChampions),
    metrics: toArray(metrics).map(formatMetric).filter(Boolean).slice(0, 4),
  };
}

function scoreFromAnalysis(analysis, fallback = 65) {
  const confidence = Number(analysis?.confidence) || 0;
  const coherence = Number(analysis?.coherence?.score) || 0;
  return clamp(Math.round(confidence * 0.45 + coherence * 0.35 + fallback * 0.2), 0, 100);
}

function buildPlanRecommendation(analysis) {
  const identity = toText(analysis?.primaryIdentity || 'Jugar alrededor de la identidad');
  const winCondition = analysis?.winCondition || {};
  const coach = analysis?.coach || {};
  const advisor = analysis?.advisor || {};
  const planText = toText(winCondition.detail || coach?.briefing || analysis?.summaryText || 'La composición debe seguir su plan dominante.');
  const action = advisor?.primaryObjective || winCondition.label || identity;
  const champions = collectChampions(winCondition.champions || [], analysis?.identityBreakdown?.[0]?.champions || [], coach?.summary?.identity, analysis?.primaryIdentity);
  const evidence = [
    evidenceItem('win-condition', action, planText, winCondition.score || 5, champions),
    evidenceItem('identity', identity, analysis?.summaryText || 'La identidad define la dirección de la partida.', Number(analysis?.confidence) || 4, champions),
    evidenceItem('coach', coach?.headline || 'StrategicPlan', coach?.summary?.reason || 'El coach ordena la ejecución del plan.', 3, champions),
  ];

  return makeRecommendation({
    id: recommendationId('plan', action),
    category: 'plan',
    priority: 100,
    action,
    reason: planText,
    confidence: scoreFromAnalysis(analysis, 80),
    evidence,
    affectedChampions: champions,
    metrics: collectMetrics(analysis, ['Objetivos', 'Teamfight', 'Frontline', 'Control']),
  });
}

function buildTempoRecommendation(analysis) {
  const tempo = analysis?.tempoDetail || {};
  const coach = analysis?.coach || {};
  const action = toText(tempo.label || analysis?.tempo || 'Jugar a tu tempo');
  const reason = toText(tempo.detail || coach?.summary?.powerSpike || 'El ritmo de la composición marca cuándo debes pelear.');
  const champions = collectChampions(tempo.champions || [], analysis?.secondaryIdentities || [], analysis?.primaryIdentity);
  const evidence = [
    evidenceItem('tempo', action, reason, tempo.confidence || 4, champions),
    ...normalizeEvidenceList(tempo.evidence || []).slice(0, 2),
    evidenceItem('coach', coach?.summary?.powerSpike || 'Power spike', coach?.summary?.powerSpike || 'Existe una ventana concreta de poder.', 2, champions),
  ];

  return makeRecommendation({
    id: recommendationId('tempo', action),
    category: 'tempo',
    priority: 92,
    action,
    reason,
    confidence: scoreFromAnalysis(analysis, 72),
    evidence,
    affectedChampions: champions,
    metrics: collectMetrics(analysis, ['Escalado', 'Movilidad', 'Poke', 'Pick']),
  });
}

function buildPriorityRecommendation(analysis) {
  const advisor = analysis?.advisor || {};
  const coach = analysis?.coach || {};
  const priorities = toArray(advisor?.objectivePriority).length ? toArray(advisor.objectivePriority) : toArray(analysis?.priorities);
  const top = priorities[0] || null;
  const action = toText(top?.label || advisor?.primaryObjective || analysis?.winCondition?.label || 'Prioridad principal');
  const reason = toText(top?.detail || coach?.summary?.priority || 'La composición necesita una decisión ordenada.');
  const champions = collectChampions(top?.champions || [], advisor?.gameWindows?.early?.label, advisor?.gameWindows?.mid?.label);
  const evidence = [
    evidenceItem('priority', action, reason, top?.score || top?.weight || 4, champions),
    evidenceItem('advisor', advisor?.summary?.priority || action, advisor?.summary?.reason || reason, 3, champions),
    ...normalizeEvidenceList(analysis?.explainability?.summary || []).slice(0, 1),
  ];

  return makeRecommendation({
    id: recommendationId('priority', action),
    category: 'priority',
    priority: 88,
    action,
    reason,
    confidence: clamp((Number(top?.score) || 4) * 18, 45, 96),
    evidence,
    affectedChampions: champions,
    metrics: collectMetrics(analysis, ['Objetivos', 'Control', 'Teamfight']),
  });
}

function buildRiskRecommendation(analysis) {
  const risks = toArray(analysis?.criticalErrors || analysis?.advisor?.loseConditions || analysis?.weaknesses);
  const top = risks[0] || null;
  const action = toText(top?.label || 'Mitigar riesgo principal');
  const reason = toText(top?.detail || 'Evitar el punto débil más castigable de la composición.');
  const champions = collectChampions(top?.champions || [], analysis?.explainability?.dependencies?.[0]?.champions || []);
  const evidence = [
    evidenceItem('risk', action, reason, 4, champions),
    ...normalizeEvidenceList(analysis?.explainability?.dependencies || []).slice(0, 2),
    ...normalizeEvidenceList(analysis?.explainability?.synergies || []).slice(0, 1),
  ];

  return makeRecommendation({
    id: recommendationId('risk', action),
    category: 'risk',
    priority: 84,
    action,
    reason,
    confidence: clamp((Number(analysis?.coherence?.score) || 60) - 5, 42, 92),
    evidence,
    affectedChampions: champions,
    metrics: collectMetrics(analysis, ['Control', 'Frontline', 'Splitpush', 'Poke']),
  });
}

function buildDraftRecommendation(analysis) {
  const draft = analysis?.draftAssistant || {};
  const pick = toArray(draft.pickRecommendations)[0] || null;
  const action = toText(pick?.label || pick?.action || 'Completar el draft');
  const reason = toText(pick?.detail || draft?.summary || 'La composición necesita un pick que cubra la carencia principal.');
  const champions = collectChampions(pick?.classTags || [], pick?.profileLabel || [], pick?.champions || []);
  const evidence = [
    evidenceItem('pick', action, reason, pick?.confidence || 4, champions),
    evidenceItem('needs', draft?.summary || 'Necesidades del draft', draft?.profileSummary || 'El draft assistant resume las carencias y perfiles.', 3, champions),
    ...normalizeEvidenceList(draft?.compositionNeeds || []).slice(0, 2),
  ];

  return makeRecommendation({
    id: recommendationId('draft', action),
    category: 'draft',
    priority: 80,
    action,
    reason,
    confidence: clamp(Number(pick?.confidence) || scoreFromAnalysis(analysis, 68), 40, 95),
    evidence,
    affectedChampions: champions,
    metrics: collectMetrics(analysis, ['Pick', 'Mobility', 'Damage', 'Waveclear']),
  });
}

function buildBanRecommendation(analysis) {
  const draft = analysis?.draftAssistant || {};
  const ban = toArray(draft.banRecommendations)[0] || null;
  const action = toText(ban?.label || ban?.action || 'Ban principal');
  const reason = toText(ban?.detail || 'Hay una amenaza que castiga especialmente esta composición.');
  const champions = collectChampions(ban?.classTags || [], ban?.profileLabel || [], ban?.champions || []);
  const evidence = [
    evidenceItem('ban', action, reason, 4, champions),
    ...normalizeEvidenceList(draft?.banRecommendations || []).slice(0, 2),
  ];

  return makeRecommendation({
    id: recommendationId('ban', action),
    category: 'ban',
    priority: 78,
    action,
    reason,
    confidence: clamp(Number(ban?.confidence) || scoreFromAnalysis(analysis, 64), 38, 92),
    evidence,
    affectedChampions: champions,
    metrics: collectMetrics(analysis, ['Control', 'Pick', 'Splitpush', 'Poke']),
  });
}

function buildEvidenceRecommendation(analysis) {
  const explanation = analysis?.explanation || analysis?.explainability || {};
  const summary = toArray(explanation.summary || []);
  const identity = explanation.identity || {};
  const tempo = explanation.tempo || {};
  const winCondition = explanation.winCondition || {};
  const sourceItems = unique([
    identity?.label,
    tempo?.label,
    winCondition?.label,
    summary[0]?.label,
    summary[1]?.label,
  ]).filter(Boolean);
  const action = toText(sourceItems[0] || 'La lectura más sólida');
  const reason = unique([identity?.reason, tempo?.reason, winCondition?.reason].filter(Boolean)).join(' · ') || 'La evidencia más fuerte de la lectura global.';
  const champions = collectChampions(identity?.champions || [], tempo?.champions || [], winCondition?.champions || []);
  const evidence = normalizeEvidenceList([...summary, identity, tempo, winCondition]).slice(0, 4);

  return makeRecommendation({
    id: recommendationId('evidence', action),
    category: 'evidence',
    priority: 74,
    action,
    reason,
    confidence: clamp(Number(explanation.confidence) || Number(analysis?.confidence) || 0, 40, 100),
    evidence,
    affectedChampions: champions,
    metrics: collectMetrics(analysis, ['Frontline', 'Engage', 'Objetivos', 'Control']),
  });
}

export function buildRecommendationEngine(analysis = {}) {
  const recommendations = [
    buildPlanRecommendation(analysis),
    buildTempoRecommendation(analysis),
    buildPriorityRecommendation(analysis),
    buildRiskRecommendation(analysis),
    buildDraftRecommendation(analysis),
    buildBanRecommendation(analysis),
    buildEvidenceRecommendation(analysis),
  ]
    .sort((a, b) => b.priority - a.priority || b.confidence - a.confidence)
    .filter((item, index, list) => list.findIndex((candidate) => candidate.id === item.id) === index);

  return {
    summary: recommendations[0]
      ? `${recommendations[0].action} · ${recommendations[0].confidenceLabel}`
      : 'Sin recomendaciones disponibles.',
    items: recommendations,
  };
}
