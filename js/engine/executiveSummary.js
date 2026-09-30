const DEFAULT_WINDOW = 'Mid Game';

function uniqueValues(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function clampWords(text, maxWords = 12) {
  const words = String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);

  return words.slice(0, maxWords).join(' ');
}

function gradeFromScore(score) {
  if (score >= 95) return 'A+';
  if (score >= 88) return 'A';
  if (score >= 80) return 'B+';
  if (score >= 72) return 'B';
  if (score >= 64) return 'C+';
  if (score >= 56) return 'C';
  return 'D';
}

function labelFromScore(score) {
  if (score >= 85) return 'Alta confianza';
  if (score >= 70) return 'Confianza media-alta';
  return 'Necesita ajustes';
}

function scoreMetric(metrics, key) {
  if (!Array.isArray(metrics)) return 0;
  const metric = metrics.find((entry) => entry?.key === key);
  return clamp(Number(metric?.score) || 0, 0, 100);
}

export function buildDraftProfile(analysis = {}) {
  const metrics = Array.isArray(analysis.metrics) ? analysis.metrics : [];
  const score = (key) => scoreMetric(metrics, key);
  const average = (keys) => Math.round(keys.reduce((sum, key) => sum + score(key), 0) / Math.max(1, keys.length));
  const label = (value) => {
    if (value >= 75) return 'Muy fuerte';
    if (value >= 55) return 'Aceptable';
    return 'Débil';
  };

  return [
    {
      label: 'Teamfight',
      score: average(['frontline', 'engage', 'control', 'teamfight']),
      text: analysis?.winCondition?.label || 'Luchas agrupadas y controladas.',
    },
    {
      label: 'Engage',
      score: average(['engage', 'pick', 'mobility']),
      text: 'Capacidad para iniciar y forzar.',
    },
    {
      label: 'Scaling',
      score: average(['scaling', 'damage']),
      text: analysis?.tempoDetail?.label || DEFAULT_WINDOW,
    },
    {
      label: 'Poke',
      score: average(['poke', 'control']),
      text: 'Desgaste a distancia antes de entrar.',
    },
    {
      label: 'Split Push',
      score: score('splitpush'),
      text: 'Capacidad para abrir mapa y laterales.',
    },
  ].map((item) => ({
    ...item,
    badge: label(item.score),
  }));
}

export function buildPriorityChips(analysis = {}) {
  const windowLabel = analysis?.tempoDetail?.label || DEFAULT_WINDOW;
  return uniqueValues([
    analysis?.winCondition?.label,
    analysis?.coherence?.label,
    `Pico: ${windowLabel}`,
    analysis?.primaryIdentity,
  ]).slice(0, 4);
}

export function buildExecutiveSummary(analysis = {}) {
  const confidence = clamp(Number(analysis?.confidence) || 0, 0, 100);
  const title = `${analysis?.primaryIdentity || 'Draft'} · ${analysis?.winCondition?.label || 'Plan claro'}`;
  const text = clampWords(
    [
      analysis?.winCondition?.detail || analysis?.summaryText || 'Tu composición sigue su identidad principal.',
      `Objetivo: ${analysis?.winCondition?.label || analysis?.primaryIdentity || 'jugar a tu plan'}.`,
      `Pico de poder: ${analysis?.tempoDetail?.label || DEFAULT_WINDOW}.`,
    ].join(' '),
    24
  );

  return {
    title,
    text,
    grade: gradeFromScore(confidence),
    badge: labelFromScore(confidence),
    score: confidence,
    tags: uniqueValues([
      analysis?.primaryIdentity,
      analysis?.winCondition?.label,
      analysis?.tempoDetail?.label,
      analysis?.coherence?.label,
      `${confidence}%`,
    ]).slice(0, 4),
    profile: buildDraftProfile(analysis),
    priorities: buildPriorityChips(analysis),
  };
}