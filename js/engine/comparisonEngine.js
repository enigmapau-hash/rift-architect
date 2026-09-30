import { analyzeComposition } from './analysisEngine.js';
import { clampNumber, getLabelText, normalizeText, uniqueOrdered } from './utils.js';

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeList(values = []) {
  return uniqueOrdered(
    values
      .map((value) => getLabelText(value))
      .filter(Boolean)
  );
}

function compareText(beforeValue, afterValue) {
  return normalizeText(getLabelText(beforeValue)) === normalizeText(getLabelText(afterValue));
}

function buildFieldChange(label, beforeValue, afterValue) {
  const before = getLabelText(beforeValue) || 'Sin definir';
  const after = getLabelText(afterValue) || 'Sin definir';

  return {
    label,
    before,
    after,
    changed: !compareText(before, after),
  };
}

function buildListChange(label, beforeItems = [], afterItems = []) {
  const before = normalizeList(beforeItems);
  const after = normalizeList(afterItems);
  const beforeSet = new Set(before.map((item) => normalizeText(item)));
  const afterSet = new Set(after.map((item) => normalizeText(item)));

  return {
    label,
    before,
    after,
    added: after.filter((item) => !beforeSet.has(normalizeText(item))),
    removed: before.filter((item) => !afterSet.has(normalizeText(item))),
    kept: before.filter((item) => afterSet.has(normalizeText(item))),
    changed: before.join(' · ') !== after.join(' · '),
  };
}

function getMetricEntries(metrics = []) {
  return asArray(metrics)
    .map((metric) => ({
      key: metric?.key || metric?.label || metric?.name || '',
      label: getLabelText(metric?.label || metric?.name || metric?.key),
      score: Number.isFinite(Number(metric?.score)) ? Number(metric.score) : 0,
    }))
    .filter((metric) => metric.key || metric.label);
}

function buildMetricChange(beforeMetrics = [], afterMetrics = []) {
  const beforeMap = new Map(getMetricEntries(beforeMetrics).map((metric) => [metric.key, metric]));
  const afterMap = new Map(getMetricEntries(afterMetrics).map((metric) => [metric.key, metric]));
  const keys = uniqueOrdered([...beforeMap.keys(), ...afterMap.keys()]);

  return keys.map((key) => {
    const before = beforeMap.get(key) || { key, label: getLabelText(key) || key, score: 0 };
    const after = afterMap.get(key) || { key, label: getLabelText(key) || key, score: 0 };
    const delta = after.score - before.score;

    return {
      key,
      label: after.label || before.label || key,
      before: before.score,
      after: after.score,
      delta,
      changed: delta !== 0,
    };
  });
}

function buildWindowChange(beforeWindows = {}, afterWindows = {}) {
  return ['early', 'mid', 'late'].map((key) => {
    const before = beforeWindows[key] || {};
    const after = afterWindows[key] || {};
    const beforeLabel = getLabelText(before.label) || 'Sin definir';
    const afterLabel = getLabelText(after.label) || 'Sin definir';
    const beforeScore = Number.isFinite(Number(before.score)) ? Number(before.score) : 0;
    const afterScore = Number.isFinite(Number(after.score)) ? Number(after.score) : 0;

    return {
      key,
      before: beforeLabel,
      after: afterLabel,
      beforeScore,
      afterScore,
      delta: afterScore - beforeScore,
      changed: !compareText(beforeLabel, afterLabel) || beforeScore !== afterScore,
      detailBefore: getLabelText(before.detail),
      detailAfter: getLabelText(after.detail),
    };
  });
}

function buildHighlights(comparison) {
  const highlights = [];

  if (comparison.identity.changed) {
    highlights.push(`Identidad: ${comparison.identity.before} → ${comparison.identity.after}`);
  }

  if (comparison.tempo.changed) {
    highlights.push(`Tempo: ${comparison.tempo.before} → ${comparison.tempo.after}`);
  }

  if (comparison.winCondition.changed) {
    highlights.push(`Victoria: ${comparison.winCondition.before} → ${comparison.winCondition.after}`);
  }

  if (comparison.coherence.changed) {
    highlights.push(`Coherencia: ${comparison.coherence.before} → ${comparison.coherence.after}`);
  }

  if (comparison.confidence.delta !== 0) {
    const sign = comparison.confidence.delta > 0 ? '+' : '';
    highlights.push(`Confianza: ${comparison.confidence.before} → ${comparison.confidence.after} (${sign}${comparison.confidence.delta})`);
  }

  asArray(comparison.metrics)
    .filter((metric) => metric.changed)
    .slice(0, 4)
    .forEach((metric) => {
      const sign = metric.delta > 0 ? '+' : '';
      highlights.push(`${metric.label}: ${metric.before} → ${metric.after} (${sign}${metric.delta})`);
    });

  if (!highlights.length) {
    highlights.push('La composición mantiene el plan principal.');
  }

  return highlights;
}

