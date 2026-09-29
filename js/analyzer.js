export const ENGINE_VERSION = '0.4.0';

export const ATTRIBUTE_SPECS = [
  { key: 'frontline', label: 'Frontline' },
  { key: 'engage', label: 'Engage' },
  { key: 'damage', label: 'Daño' },
  { key: 'poke', label: 'Poke' },
  { key: 'teamfight', label: 'Teamfight' },
  { key: 'mobility', label: 'Movilidad' },
  { key: 'control', label: 'Control' },
  { key: 'scaling', label: 'Escalado' },
  { key: 'objective', label: 'Objetivos' },
  { key: 'splitpush', label: 'Splitpush' },
  { key: 'pick', label: 'Pick' },
];

export const CATEGORY_TERMS = {
  frontline: ['frontline', 'tank', 'tanque', 'bruiser', 'warden', 'sustain', 'vanguard', 'juggernaut', 'front to back'],
  engage: ['engage', 'pick', 'hook', 'dive', 'flank', 'initiate', 'catch'],
  damage: ['dps', 'burst', 'carry', 'marksman', 'mage', 'battlemage', 'fighter', 'assassin', 'bruiser'],
  poke: ['poke', 'siege', 'artillery', 'zone control'],
  teamfight: ['teamfight', 'front to back', 'wombo', 'group', 'grupal', 'objective', 'control'],
  mobility: ['mobility', 'movilidad', 'dash', 'roam', 'mobile'],
  control: ['cc', 'control', 'vision', 'anti-engage', 'anti engage', 'waveclear', 'zone control', 'peel'],
  scaling: ['scaling', 'escalado', 'late', 'late game', 'mid/late', 'mid late', 'hypercarry'],
  objective: ['objective', 'objectives', 'dragon', 'nashor', 'herald', 'zone control'],
  splitpush: ['splitpush', 'split', 'side lane', 'duel', 'dueling', '1v1'],
  pick: ['pick', 'catch', 'hook', 'flank', 'dive', 'assassin'],
};

const ROLE_NAMES = {
  top: 'Top',
  jungle: 'Jungla',
  mid: 'Mid',
  botline: 'Botline',
  support: 'Support',
};

const COMPLEXITY_TERMS = ['muy exigente', 'hard', 'difícil', 'mechanical', 'mecanica', 'alto skill', 'high skill', 'riesgo'];
const NORMALIZED_DAMAGE_TERMS = {
  ap: ['mage', 'battlemage', 'artillery', 'enchanter', 'burst', 'magic'],
  ad: ['marksman', 'fighter', 'bruiser', 'assassin', 'duelist', 'ad'],
};

export function scoreChampion(champion) {
  const strengths = normalizeTags(champion?.strengths);
  const weaknesses = normalizeTags(champion?.weaknesses);
  const text = buildSearchText(champion);

  const metrics = ATTRIBUTE_SPECS.map((spec) => {
    const positive = countMatches(strengths, spec.key);
    const negative = countMatches(weaknesses, spec.key);
    const rawScore = positive * 3 - negative;

    return {
      key: spec.key,
      label: spec.label,
      score: clamp(rawScore, 0, 10),
      positive,
      negative,
    };
  });

  const strongest = [...metrics].sort((a, b) => b.score - a.score)[0] || { label: 'Sin datos', score: 0 };
  const weakest = [...metrics].sort((a, b) => a.score - b.score)[0] || { label: 'Sin datos', score: 0 };

  return {
    metrics,
    strongest,
    weakest,
    primaryDamage: detectDamageType(text),
    complexity: scoreComplexity(text),
    source: 'excel',
    sourceLabel: 'Excel',
    confidence: null,
    explicitAttributes: {},
    strengths,
    weaknesses,
  };
}

