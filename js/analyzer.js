export const ENGINE_VERSION = '0.3.1';

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

const ROLE_NAMES = {
  top: 'Top',
  jungle: 'Jungla',
  mid: 'Mid',
  botline: 'Botline',
  support: 'Support',
};

const COMPLEXITY_TERMS = [
  'muy exigente',
  'hard',
  'difícil',
  'mechanical',
  'mecanica',
  'alto skill',
  'high skill',
  'riesgo',
];

const METRIC_TEXT_TERMS = {
  frontline: ['frontline', 'tank', 'tanque', 'warden', 'peel', 'sustain', 'bruiser', 'juggernaut', 'vanguard'],
  engage: ['engage', 'pick', 'hook', 'dive', 'flank', 'inici', 'initiate', 'catch', 'enganch'],
  damage: ['carry', 'dps', 'burst', 'marksman', 'mage', 'battlemage', 'assassin', 'bruiser', 'fighter'],
  poke: ['poke', 'siege', 'artillery', 'zone control', 'asedio'],
  teamfight: ['teamfight', 'front to back', 'wombo', 'objective', 'group', 'grupal', 'peel', 'control'],
  mobility: ['mobility', 'movilidad', 'dash', 'roam', 'mobile', 'backline', 'assassin'],
  control: ['cc', 'control', 'vision', 'anti-engage', 'anti engage', 'zone control', 'peel', 'waveclear'],
  scaling: ['scaling', 'escalado', 'late', 'mid/late', 'late game', 'hypercarry'],
  objective: ['objective', 'objectives', 'dragon', 'nashor', 'herald', 'sustain', 'zone control', 'control'],
  splitpush: ['splitpush', 'side lane', 'split', 'duel', 'dueling', '1v1'],
  pick: ['pick', 'catch', 'hook', 'flank', 'dive', 'assassin'],
};

const METRIC_FORMULAS = {
  frontline: ['frontline', 'peel', 'disengage'],
  engage: ['engage', 'pick'],
  damage: ['dps', 'burst'],
  poke: ['poke', 'siege'],
  teamfight: ['frontline', 'engage', 'control'],
  mobility: ['mobility'],
  control: ['vision', 'waveclear', 'objectiveControl'],
  scaling: ['scaling'],
  objective: ['objectiveControl'],
  splitpush: ['splitpush'],
  pick: ['pick'],
};

export function scoreChampion(champion) {
  const explicitAttributes = normalizeChampionAttributes(champion?.attributes);
  const hasExplicitAttributes = Object.keys(explicitAttributes).some((key) => key !== 'confidence');
  const text = buildSearchText(champion);

  const metrics = hasExplicitAttributes
    ? ATTRIBUTE_SPECS.map((spec) => ({
        key: spec.key,
        label: spec.label,
        score: scoreFromExplicitAttributes(explicitAttributes, METRIC_FORMULAS[spec.key] || [spec.key]),
      }))
    : ATTRIBUTE_SPECS.map((spec) => ({
        key: spec.key,
        label: spec.label,
        score: scoreFromText(text, spec.key),
      }));

  const strongest = [...metrics].sort((a, b) => b.score - a.score)[0] || { label: 'Sin datos', score: 0 };
  const weakest = [...metrics].sort((a, b) => a.score - b.score)[0] || { label: 'Sin datos', score: 0 };

  return {
    metrics,
    strongest,
    weakest,
    primaryDamage: detectDamageType(text),
    complexity: scoreComplexity(text),
    source: hasExplicitAttributes ? 'sheet' : 'text',
    sourceLabel: hasExplicitAttributes ? 'Hoja de atributos' : 'Perfil derivado del texto',
    confidence: explicitAttributes.confidence ?? null,
    explicitAttributes,
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

function normalizeChampionAttributes(attributes) {
  if (!attributes || typeof attributes !== 'object' || Array.isArray(attributes)) {
    return {};
  }

  const normalized = {};
  const entries = Object.entries(attributes);

  for (const [key, value] of entries) {
    if (key === 'confidence') {
      const parsed = toNumber(value);
      if (parsed !== null) {
        normalized.confidence = clamp(Math.round(parsed), 0, 100);
      }
      continue;
    }

    const normalizedKey = normalizeAttributeKey(key);
    if (!normalizedKey) continue;

    const parsed = toNumber(value);
    if (parsed === null) continue;

    normalized[normalizedKey] = clamp(Math.round(parsed), 0, 5);
  }

  return normalized;
}

function normalizeAttributeKey(value) {
  const key = normalizeText(value);
  const aliases = {
    engage: 'engage',
    disengage: 'disengage',
    frontline: 'frontline',
    peel: 'peel',
    pick: 'pick',
    poke: 'poke',
    burst: 'burst',
    dps: 'dps',
    scaling: 'scaling',
    mobility: 'mobility',
    waveclear: 'waveclear',
    siege: 'siege',
    splitpush: 'splitpush',
    splitpushing: 'splitpush',
    objectivecontrol: 'objectiveControl',
    objective: 'objectiveControl',
    controlobjectives: 'objectiveControl',
    vision: 'vision',
    confidence: 'confidence',
  };

  return aliases[key] || null;
}

function scoreFromExplicitAttributes(attributes, keys) {
  const values = keys
    .map((key) => toNumber(attributes[key]))
    .filter((value) => value !== null);

  if (!values.length) {
    return 0;
  }

  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  return clamp(Math.round(average * 2), 0, 10);
}

function scoreFromText(text, metricKey) {
  const terms = METRIC_TEXT_TERMS[metricKey] || [];
  let raw = 0;

  for (const term of terms) {
    if (hasTerm(text, term)) {
      raw += term.includes(' ') ? 1.2 : 1;
    }
  }

  return clamp(Math.round(raw * 2), 0, 10);
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

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
