import { CONFLICT_RULES, findStrategicProfile, summarizeStrategicProfile } from '../../knowledge/index.js';
import { matchesCategory, normalizeText } from '../engine/utils.js';
import { cleanText, toText, uniqueValues } from './analysis-utils.js';

export function buildStrategicReasoning(report = {}) {
  const composition = report.composition || {};
  const champions = collectChampions(report, composition).map(describeChampion);
  const anchors = buildAnchors(champions);
  const conflicts = buildConflictClaims(champions, report, composition, anchors);
  const claims = uniqueClaims([
    buildDependencyClaim('engage', anchors.engage),
    buildDependencyClaim('frontline', anchors.frontline),
    buildObjectiveClaim(champions, anchors),
    ...conflicts,
    buildTempoClaim(champions),
  ]).filter(Boolean);

  const focus = claims[0]?.label || 'Lectura estratégica';
  const summary = claims[0]?.detail || 'La composición todavía no define una razón estratégica dominante.';
  const profileSummaries = champions.map((champion) => champion.profile).filter(Boolean).map(summarizeStrategicProfile);

  return {
    focus,
    headline: focus,
    summary,
    claims,
    anchors,
    conflicts,
    profiles: profileSummaries,
    signals: buildSignals(report, composition, champions),
  };
}

function collectChampions(report, composition) {
  const source = Array.isArray(composition.selectedChampions) && composition.selectedChampions.length
    ? composition.selectedChampions
    : Array.isArray(report.selectedChampions)
      ? report.selectedChampions
      : [];

  return source.filter(Boolean);
}

function describeChampion(champion) {
  const name = cleanText(champion.champion || champion.name || champion.displayName || 'Sin definir');
  const identity = cleanText(champion.identity || 'Sin definir');
  const role = cleanText(champion.role || '');
  const functionLabel = cleanText(champion.function || 'Sin definir');
  const tempo = cleanText(champion.tempo || 'Sin definir');
  const strengths = uniqueValues(Array.isArray(champion.strengths) ? champion.strengths.map(toText) : []);
  const weaknesses = uniqueValues(Array.isArray(champion.weaknesses) ? champion.weaknesses.map(toText) : []);
  const profile = findStrategicProfile(identity || functionLabel || name, {
    labels: [name, identity, functionLabel, tempo, role, ...strengths, ...weaknesses],
    categories: buildChampionCategories(name, identity, functionLabel, tempo, strengths, weaknesses),
  });

  return {
    name,
    identity,
    role,
    function: functionLabel,
    tempo,
    strengths,
    weaknesses,
    profile: profile || null,
    profileSummary: profile ? summarizeStrategicProfile(profile) : null,
    bundle: uniqueValues([name, identity, functionLabel, tempo, role, ...strengths, ...weaknesses]),
    categories: buildChampionCategories(name, identity, functionLabel, tempo, strengths, weaknesses),
  };
}

function buildChampionCategories(name, identity, functionLabel, tempo, strengths = [], weaknesses = []) {
  const text = [name, identity, functionLabel, tempo, ...strengths, ...weaknesses].join(' ');
  const categories = [
    'frontline',
    'engage',
    'damage',
    'poke',
    'teamfight',
    'mobility',
    'control',
    'scaling',
    'objective',
    'splitpush',
    'pick',
  ].filter((category) => matchesCategory(text, category));

  if (matchesCategory(text, 'frontline') || matchesCategory(text, 'control') || matchesCategory(text, 'teamfight')) {
    categories.push('frontline');
  }

  if (matchesCategory(text, 'engage') || matchesCategory(text, 'pick') || matchesCategory(text, 'mobility')) {
    categories.push('engage');
  }

  if (matchesCategory(text, 'poke') || matchesCategory(text, 'objective')) {
    categories.push('poke');
  }

  if (matchesCategory(text, 'splitpush')) {
    categories.push('splitpush');
  }

  if (matchesCategory(text, 'damage') || matchesCategory(text, 'scaling')) {
    categories.push('carry');
  }

  if (normalizeText(identity).includes('protect') || normalizeText(identity).includes('fronttoback')) {
    categories.push('protect');
  }

  return uniqueValues(categories);
}