export function analyzeComposition(selectedChampions) {
  const profiles = selectedChampions.map((champion) => ({
    ...champion,
    profile: scoreChampion(champion),
  }));

  const aggregate = Object.fromEntries(ATTRIBUTE_SPECS.map((spec) => [spec.key, 0]));
  let ap = 0;
  let ad = 0;
  let hybrid = 0;

  profiles.forEach(({ profile }) => {
    profile.metrics.forEach((metric) => {
      aggregate[metric.key] += metric.score;
    });

    if (profile.primaryDamage === 'AP') ap += 1;
    else if (profile.primaryDamage === 'AD') ad += 1;
    else if (profile.primaryDamage === 'Hybrid') hybrid += 1;
  });

  const divisor = Math.max(profiles.length, 1);
  const metrics = ATTRIBUTE_SPECS.map((spec) => ({
    key: spec.key,
    label: spec.label,
    score: clamp(Math.round(aggregate[spec.key] / divisor), 0, 10),
  }));

  const recommendations = [];

  if (selectedChampions.length < 5) {
    recommendations.push(`Te faltan ${5 - selectedChampions.length} pick(s) para completar la composición.`);
  }

  if (ap === 0 && hybrid === 0) {
    recommendations.push('La composición no muestra daño AP claro.');
  }

  if (ad === 0 && hybrid === 0) {
    recommendations.push('La composición no muestra daño AD claro.');
  }

  const frontline = findMetric(metrics, 'frontline');
  const engage = findMetric(metrics, 'engage');
  const scaling = findMetric(metrics, 'scaling');
  const control = findMetric(metrics, 'control');
  const objective = findMetric(metrics, 'objective');

  if (frontline?.score < 5) {
    recommendations.push('Falta frontline real para entrar o aguantar peleas front-to-back.');
  }

  if (engage?.score < 5) {
    recommendations.push('El draft tiene poco engage directo.');
  }

  if (objective?.score < 5) {
    recommendations.push('Hay poco foco en objetivos y control de zona.');
  }

  if (control?.score >= 7) {
    recommendations.push('La composición tiene buen control de zonas.');
  }

  if (scaling?.score >= 7) {
    recommendations.push('La composición escala bien a partida larga.');
  }

  if (!recommendations.length) {
    recommendations.push('La composición está bastante equilibrada.');
  }

  const strongest = [...metrics].sort((a, b) => b.score - a.score)[0] || { label: 'Sin datos', score: 0 };
  const weakest = [...metrics].sort((a, b) => a.score - b.score)[0] || { label: 'Sin datos', score: 0 };

  return {
    engineVersion: ENGINE_VERSION,
    summaryTitle: `${strongest.label} destaca`,
    summaryText: `El punto más fuerte ahora mismo es ${strongest.label.toLowerCase()}, mientras que ${weakest.label.toLowerCase()} es lo más flojo.`,
    metrics,
    recommendations,
    damageSplit: { ap, ad, hybrid },
    profiles,
  };
}

export function getRoleInsights(selectedChampions) {
  const picksByRole = Object.fromEntries(selectedChampions.map((champion) => [champion.role, champion]));
  const insights = [];

  for (const [role, label] of Object.entries(ROLE_NAMES)) {
    if (!picksByRole[role]) {
      insights.push(`Falta ${label}.`);
    }
  }

  return insights;
}

export function normalizeTags(values) {
  if (!Array.isArray(values)) return [];
  return values.map((value) => String(value).trim()).filter(Boolean);
}

export function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

export function matchesCategory(tag, category) {
  const normalizedTag = normalizeText(tag);
  if (!normalizedTag) return false;

  const terms = CATEGORY_TERMS[category] || [];
  return terms.some((term) => {
    const normalizedTerm = normalizeText(term);
    return normalizedTag.includes(normalizedTerm) || normalizedTerm.includes(normalizedTag);
  });
}

function countMatches(tags, category) {
  return tags.reduce((total, tag) => total + (matchesCategory(tag, category) ? 1 : 0), 0);
}

function buildSearchText(champion) {
  return [
    champion?.champion,
    champion?.identity,
    champion?.function,
    champion?.tempo,
    ...(champion?.strengths || []),
    ...(champion?.weaknesses || []),
  ]
    .join(' ')
    .toLowerCase();
}

function detectDamageType(text) {
  const apScore = NORMALIZED_DAMAGE_TERMS.ap.reduce((score, term) => score + (text.includes(term) ? 1 : 0), 0);
  const adScore = NORMALIZED_DAMAGE_TERMS.ad.reduce((score, term) => score + (text.includes(term) ? 1 : 0), 0);

  if (apScore > adScore && apScore > 0) return 'AP';
  if (adScore > apScore && adScore > 0) return 'AD';
  if (apScore > 0 && adScore > 0) return 'Hybrid';
  return 'Neutral';
}

function scoreComplexity(text) {
  let raw = 0;
  for (const term of COMPLEXITY_TERMS) {
    if (text.includes(term)) {
      raw += 1;
    }
  }

  if (text.includes('assassin') || text.includes('mobility') || text.includes('movilidad')) {
    raw += 1;
  }

  return clamp(Math.round(raw * 2), 0, 10);
}

function findMetric(metrics, key) {
  return metrics.find((metric) => metric.key === key);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}