function buildImpactSummary(comparison) {
  const metricScore = asArray(comparison.metrics).reduce((total, metric) => total + (metric.delta || 0), 0);
  const strengthScore = (comparison.strengths.added.length * 2) + (comparison.strengths.kept.length * 0.5) - (comparison.strengths.removed.length * 2);
  const weaknessScore = (comparison.weaknesses.removed.length * 2) - (comparison.weaknesses.added.length * 2);
  const synergyScore = (comparison.synergies.added.length * 1.5) - (comparison.synergies.removed.length * 1.5);
  const dependencyScore = (comparison.dependencies.removed.length * 1.5) - (comparison.dependencies.added.length * 1.5);
  const confidenceScore = comparison.confidence.delta * 0.5;
  const rawScore = metricScore + strengthScore + weaknessScore + synergyScore + dependencyScore + confidenceScore;
  const impactScore = clampNumber(Math.round(rawScore), -100, 100);
  const verdict = impactScore > 2 ? 'Mejora' : impactScore < -2 ? 'Empeora' : 'Neutro';

  const positiveMetric = asArray(comparison.metrics)
    .filter((metric) => metric.delta > 0)
    .sort((a, b) => b.delta - a.delta || normalizeText(a.label).localeCompare(normalizeText(b.label)))[0];
  const negativeMetric = asArray(comparison.metrics)
    .filter((metric) => metric.delta < 0)
    .sort((a, b) => a.delta - b.delta || normalizeText(a.label).localeCompare(normalizeText(b.label)))[0];

  const gain = positiveMetric?.delta
    ? `${positiveMetric.label} +${positiveMetric.delta}`
    : comparison.strengths.added[0] || comparison.synergies.added[0] || comparison.dependencies.removed[0] || 'Sin mejora clara';
  const loss = negativeMetric?.delta
    ? `${negativeMetric.label} ${negativeMetric.delta}`
    : comparison.strengths.removed[0] || comparison.weaknesses.added[0] || comparison.synergies.removed[0] || 'Sin pérdida clara';

  return {
    score: impactScore,
    verdict,
    gain,
    loss,
    reason: comparison.highlights[0] || 'Comparación equilibrada entre ambos estados del draft.',
  };
}

function buildOrderedChangeSummary(listChange) {
  return {
    ...listChange,
    added: listChange.added.slice(0, 3),
    removed: listChange.removed.slice(0, 3),
    kept: listChange.kept.slice(0, 3),
  };
}

function resolveAnalysis(input) {
  if (!input) return analyzeComposition([]);
  if (Array.isArray(input)) return analyzeComposition(input);
  if (typeof input === 'object' && input.primaryIdentity) return input;
  if (typeof input === 'object' && Array.isArray(input.selectedChampions)) {
    return analyzeComposition(input.selectedChampions);
  }
  return analyzeComposition([]);
}