function buildAnchors(champions) {
  const groups = {
    engage: champions.filter((champion) => champion.categories.some((category) => ['engage', 'pick'].includes(category))),
    frontline: champions.filter((champion) => champion.categories.some((category) => ['frontline', 'protect'].includes(category))),
    objective: champions.filter((champion) => champion.categories.some((category) => ['objective', 'control', 'poke'].includes(category))),
    splitpush: champions.filter((champion) => champion.categories.includes('splitpush')),
    carry: champions.filter((champion) => champion.categories.includes('carry')),
  };

  return Object.fromEntries(
    Object.entries(groups).map(([key, items]) => [
      key,
      items.map((item) => item.name),
    ])
  );
}

function buildDependencyClaim(kind, names = []) {
  if (!Array.isArray(names) || !names.length) return null;

  const uniqueNames = uniqueValues(names).slice(0, 3);
  const lead = uniqueNames.length === 1 ? uniqueNames[0] : joinNames(uniqueNames);
  const templates = {
    engage: {
      label: 'Dependencia de engage',
      single: `Tu engage depende exclusivamente de ${lead}. Si cae, te quedas sin entrada limpia.`,
      plural: `Tu engage se reparte entre ${lead}. Si uno falla, la composición pierde la entrada limpia.`,
    },
    frontline: {
      label: 'Dependencia de frontline',
      single: `Tu frontline depende de ${lead}. Si cae, el carry queda expuesto y la pelea se desordena.`,
      plural: `Tu frontline se apoya en ${lead}. Si uno falla, el carry pierde protección y espacio.`,
    },
  };

  const template = templates[kind];
  if (!template) return null;

  return {
    label: template.label,
    detail: uniqueNames.length === 1 ? template.single : template.plural,
    kind: 'dependency',
    priority: uniqueNames.length === 1 ? 'critical' : 'high',
    evidence: uniqueNames,
  };
}

function buildObjectiveClaim(champions, anchors) {
  const objectiveNames = uniqueValues(anchors.objective || []).slice(0, 3);
  const engageNames = uniqueValues(anchors.engage || []).slice(0, 3);
  const hasObjectivePressure = objectiveNames.length > 0 || champions.some((champion) => champion.profile?.objectives?.length);
  if (!hasObjectivePressure) return null;

  const evidence = uniqueValues([
    ...objectiveNames,
    ...engageNames,
  ]);

  return {
    label: 'Control de visión y Nashor',
    detail: 'Si pierdes visión antes del Nashor, tu composición pierde gran parte de su valor: necesitas preparar el río antes de comprometerte.',
    kind: 'objective',
    priority: evidence.length ? 'high' : 'medium',
    evidence,
  };
}

function buildConflictClaims(champions, report, composition, anchors) {
  const claims = [];
  const splitpush = anchors.splitpush.length > 0 || champions.some((champion) => champion.categories.includes('splitpush'));
  const teamfight = anchors.frontline.length > 0 || champions.some((champion) => champion.categories.includes('frontline'));
  const poke = champions.some((champion) => champion.categories.includes('poke'));
  const dive = champions.some((champion) => champion.categories.includes('engage'));
  const protect = champions.some((champion) => champion.categories.includes('protect'));

  if (splitpush && teamfight) {
    claims.push({
      label: 'Condiciones de victoria incompatibles',
      detail: 'Tu equipo tiene dos condiciones de victoria incompatibles: Splitpush y Teamfight. La presión lateral y el 5v5 piden mapas y tempos distintos.',
      kind: 'conflict',
      priority: 'critical',
      evidence: uniqueValues([...anchors.splitpush, ...anchors.frontline]),
    });
  }

  if (poke && dive) {
    claims.push({
      label: 'Condiciones de victoria incompatibles',
      detail: 'Tu equipo mezcla Poke y Dive: una quiere desgastar y la otra quiere entrar de golpe. Si no defines una sola ventana, la composición se rompe.',
      kind: 'conflict',
      priority: 'critical',
      evidence: uniqueValues(champions.filter((champion) => champion.categories.some((category) => ['poke', 'engage'].includes(category))).map((champion) => champion.name)),
    });
  }

  if (protect && dive) {
    claims.push({
      label: 'Protección vs entrada',
      detail: 'Proteger al carry y lanzarte al frente al mismo tiempo te obliga a escoger una sola lectura: o escalas protegido o juegas a la entrada corta.',
      kind: 'conflict',
      priority: 'high',
      evidence: champions.filter((champion) => champion.categories.some((category) => ['protect', 'engage'].includes(category))).map((champion) => champion.name),
    });
  }

  const explicitRules = CONFLICT_RULES.filter((rule) => {
    const labels = (rule.labels || []).map((label) => normalizeText(label));
    const signal = [
      ...champions.flatMap((champion) => champion.bundle.map((value) => normalizeText(value))),
      ...uniqueValues(report.tags || []),
      ...uniqueValues(composition.tags || []),
      ...uniqueValues(report.winConditions || []).map((item) => normalizeText(item?.label || item)),
    ];

    return labels.every((label) => signal.some((value) => value === label || value.includes(label)));
  });

  explicitRules.forEach((rule) => {
    claims.push({
      label: 'Tensión estratégica',
      detail: rule.detail || `${rule.labels.join(' y ')} entran en conflicto.`,
      kind: 'conflict',
      priority: rule.penalty >= 16 ? 'critical' : 'high',
      evidence: rule.labels,
    });
  });

  return claims;
}

