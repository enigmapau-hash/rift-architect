export const ENGINE_VERSION = '1.1.0';

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

  const identitySummary = summarizeIdentities(selectedChampions);
  const tagStrengths = summarizeTags(selectedChampions, 'strengths');
  const tagWeaknesses = summarizeTags(selectedChampions, 'weaknesses');
  const tempoTrend = summarizeTempo(selectedChampions);
  const gamePlan = buildGamePlan(identitySummary.primary.label, tempoTrend.label, tagStrengths, tagWeaknesses);

  const strongest = [...metrics].sort((a, b) => b.score - a.score)[0] || { label: 'Sin datos', score: 0 };
  const weakest = [...metrics].sort((a, b) => a.score - b.score)[0] || { label: 'Sin datos', score: 0 };

  return {
    engineVersion: ENGINE_VERSION,
    summaryTitle: identitySummary.primary.label,
    summaryText: buildSummaryText(identitySummary, tempoTrend),
    primaryIdentity: identitySummary.primary.label,
    primaryIdentityChampions: identitySummary.primary.champions,
    secondaryIdentities: identitySummary.secondary.map((item) => item.label),
    strengths: tagStrengths.map((item) => item.label),
    weaknesses: tagWeaknesses.map((item) => item.label),
    gamePlan,
    tempoTrend: tempoTrend.label,
    metrics,
    damageSplit: { ap, ad, hybrid },
    profiles,
    strongest,
    weakest,
    recommendations: gamePlan,
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

function summarizeIdentities(selectedChampions) {
  const counts = new Map();

  selectedChampions.forEach((champion, index) => {
    const label = normalizeIdentityLabel(champion?.identity);
    const key = normalizeText(label);
    const current = counts.get(key) || {
      key,
      label,
      count: 0,
      firstIndex: index,
      champions: [],
    };

    current.count += 1;
    current.champions.push(champion?.champion || 'Sin definir');
    counts.set(key, current);
  });

  const ordered = [...counts.values()].sort((a, b) => b.count - a.count || a.firstIndex - b.firstIndex);
  const nonEmpty = ordered.filter((item) => item.key !== normalizeText('Sin definir'));
  const pool = nonEmpty.length ? nonEmpty : ordered;

  const [primary, ...secondary] = pool;
  return {
    primary: primary || {
      key: normalizeText('Sin definir'),
      label: 'Sin definir',
      count: 0,
      champions: [],
    },
    secondary,
  };
}

function summarizeTags(selectedChampions, field) {
  const counts = new Map();

  selectedChampions.forEach((champion, index) => {
    const tags = normalizeTags(champion?.[field]);
    tags.forEach((tag) => {
      const label = cleanLabel(tag);
      const key = normalizeText(label);
      if (!key || key === normalizeText('Sin definir')) return;

      const current = counts.get(key) || {
        key,
        label,
        count: 0,
        firstIndex: index,
      };

      current.count += 1;
      counts.set(key, current);
    });
  });

  return [...counts.values()]
    .sort((a, b) => b.count - a.count || a.firstIndex - b.firstIndex || a.label.localeCompare(b.label, 'es'))
    .slice(0, 4);
}

function summarizeTempo(selectedChampions) {
  const counts = new Map();

  selectedChampions.forEach((champion, index) => {
    const label = cleanLabel(champion?.tempo);
    const key = normalizeText(label);
    if (!key || key === normalizeText('Sin definir')) return;

    const current = counts.get(key) || {
      key,
      label,
      count: 0,
      firstIndex: index,
    };

    current.count += 1;
    counts.set(key, current);
  });

  const ordered = [...counts.values()].sort((a, b) => b.count - a.count || a.firstIndex - b.firstIndex);
  return ordered[0] || { key: normalizeText('Sin definir'), label: 'Sin definir', count: 0 };
}

function buildGamePlan(primaryIdentity, tempoTrend, strengths, weaknesses) {
  const normalizedPrimary = normalizeText(primaryIdentity);
  const normalizedTempo = normalizeText(tempoTrend);
  const strengthKeys = strengths.map((item) => normalizeText(item.label));
  const weaknessKeys = weaknesses.map((item) => normalizeText(item.label));

  let plan = [];

  if (normalizedPrimary.includes('fronttoback') || normalizedPrimary.includes('teamfight')) {
    plan = [
      'Agruparse para pelear 5v5.',
      'Buscar objetivos neutrales.',
      'Evitar splitpush largo.',
    ];
  } else if (normalizedPrimary.includes('poke') || normalizedPrimary.includes('siege')) {
    plan = [
      'Castigar desde distancia.',
      'Controlar visión y zonas.',
      'Evitar all-ins largos.',
    ];
  } else if (normalizedPrimary.includes('splitpush')) {
    plan = [
      'Abrir mapa con side lanes.',
      'Presionar torres y oleadas.',
      'Evitar peleas forzadas.',
    ];
  } else if (normalizedPrimary.includes('engage') || normalizedPrimary.includes('pick') || normalizedPrimary.includes('dive')) {
    plan = [
      'Buscar iniciación limpia.',
      'Forzar picks con visión.',
      'Convertir ventaja en objetivos.',
    ];
  } else if (normalizedPrimary.includes('protect') || normalizedPrimary.includes('control')) {
    plan = [
      'Jugar alrededor del carry.',
      'Mantener la frontline viva.',
      'Controlar la zona antes de pelear.',
    ];
  } else {
    plan = [
      'Jugar alrededor de la identidad principal.',
      'Mantenerse agrupados en peleas clave.',
      'Priorizar objetivos cuando haya ventaja.',
    ];
  }

  if ((normalizedTempo.includes('late') || normalizedTempo.includes('midlate')) && !plan[0].toLowerCase().includes('escalar')) {
    plan[0] = 'Jugar a escalar antes de forzar.';
  }

  if (!plan.some((line) => normalizeText(line).includes('objetivo')) && strengthKeys.some((key) => key.includes('objective'))) {
    plan[1] = 'Convertir las ventajas en objetivos.';
  }

  if (!plan.some((line) => normalizeText(line).includes('frontline')) && weaknessKeys.some((key) => key.includes('frontline'))) {
    plan[2] = 'Evitar peleas sin frontline preparada.';
  }

  return [...new Set(plan)].slice(0, 3);
}

function buildSummaryText(identitySummary, tempoTrend) {
  const secondary = identitySummary.secondary.slice(0, 2).map((item) => item.label).filter(Boolean);
  const parts = [identitySummary.primary.label];
  if (secondary.length) parts.push(`Secundarias: ${secondary.join(' · ')}`);
  if (tempoTrend?.label && normalizeText(tempoTrend.label) !== normalizeText('Sin definir')) {
    parts.push(`Ritmo: ${tempoTrend.label}`);
  }
  return parts.join(' · ');
}

function cleanLabel(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return 'Sin definir';

  const stripped = raw
    .replace(/^[^\p{L}\p{N}]+/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

  return stripped || raw;
}

function normalizeIdentityLabel(value) {
  const label = cleanLabel(value);
  const normalized = normalizeText(label);

  if (normalized.includes('fronttoback')) return 'Front to Back';
  if (normalized.includes('teamfight')) return 'Teamfight';
  if (normalized.includes('engage')) return 'Engage';
  if (normalized.includes('pick')) return 'Pick';
  if (normalized.includes('poke')) return 'Poke';
  if (normalized.includes('splitpush') || normalized.includes('sidelane')) return 'Splitpush';
  if (normalized.includes('dive')) return 'Dive';
  if (normalized.includes('skirmish')) return 'Skirmish';
  if (normalized.includes('protect')) return 'Protect';
  if (normalized.includes('control')) return 'Control';
  if (normalized.includes('siege')) return 'Siege';
  if (normalized.includes('catch')) return 'Catch';
  if (normalized.includes('flexible')) return 'Flexible';
  if (normalized.includes('brawl')) return 'Skirmish';

  return label;
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
    if (text.includes(term)) raw += 1;
  }

  if (text.includes('assassin') || text.includes('mobility') || text.includes('movilidad')) {
    raw += 1;
  }

  return clamp(Math.round(raw * 2), 0, 10);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
