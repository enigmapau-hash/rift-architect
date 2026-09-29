export const ENGINE_VERSION = '0.2.0';

export const ATTRIBUTE_SPECS = [
  {
    key: 'frontline',
    label: 'Frontline',
    terms: ['frontline', 'tank', 'tanque', 'warden', 'peel', 'sustain', 'bruiser', 'juggernaut', 'vanguard'],
  },
  {
    key: 'engage',
    label: 'Engage',
    terms: ['engage', 'pick', 'hook', 'dive', 'flank', 'inici', 'initiate', 'catch', 'enganch'],
  },
  {
    key: 'damage',
    label: 'Daño',
    terms: ['carry', 'dps', 'burst', 'marksman', 'mage', 'battlemage', 'assassin', 'bruiser', 'fighter'],
  },
  {
    key: 'poke',
    label: 'Poke',
    terms: ['poke', 'siege', 'artillery', 'zone control', 'asedio'],
  },
  {
    key: 'teamfight',
    label: 'Teamfight',
    terms: ['teamfight', 'front to back', 'wombo', 'objective', 'group', 'grupal', 'peel', 'control'],
  },
  {
    key: 'mobility',
    label: 'Movilidad',
    terms: ['mobility', 'movilidad', 'dash', 'roam', 'mobile', 'backline', 'assassin'],
  },
  {
    key: 'control',
    label: 'Control',
    terms: ['cc', 'control', 'vision', 'anti-engage', 'anti engage', 'zone control', 'peel'],
  },
  {
    key: 'scaling',
    label: 'Escalado',
    terms: ['scaling', 'escalado', 'late', 'mid/late', 'late game', 'hypercarry'],
  },
  {
    key: 'objective',
    label: 'Objetivos',
    terms: ['objective', 'dragon', 'nashor', 'herald', 'sustain', 'zone control', 'control'],
  },
  {
    key: 'splitpush',
    label: 'Splitpush',
    terms: ['splitpush', 'side lane', 'split', 'duel', 'dueling', '1v1'],
  },
  {
    key: 'pick',
    label: 'Pick',
    terms: ['pick', 'catch', 'hook', 'flank', 'dive', 'assassin'],
  },
];

const ROLE_NAMES = {
  top: 'Top',
  jungle: 'Jungla',
  mid: 'Mid',
  botline: 'Botline',
  support: 'Support',
};

const COMPLEXITY_TERMS = ['muy exigente', 'hard', 'difícil', 'mechanical', 'mecanica', 'alto skill', 'high skill', 'riesgo'];

export function scoreChampion(champion) {
  const searchText = buildSearchText(champion);
  const metrics = ATTRIBUTE_SPECS.map((spec) => ({
    key: spec.key,
    label: spec.label,
    score: scoreAttribute(searchText, spec),
  }));

  const strongest = [...metrics].sort((a, b) => b.score - a.score)[0] || { label: 'Sin datos', score: 0 };
  const weakest = [...metrics].sort((a, b) => a.score - b.score)[0] || { label: 'Sin datos', score: 0 };

  return {
    metrics,
    strongest,
    weakest,
    primaryDamage: detectDamageType(searchText),
    complexity: scoreComplexity(searchText),
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
    recommendations.push('No veo daño AP claro en la composición.');
  }
  if (ad === 0 && hybrid === 0) {
    recommendations.push('No veo daño AD claro en la composición.');
  }

  const frontline = findMetric(metrics, 'frontline');
  const engage = findMetric(metrics, 'engage');
  const scaling = findMetric(metrics, 'scaling');
  const control = findMetric(metrics, 'control');
  const objective = findMetric(metrics, 'objective');

  if (frontline?.score < 5) {
    recommendations.push('Falta frontline real para entrar a objetivos o aguantar front-to-back.');
  }

  if (engage?.score < 5) {
    recommendations.push('El draft tiene poco engage directo: te costará forzar peleas.');
  }

  if (objective?.score < 5) {
    recommendations.push('La composición necesita más foco en objetivos y control de zona.');
  }

  if (control?.score >= 7) {
    recommendations.push('Tienes bastante control de zonas y utilidades para pelear alrededor de objetivos.');
  }

  if (scaling?.score >= 7) {
    recommendations.push('La composición parece más fuerte en partidas largas.');
  }

  if (!recommendations.length) {
    recommendations.push('La composición está bastante equilibrada para una partida estándar.');
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

function buildSearchText(champion) {
  return [
    champion.champion,
    champion.identity,
    champion.function,
    champion.tempo,
    ...(champion.strengths || []),
    ...(champion.weaknesses || []),
  ]
    .join(' ')
    .toLowerCase();
}

function scoreAttribute(text, spec) {
  let raw = 0;
  for (const term of spec.terms) {
    if (hasTerm(text, term)) {
      raw += term.includes(' ') ? 1.2 : 1;
    }
  }

  return clamp(Math.round(raw * 2), 0, 10);
}

function detectDamageType(text) {
  const apTerms = [' ap ', ' mage ', ' battlemage', ' artillery', ' burst ap', ' enchanter'];
  const adTerms = [' ad ', ' bruiser', ' fighter', ' marksman', ' duelist', ' assassin'];

  const apScore = apTerms.reduce((score, term) => score + (text.includes(term.trim()) ? 1 : 0), 0);
  const adScore = adTerms.reduce((score, term) => score + (text.includes(term.trim()) ? 1 : 0), 0);

  if (apScore > adScore && apScore > 0) return 'AP';
  if (adScore > apScore && adScore > 0) return 'AD';
  if (apScore > 0 && adScore > 0) return 'Hybrid';
  return 'Neutral';
}

function scoreComplexity(text) {
  let raw = 0;
  for (const term of COMPLEXITY_TERMS) {
    if (hasTerm(text, term)) {
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

function hasTerm(text, term) {
  return text.includes(term.toLowerCase());
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