function buildTempoClaim(champions) {
  const tempos = champions.map((champion) => normalizeText(champion.tempo)).filter(Boolean);
  if (!tempos.length) return null;

  const late = tempos.filter((tempo) => tempo.includes('late')).length;
  const early = tempos.filter((tempo) => tempo.includes('early')).length;
  const mid = tempos.filter((tempo) => tempo.includes('mid')).length;

  if (late >= Math.max(2, early + 1)) {
    return {
      label: 'Ritmo de partida',
      detail: 'Necesitas ralentizar el early para alcanzar tu pico de poder; no fuerces una pelea antes de que la composición esté lista.',
      kind: 'tempo',
      priority: 'medium',
      evidence: champions.filter((champion) => normalizeText(champion.tempo).includes('late')).map((champion) => champion.name),
    };
  }

  if (early >= Math.max(2, late + 1)) {
    return {
      label: 'Ritmo de partida',
      detail: 'Tu valor está en el early: acelera, forzando ventanas cortas antes de que el rival estabilice el mapa.',
      kind: 'tempo',
      priority: 'medium',
      evidence: champions.filter((champion) => normalizeText(champion.tempo).includes('early')).map((champion) => champion.name),
    };
  }

  if (mid >= 2) {
    return {
      label: 'Ritmo de partida',
      detail: 'Tu pico está en el mid game: busca una transición limpia y evita quedarte en un limbo de tempo.',
      kind: 'tempo',
      priority: 'low',
      evidence: champions.filter((champion) => normalizeText(champion.tempo).includes('mid')).map((champion) => champion.name),
    };
  }

  return null;
}

function buildSignals(report, composition, champions) {
  const labels = uniqueValues([
    report.primaryIdentity,
    report.tempo,
    report.dominance,
    report.identity?.dominance,
    report.identity?.focus,
    report.identity?.summaryText,
    ...(Array.isArray(report.tags) ? report.tags : []),
    ...(Array.isArray(composition.tags) ? composition.tags : []),
    ...(Array.isArray(champions) ? champions.flatMap((champion) => champion.bundle) : []),
    ...(Array.isArray(report.winConditions) ? report.winConditions.flatMap((item) => [item?.label, item?.detail]) : []),
  ]);

  const categories = uniqueValues([
    ...labels.flatMap((label) => resolveSignalCategories(label)),
    ...champions.flatMap((champion) => champion.categories),
  ]);

  return {
    labels,
    categories,
    signals: uniqueValues([...labels, ...categories]),
  };
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

function uniqueClaims(items = []) {
  const seen = new Set();
  return items.filter((item) => {
    if (!item) return false;
    const key = `${normalizeText(item.label)}::${normalizeText(item.detail)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function joinNames(values = []) {
  const items = uniqueValues(values).slice(0, 3);
  if (items.length <= 1) return items[0] || '';
  if (items.length === 2) return `${items[0]} y ${items[1]}`;
  return `${items.slice(0, 2).join(', ')} y ${items[2]}`;
}
