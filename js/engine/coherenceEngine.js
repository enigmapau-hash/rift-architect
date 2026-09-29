import { clampNumber, normalizeText } from './utils.js';

const CONFLICT_RULES = [
  {
    key: 'splitpush-teamfight',
    labels: ['Splitpush', 'Teamfight'],
    detail: 'La composición mezcla presión lateral con una pelea agrupada muy distinta.',
    penalty: 18,
  },
  {
    key: 'poke-dive',
    labels: ['Poke', 'Dive'],
    detail: 'El plan de desgaste no encaja bien con la entrada agresiva a corta distancia.',
    penalty: 16,
  },
  {
    key: 'protect-dive',
    labels: ['Protect', 'Dive'],
    detail: 'Proteger al carry y lanzarlo al frente suelen pedir timings distintos.',
    penalty: 14,
  },
  {
    key: 'frontline-splitpush',
    labels: ['Front to Back', 'Splitpush'],
    detail: 'La estructura frontal compite con la presión lateral como condición principal.',
    penalty: 12,
  },
  {
    key: 'poke-teamfight',
    labels: ['Poke', 'Teamfight'],
    detail: 'Desgastar y cerrar 5v5 no son necesariamente incompatibles, pero requieren orden.',
    penalty: 8,
  },
];

function coherenceLabel(score) {
  if (score >= 80) return 'Muy coherente';
  if (score >= 60) return 'Coherente';
  if (score >= 40) return 'Mixta';
  return 'Dispersa';
}

function includesIdentity(text, keywords = []) {
  const normalized = normalizeText(text);
  return keywords.some((keyword) => normalized.includes(normalizeText(keyword)));
}

function detectConflicts(identitySummary) {
  const labels = [identitySummary?.primary?.label, ...(identitySummary?.secondary || []).map((item) => item.label)]
    .filter(Boolean)
    .map((item) => String(item));

  return CONFLICT_RULES.filter((rule) => {
    const [a, b] = rule.labels;
    const hasA = labels.some((label) => normalizeText(label).includes(normalizeText(a)));
    const hasB = labels.some((label) => normalizeText(label).includes(normalizeText(b)));
    return hasA && hasB;
  });
}

function driverList(identitySummary, synergies = []) {
  const drivers = [];
  if (identitySummary?.primary?.label) drivers.push(identitySummary.primary.label);
  (identitySummary?.secondary || []).slice(0, 2).forEach((item) => drivers.push(item.label));
  synergies.slice(0, 2).forEach((item) => drivers.push(item.label));
  return [...new Set(drivers)].filter(Boolean).slice(0, 4);
}

export function evaluateCoherence({ identitySummary = null, synergies = [], selectedChampions = [] } = {}) {
  const primary = identitySummary?.primary?.label || 'Sin definir';
  const secondary = Array.isArray(identitySummary?.secondary) ? identitySummary.secondary.map((item) => item.label).filter(Boolean) : [];
  const conflicts = detectConflicts(identitySummary);

  let score = 58;
  if (identitySummary?.dominance === 'dominant') score += 18;
  if (identitySummary?.dominance === 'hybrid') score += 8;
  if (identitySummary?.dominance === 'flexible') score -= 4;

  score += Math.min(12, synergies.length * 4);
  score += Math.min(8, selectedChampions.length);
  score -= conflicts.reduce((sum, rule) => sum + rule.penalty, 0);
  score = clampNumber(Math.round(score), 0, 100);

  const label = coherenceLabel(score);
  const detail =
    label === 'Muy coherente'
      ? 'Toda la composición apunta al mismo plan.'
      : label === 'Coherente'
        ? 'La composición tiene un plan claro con poca fricción interna.'
        : label === 'Mixta'
          ? 'Conviven dos ideas distintas y hay que priorizar una.'
          : 'Hay varios planes compitiendo entre sí.';

  return {
    label,
    score,
    detail,
    primary,
    secondary,
    drivers: driverList(identitySummary, synergies),
    conflicts: conflicts.map((rule) => ({
      key: rule.key,
      label: rule.labels.join(' vs '),
      detail: rule.detail,
    })),
  };
}