export function compareAnalyses(beforeAnalysis = {}, afterAnalysis = {}) {
  const comparison = {
    identity: buildFieldChange('Identidad', beforeAnalysis.primaryIdentity, afterAnalysis.primaryIdentity),
    tempo: buildFieldChange('Tempo', beforeAnalysis.tempoDetail?.label || beforeAnalysis.tempo, afterAnalysis.tempoDetail?.label || afterAnalysis.tempo),
    winCondition: buildFieldChange('Condición de victoria', beforeAnalysis.winCondition?.label, afterAnalysis.winCondition?.label),
    coherence: buildFieldChange('Coherencia', beforeAnalysis.coherence?.label, afterAnalysis.coherence?.label),
    summaryText: buildFieldChange('Resumen', beforeAnalysis.summaryText, afterAnalysis.summaryText),
    objective: buildFieldChange('Objetivo estratégico', beforeAnalysis.advisor?.primaryObjective, afterAnalysis.advisor?.primaryObjective),
    confidence: {
      before: Number.isFinite(Number(beforeAnalysis.confidence)) ? Math.round(Number(beforeAnalysis.confidence)) : 0,
      after: Number.isFinite(Number(afterAnalysis.confidence)) ? Math.round(Number(afterAnalysis.confidence)) : 0,
      delta: 0,
    },
    strengths: buildOrderedChangeSummary(buildListChange('Fortalezas', beforeAnalysis.strengths, afterAnalysis.strengths)),
    weaknesses: buildOrderedChangeSummary(buildListChange('Debilidades', beforeAnalysis.weaknesses, afterAnalysis.weaknesses)),
    synergies: buildOrderedChangeSummary(buildListChange('Sinergias', beforeAnalysis.synergies, afterAnalysis.synergies)),
    dependencies: buildOrderedChangeSummary(buildListChange('Dependencias', beforeAnalysis.dependencies?.items, afterAnalysis.dependencies?.items)),
    objectivePriority: buildListChange('Prioridades estratégicas', beforeAnalysis.advisor?.objectivePriority, afterAnalysis.advisor?.objectivePriority),
    loseConditions: buildListChange('Condiciones de derrota', beforeAnalysis.advisor?.loseConditions, afterAnalysis.advisor?.loseConditions),
    insights: buildListChange('Insights', beforeAnalysis.assistant?.insights, afterAnalysis.assistant?.insights),
    alerts: buildListChange('Alertas', beforeAnalysis.assistant?.alerts, afterAnalysis.assistant?.alerts),
    explanation: buildListChange('Explicación', beforeAnalysis.explanation?.summary, afterAnalysis.explanation?.summary),
    metrics: buildMetricChange(beforeAnalysis.metrics, afterAnalysis.metrics),
    gameWindows: buildWindowChange(beforeAnalysis.advisor?.gameWindows, afterAnalysis.advisor?.gameWindows),
    changedFields: [],
    highlights: [],
    summary: {},
    impact: {},
    beforeAnalysis,
    afterAnalysis,
  };

  comparison.confidence.delta = comparison.confidence.after - comparison.confidence.before;
  comparison.changedFields = uniqueOrdered([
    comparison.identity.changed ? comparison.identity.label : null,
    comparison.tempo.changed ? comparison.tempo.label : null,
    comparison.winCondition.changed ? comparison.winCondition.label : null,
    comparison.coherence.changed ? comparison.coherence.label : null,
    comparison.summaryText.changed ? comparison.summaryText.label : null,
    comparison.objective.changed ? comparison.objective.label : null,
    comparison.strengths.changed ? comparison.strengths.label : null,
    comparison.weaknesses.changed ? comparison.weaknesses.label : null,
    comparison.synergies.changed ? comparison.synergies.label : null,
    comparison.dependencies.changed ? comparison.dependencies.label : null,
    comparison.objectivePriority.changed ? comparison.objectivePriority.label : null,
    comparison.loseConditions.changed ? comparison.loseConditions.label : null,
    comparison.insights.changed ? comparison.insights.label : null,
    comparison.alerts.changed ? comparison.alerts.label : null,
    comparison.explanation.changed ? comparison.explanation.label : null,
    ...comparison.metrics.filter((metric) => metric.changed).map((metric) => metric.label),
    ...comparison.gameWindows.filter((window) => window.changed).map((window) => `Ventana ${window.key}`),
  ].filter(Boolean));

  comparison.highlights = buildHighlights(comparison);
  comparison.impact = buildImpactSummary(comparison);
  comparison.summary = {
    verdict: comparison.impact.verdict,
    confidenceDelta: comparison.confidence.delta,
    keyGain: comparison.impact.gain,
    keyLoss: comparison.impact.loss,
    reason: comparison.impact.reason,
  };

  return comparison;
}

export function compareCompositions(beforeSelectedChampions = [], afterSelectedChampions = []) {
  return compareAnalyses(resolveAnalysis(beforeSelectedChampions), resolveAnalysis(afterSelectedChampions));
}

export function buildComparisonSummary(beforeAnalysis = {}, afterAnalysis = {}) {
  return compareAnalyses(beforeAnalysis, afterAnalysis).summary;
}
