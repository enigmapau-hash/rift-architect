import { findStrategicProfile, summarizeStrategicProfile } from '../../knowledge/index.js';
import { matchesCategory, normalizeText } from '../engine/utils.js';
import { cleanText, toText, uniqueValues } from './analysis-utils.js';

const PRIORITY_WEIGHT = {
  critical: 500,
  high: 400,
  medium: 300,
  low: 200,
};

const KIND_ORDER = {
  dependency: 0,
  cascade: 1,
  conflict: 2,
  risk: 3,
  'power-spike': 4,
  redundancy: 5,
  flexibility: 6,
  contingency: 7,
  adaptation: 8,
  objective: 9,
  condition: 10,
  profile: 11,
  tempo: 12,
};

export function buildStrategicReasoning(report = {}) {
  const composition = report.composition || {};
  const champions = collectChampions(report, composition).map(describeChampion);
  const teamProfile = resolveTeamProfile(report, champions);
  const anchors = buildAnchors(champions);
  const windows = buildTimingWindows(champions, teamProfile);
  const dominantWindow = determineDominantWindow(windows, teamProfile);
  const signalSet = buildSignalSet(report, composition, champions, teamProfile);

  const profileClaims = buildProfileClaims(teamProfile, anchors);
  const dependencyClaims = buildDependencyClaims(teamProfile, anchors);
  const cascadeClaims = buildCascadeClaims(teamProfile, anchors, dominantWindow);
  const objectiveClaims = buildObjectiveClaims(champions, anchors, teamProfile);
  const conflictClaims = buildConflictClaims(champions, teamProfile, anchors);
  const redundancyClaims = buildRedundancyClaims(champions);
  const powerSpikeClaims = buildPowerSpikeClaims(champions, teamProfile);
  const tempoClaims = buildTempoClaims(champions, teamProfile);
  const executionClaims = buildExecutionRiskClaims({
    champions,
    teamProfile,
    anchors,
    conflictClaims,
    cascadeClaims,
    redundancyClaims,
    dominantWindow,
  });
  const robustnessClaims = buildRobustnessClaims({
    champions,
    teamProfile,
    anchors,
    dependencyClaims,
    conflictClaims,
    redundancyClaims,
    executionClaims,
  });
  const flexibilityClaims = buildFlexibilityClaims({
    champions,
    teamProfile,
    anchors,
    conflictClaims,
    redundancyClaims,
  });
  const contingencyClaims = buildContingencyClaims({
    teamProfile,
    anchors,
    cascadeClaims,
    conflictClaims,
    executionClaims,
    flexibilityClaims,
  });
  const adaptationClaims = buildAdaptationClaims({
    report,
    teamProfile,
    anchors,
    champions,
    signalSet,
    flexibilityClaims,
    contingencyClaims,
  });

  const claims = uniqueClaims([
    ...profileClaims,
    ...dependencyClaims,
    ...cascadeClaims,
    ...objectiveClaims,
    ...conflictClaims,
    ...executionClaims,
    ...robustnessClaims,
    ...flexibilityClaims,
    ...contingencyClaims,
    ...adaptationClaims,
    ...redundancyClaims,
    ...powerSpikeClaims,
    ...tempoClaims,
  ]).sort(compareClaims);

  const focus = claims[0]?.label || teamProfile?.label || 'Lectura estratégica';
  const summary = buildStrategicSummary({ claims, teamProfile, executionClaims, robustnessClaims, flexibilityClaims, contingencyClaims, adaptationClaims });

  return {
    focus,
    headline: focus,
    summary,
    claims,
    dependencies: claims.filter((claim) => claim.kind === 'dependency'),
    cascades: claims.filter((claim) => claim.kind === 'cascade'),
    redundancies: claims.filter((claim) => claim.kind === 'redundancy'),
    powerSpikes: claims.filter((claim) => claim.kind === 'power-spike'),
    conflicts: claims.filter((claim) => claim.kind === 'conflict'),
    risks: claims.filter((claim) => claim.kind === 'risk'),
    robustness: claims.filter((claim) => claim.kind === 'robustness'),
    flexibility: claims.filter((claim) => claim.kind === 'flexibility'),
    contingencies: claims.filter((claim) => claim.kind === 'contingency'),
    adaptations: claims.filter((claim) => claim.kind === 'adaptation'),
    profiles: champions.map((champion) => champion.profile).filter(Boolean).map(summarizeStrategicProfile),
    anchors,
    windows,
    dominantWindow,
    signals: signalSet.signals.slice(0, 12),
    profile: teamProfile ? summarizeStrategicProfile(teamProfile) : null,
    metrics: buildStrategicMetrics({
      executionClaims,
      robustnessClaims,
      flexibilityClaims,
      contingencyClaims,
      adaptationClaims,
      cascadeClaims,
      redundancyClaims,
      conflictClaims,
      dominantWindow,
    }),
    execution: executionClaims[0] || null,
    robustnessSummary: robustnessClaims[0] || null,
    flexibilitySummary: flexibilityClaims[0] || null,
    contingency: contingencyClaims[0] || null,
    adaptation: adaptationClaims[0] || null,
  };
}

function collectChampions(report, composition) {
  if (Array.isArray(composition.selectedChampions) && composition.selectedChampions.length) return composition.selectedChampions.filter(Boolean);
  if (Array.isArray(report.selectedChampions) && report.selectedChampions.length) return report.selectedChampions.filter(Boolean);
  return [];
}

function describeChampion(champion) {
  const name = cleanText(champion?.champion || champion?.name || champion?.displayName || 'Sin definir');
  const identity = cleanText(champion?.identity || 'Sin definir');
  const role = cleanText(champion?.role || '');
  const functionLabel = cleanText(champion?.function || 'Sin definir');
  const tempo = cleanText(champion?.tempo || 'Sin definir');
  const strengths = uniqueValues(Array.isArray(champion?.strengths) ? champion.strengths.map(toText) : []);
  const weaknesses = uniqueValues(Array.isArray(champion?.weaknesses) ? champion.weaknesses.map(toText) : []);
  const categories = buildChampionCategories(name, identity, functionLabel, tempo, strengths, weaknesses);
  const profile = findStrategicProfile(identity || functionLabel || name, {
    labels: [name, identity, functionLabel, tempo, role, ...strengths, ...weaknesses],
    categories,
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
    categories,
  };
}

function resolveTeamProfile(report, champions) {
  const primaryIdentity = cleanText(report.primaryIdentity || report.identity?.primaryIdentity || champions[0]?.identity || '');
  const primaryFunction = cleanText(report.identity?.dominance || report.identity?.focus || '');
  const searchSpace = [primaryIdentity, primaryFunction, report.summaryText, report.executiveSummary?.title].filter(Boolean).join(' ');
  const championSpace = champions.map((champion) => champion.categories.join(' ')).join(' ');

  return (
    findStrategicProfile(primaryIdentity, { labels: [], categories: [] }) ||
    findStrategicProfile(searchSpace, { labels: [], categories: [] }) ||
    findStrategicProfile(championSpace, { labels: [], categories: [] }) ||
    null
  );
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

  if (matchesCategory(text, 'frontline') || matchesCategory(text, 'control') || matchesCategory(text, 'teamfight')) categories.push('frontline');
  if (matchesCategory(text, 'engage') || matchesCategory(text, 'pick') || matchesCategory(text, 'mobility')) categories.push('engage');
  if (matchesCategory(text, 'poke') || matchesCategory(text, 'objective')) categories.push('poke');
  if (matchesCategory(text, 'splitpush')) categories.push('splitpush');
  if (matchesCategory(text, 'damage') || matchesCategory(text, 'scaling')) categories.push('carry');
  if (normalizeText(identity).includes('protect') || normalizeText(identity).includes('fronttoback')) categories.push('protect');

  return uniqueValues(categories);
}

function buildAnchors(champions) {
  return {
    engage: champions.filter((champion) => champion.categories.some((category) => category === 'engage' || category === 'pick')).map((champion) => champion.name),
    frontline: champions.filter((champion) => champion.categories.some((category) => category === 'frontline' || category === 'protect')).map((champion) => champion.name),
    objective: champions.filter((champion) => champion.categories.some((category) => category === 'objective' || category === 'control' || category === 'poke')).map((champion) => champion.name),
    splitpush: champions.filter((champion) => champion.categories.includes('splitpush')).map((champion) => champion.name),
    carry: champions.filter((champion) => champion.categories.includes('carry')).map((champion) => champion.name),
    poke: champions.filter((champion) => champion.categories.includes('poke')).map((champion) => champion.name),
  };
}

function buildProfileClaims(teamProfile, anchors) {
  const claims = [];
  if (!teamProfile) return claims;

  if (teamProfile.summary) {
    claims.push({
      label: teamProfile.label ? `Lectura de ${teamProfile.label}` : 'Lectura estratégica',
      detail: teamProfile.summary,
      kind: 'profile',
      priority: 'low',
      evidence: uniqueValues([teamProfile.label, teamProfile.key, ...(Array.isArray(teamProfile.timings) ? teamProfile.timings : [])]).slice(0, 4),
    });
  }

  if (teamProfile.condition) {
    claims.push({
      label: teamProfile.label ? `Condición de ${teamProfile.label}` : 'Condición de victoria',
      detail: teamProfile.condition,
      kind: 'condition',
      priority: 'medium',
      evidence: uniqueValues([teamProfile.label, teamProfile.key, ...(Array.isArray(teamProfile.needs) ? teamProfile.needs : [])]).slice(0, 4),
    });
  }

  if (Array.isArray(teamProfile.winsAgainst) && teamProfile.winsAgainst.length) {
    claims.push({
      label: 'Donde gana esta composición',
      detail: `La composición suele castigar ${joinPhrase(teamProfile.winsAgainst)}.`,
      kind: 'profile',
      priority: 'low',
      evidence: teamProfile.winsAgainst.slice(0, 4),
    });
  }

  if (Array.isArray(teamProfile.losesAgainst) && teamProfile.losesAgainst.length) {
    claims.push({
      label: 'Donde sufre esta composición',
      detail: `La composición sufre contra ${joinPhrase(teamProfile.losesAgainst)}.`,
      kind: 'profile',
      priority: 'low',
      evidence: teamProfile.losesAgainst.slice(0, 4),
    });
  }

  if (Array.isArray(teamProfile.needs) && teamProfile.needs.length) {
    claims.push({
      label: 'Necesidades del plan',
      detail: `Tu plan necesita ${joinPhrase(teamProfile.needs)}.`,
      kind: 'profile',
      priority: 'low',
      evidence: teamProfile.needs.slice(0, 4),
    });
  }

  if (Array.isArray(teamProfile.objectives) && teamProfile.objectives.length) {
    claims.push({
      label: 'Objetivos prioritarios',
      detail: `Tus objetivos prioritarios son ${joinPhrase(teamProfile.objectives)}.`,
      kind: 'objective',
      priority: 'low',
      evidence: teamProfile.objectives.slice(0, 4),
    });
  }

  if (Array.isArray(teamProfile.avoids) && teamProfile.avoids.length) {
    claims.push({
      label: 'Lo que debes evitar',
      detail: `Evita ${joinPhrase(teamProfile.avoids)} para no romper el plan.`,
      kind: 'profile',
      priority: 'low',
      evidence: teamProfile.avoids.slice(0, 4),
    });
  }

  if (anchors?.carry?.length) {
    claims.push({
      label: 'Motor de daño',
      detail: anchors.carry.length === 1
        ? `El daño real se apoya en ${joinNames(anchors.carry)}. Si cae, la composición se queda sin cierre.`
        : `El daño real se reparte entre ${joinNames(anchors.carry)}. La pelea necesita coordinar su ventana final.`,
      kind: 'profile',
      priority: 'low',
      evidence: anchors.carry.slice(0, 3),
    });
  }

  return claims;
}

function buildDependencyClaims(teamProfile, anchors) {
  const claims = [];

  if (anchors.engage.length) {
    const lead = joinNames(anchors.engage.slice(0, 3));
    claims.push({
      label: 'Dependencia de engage',
      detail: anchors.engage.length === 1
        ? `Tu engage depende exclusivamente de ${lead}. Si cae, te quedas sin entrada limpia.`
        : `Tu engage se reparte entre ${lead}. Si uno falla, la composición pierde la entrada limpia.`,
      kind: 'dependency',
      priority: anchors.engage.length === 1 ? 'critical' : 'high',
      evidence: anchors.engage.slice(0, 3),
    });
  }

  if (anchors.frontline.length) {
    const lead = joinNames(anchors.frontline.slice(0, 3));
    claims.push({
      label: 'Dependencia de frontline',
      detail: anchors.frontline.length === 1
        ? `Tu frontline depende de ${lead}. Si cae, el carry queda expuesto y la pelea se desordena.`
        : `Tu frontline se apoya en ${lead}. Si uno falla, el carry pierde protección y espacio.`,
      kind: 'dependency',
      priority: anchors.frontline.length === 1 ? 'critical' : 'high',
      evidence: anchors.frontline.slice(0, 3),
    });
  }

  if (teamProfile?.condition) {
    claims.push({
      label: 'Regla de entrada',
      detail: teamProfile.condition,
      kind: 'dependency',
      priority: 'high',
      evidence: uniqueValues([...(anchors.engage || []), ...(anchors.frontline || [])]).slice(0, 4),
    });
  }

  return claims;
}

function buildCascadeClaims(teamProfile, anchors, dominantWindow) {
  const claims = [];
  const carry = anchors.carry?.[0] || null;
  const engage = anchors.engage?.[0] || null;
  const frontline = anchors.frontline?.[0] || null;
  const objective = anchors.objective?.[0] || null;
  const splitpush = anchors.splitpush?.[0] || null;

  if (engage && objective) {
    claims.push({
      label: 'Dependencia en cascada',
      detail: `Si cae ${engage}, no sólo pierdes engage: también se retrasa la conversión en objetivo y la ventana de castigo se estrecha.`,
      kind: 'cascade',
      priority: 'critical',
      evidence: uniqueValues([engage, objective]),
    });
  }

  if (frontline && carry) {
    claims.push({
      label: 'Dependencia en cascada',
      detail: `Si cae ${frontline}, ${carry} pierde protección, la pelea se rompe y la composición se queda sin segunda línea.`,
      kind: 'cascade',
      priority: 'critical',
      evidence: uniqueValues([frontline, carry]),
    });
  }

  if (splitpush && (engage || frontline)) {
    claims.push({
      label: 'Dependencia en cascada',
      detail: `Si niegan ${splitpush}, el plan lateral cae sobre el 5v5; en ese momento necesitas otra forma de abrir mapa o pierdes presión.`,
      kind: 'cascade',
      priority: 'high',
      evidence: uniqueValues([splitpush, engage, frontline]),
    });
  }

  if (!claims.length && teamProfile?.condition) {
    claims.push({
      label: 'Dependencia en cascada',
      detail: `${teamProfile.condition} Si esta ventana falla, tu plan necesita reordenarse antes de volver a pelear.`,
      kind: 'cascade',
      priority: dominantWindow === 'early' ? 'high' : 'medium',
      evidence: uniqueValues([teamProfile.label, teamProfile.key]),
    });
  }

  return claims;
}

function buildObjectiveClaims(champions, anchors, teamProfile) {
  const objectiveNames = uniqueValues(anchors.objective || []).slice(0, 3);
  const engageNames = uniqueValues(anchors.engage || []).slice(0, 3);
  const profileObjectives = uniqueValues(Array.isArray(teamProfile?.objectives) ? teamProfile.objectives : []);

  if (!objectiveNames.length && !profileObjectives.length && !champions.some((champion) => champion.profile?.objectives?.length)) {
    return [];
  }

  const evidence = uniqueValues([...objectiveNames, ...engageNames, ...profileObjectives]).slice(0, 4);
  return [{
    label: 'Control de visión y Nashor',
    detail: 'Si pierdes visión antes del Nashor, tu composición pierde gran parte de su valor: necesitas preparar el río antes de comprometerte.',
    kind: 'objective',
    priority: evidence.length ? 'high' : 'medium',
    evidence,
  }];
}

function buildConflictClaims(champions, teamProfile, anchors) {
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
      evidence: champions.filter((champion) => champion.categories.some((category) => category === 'poke' || category === 'engage')).map((champion) => champion.name),
    });
  }

  if (protect && dive) {
    claims.push({
      label: 'Protección vs entrada',
      detail: 'Proteger al carry y lanzarte al frente al mismo tiempo te obliga a escoger una sola lectura: o escalas protegido o juegas a la entrada corta.',
      kind: 'conflict',
      priority: 'high',
      evidence: champions.filter((champion) => champion.categories.some((category) => category === 'protect' || category === 'engage')).map((champion) => champion.name),
    });
  }

  if (teamProfile?.key === 'splitpush' && (teamfight || protect)) {
    claims.push({
      label: 'Plan de mapa incompatible',
      detail: 'Tu identidad de splitpush choca con una lectura centrada en front-to-back: o abres laterales o te obligas a jugar el 5v5 que querías evitar.',
      kind: 'conflict',
      priority: 'high',
      evidence: uniqueValues([...anchors.splitpush, ...anchors.frontline]),
    });
  }

  if (teamProfile?.key === 'poke' && dive) {
    claims.push({
      label: 'Plan de mapa incompatible',
      detail: 'Tu plan de poke no quiere entrar de golpe: si juegas a Dive sin haber desgastado, conviertes el asedio en una pelea incómoda.',
      kind: 'conflict',
      priority: 'high',
      evidence: champions.filter((champion) => champion.categories.some((category) => category === 'poke' || category === 'engage')).map((champion) => champion.name),
    });
  }

  if (teamProfile?.key === 'protect' && splitpush) {
    claims.push({
      label: 'Plan de mapa incompatible',
      detail: 'Proteger al carry y abrir el mapa por laterales piden tempos distintos; si mezclas ambos, una mitad del plan siempre llega tarde.',
      kind: 'conflict',
      priority: 'high',
      evidence: uniqueValues([...anchors.splitpush, ...anchors.frontline]),
    });
  }

  return claims;
}

function buildRedundancyClaims(champions) {
  const counts = countCategoryCoverage(champions);
  const claims = [];

  const specs = [
    { key: 'engage', label: 'Redundancia de engage', threshold: 2, priority: 'high', detail: (names) => `Tienes ${names.length} fuentes de engage (${joinNames(names)}). No necesitas más entrada; necesitas una única ventana limpia y follow-up consistente.` },
    { key: 'frontline', label: 'Redundancia de frontline', threshold: 2, priority: 'high', detail: (names) => `Tienes ${names.length} piezas de frontline (${joinNames(names)}). El plan no gana por apilar tanques: gana cuando esa línea abre espacio para el carry.` },
    { key: 'poke', label: 'Redundancia de poke', threshold: 3, priority: 'medium', detail: (names) => `Tu asedio se repite entre ${joinNames(names)}. Hay suficiente desgaste, pero puede faltarte conversión o amenaza de cierre.` },
    { key: 'control', label: 'Redundancia de control', threshold: 3, priority: 'medium', detail: (names) => `Tienes varias piezas de control (${joinNames(names)}). Eso ordena el mapa, pero no siempre convierte presión en objetivo.` },
    { key: 'carry', label: 'Redundancia de carry', threshold: 2, priority: 'medium', detail: (names) => `Tu daño principal se reparte entre ${joinNames(names)}. El problema no es el daño, sino quién cierra la pelea.` },
    { key: 'splitpush', label: 'Redundancia de splitpush', threshold: 2, priority: 'medium', detail: (names) => `La presión lateral se repite entre ${joinNames(names)}. Abres mapa, sí, pero debes asegurar una sola ruta de conversión.` },
    { key: 'protect', label: 'Redundancia de protección', threshold: 2, priority: 'medium', detail: (names) => `Tienes más de una capa de protección (${joinNames(names)}). Eso compra tiempo, pero no sustituye a una ventana clara de daño.` },
  ];

  specs.forEach((spec) => {
    const names = counts[spec.key] || [];
    if (names.length >= spec.threshold) {
      claims.push({
        label: spec.label,
        detail: spec.detail(names.slice(0, 3)),
        kind: 'redundancy',
        priority: spec.priority,
        evidence: names.slice(0, 4),
      });
    }
  });

  return claims;
}

function buildPowerSpikeClaims(champions, teamProfile) {
  const windows = buildTimingWindows(champions, teamProfile);
  const dominant = determineDominantWindow(windows, teamProfile);
  if (!dominant) return [];

  const evidence = windows[dominant].slice(0, 3);
  const labelMap = {
    early: 'Pico real de early',
    mid: 'Pico real de mid game',
    late: 'Pico real de late game',
  };

  let detail;
  if (teamProfile?.timings && teamProfile.timings.length) {
    detail = `Tu pico real está en ${joinPhrase(teamProfile.timings)}; ${joinNames(evidence)} sostienen esa ventana. No fuerces una pelea fuera de ese rango.`;
  } else if (dominant === 'late') {
    detail = `Tu pico real está en late: ${joinNames(evidence)} son las piezas que mejor escalan. No fuerces una pelea larga antes de tiempo.`;
  } else if (dominant === 'early') {
    detail = `Tu pico real está en early: ${joinNames(evidence)} te permiten acelerar antes de que el rival estabilice el mapa.`;
  } else {
    detail = `Tu pico real está en mid game: ${joinNames(evidence)} te dan la mejor ventana para traducir ventaja en objetivos.`;
  }

  return [{
    label: labelMap[dominant] || 'Pico real de poder',
    detail,
    kind: 'power-spike',
    priority: dominant === 'mid' ? 'medium' : 'high',
    evidence,
  }];
}

function buildTempoClaims(champions, teamProfile) {
  const tempos = champions.map((champion) => normalizeText(champion.tempo)).filter(Boolean);
  if (!tempos.length) return [];

  const late = tempos.filter((tempo) => tempo.includes('late')).length;
  const early = tempos.filter((tempo) => tempo.includes('early')).length;
  const mid = tempos.filter((tempo) => tempo.includes('mid')).length;

  if (late >= Math.max(2, early + 1)) {
    return [{
      label: 'Ritmo de partida',
      detail: 'Necesitas ralentizar el early para alcanzar tu pico de poder; no fuerces una pelea antes de que la composición esté lista.',
      kind: 'tempo',
      priority: 'medium',
      evidence: champions.filter((champion) => normalizeText(champion.tempo).includes('late')).map((champion) => champion.name),
    }];
  }

  if (early >= Math.max(2, late + 1)) {
    return [{
      label: 'Ritmo de partida',
      detail: 'Tu valor está en el early: acelera, forzando ventanas cortas antes de que el rival estabilice el mapa.',
      kind: 'tempo',
      priority: 'medium',
      evidence: champions.filter((champion) => normalizeText(champion.tempo).includes('early')).map((champion) => champion.name),
    }];
  }

  if (mid >= 2) {
    return [{
      label: 'Ritmo de partida',
      detail: 'Tu pico está en el mid game: busca una transición limpia y evita quedarte en un limbo de tempo.',
      kind: 'tempo',
      priority: 'low',
      evidence: champions.filter((champion) => normalizeText(champion.tempo).includes('mid')).map((champion) => champion.name),
    }];
  }

  if (teamProfile?.timings?.length) {
    return [{
      label: 'Ritmo de partida',
      detail: `El ritmo adecuado sigue tus timings: ${joinPhrase(teamProfile.timings)}.`,
      kind: 'tempo',
      priority: 'low',
      evidence: teamProfile.timings.slice(0, 4),
    }];
  }

  return [];
}

function buildExecutionRiskClaims({ champions, teamProfile, anchors, conflictClaims, cascadeClaims, redundancyClaims, dominantWindow }) {
  const riskScore = clampScore(
    28
      + (anchors.engage.length ? (anchors.engage.length === 1 ? 18 : 8) : 0)
      + (anchors.frontline.length ? (anchors.frontline.length === 1 ? 14 : 7) : 0)
      + (conflictClaims.length ? 20 : 0)
      + (cascadeClaims.length ? 16 : 0)
      + (redundancyClaims.length ? Math.max(0, 8 - redundancyClaims.length * 2) : 10)
      + (dominantWindow === 'late' && anchors.engage.length === 0 ? 8 : 0)
      + (dominantWindow === 'early' && anchors.poke.length === 0 ? 6 : 0)
  );

  const band = riskScore >= 75 ? 'critical' : riskScore >= 55 ? 'high' : riskScore >= 35 ? 'medium' : 'low';
  const lead = anchors.engage[0] || anchors.frontline[0] || teamProfile?.label || 'la composición';
  const backup = anchors.carry[0] || anchors.objective[0] || teamProfile?.condition || 'su ventana principal';
  const detailByBand = {
    critical: `El riesgo de ejecución es muy alto: ${lead} sostiene la entrada y ${backup} sostiene la conversión; si una de esas piezas falla, el plan se desarma.`,
    high: `El riesgo de ejecución es alto: ${lead} marca la ventana principal y ${backup} marca el cierre; necesitas orden y sincronía para que la composición funcione.`,
    medium: `El riesgo de ejecución es medio: el plan tiene ventanas claras, pero requiere disciplina para no forzar peleas fuera de tiempo.`,
    low: `El riesgo de ejecución es bajo: la composición tiene una lectura limpia y pocas piezas críticas se pisan entre sí.`,
  };

  return [{
    label: 'Riesgo de ejecución',
    detail: detailByBand[band],
    kind: 'risk',
    priority: band === 'critical' ? 'critical' : band === 'high' ? 'high' : 'medium',
    evidence: uniqueValues([lead, backup, ...(anchors.engage || []), ...(anchors.frontline || [])]).slice(0, 4),
    score: riskScore,
  }];
}

function buildRobustnessClaims({ champions, teamProfile, anchors, dependencyClaims, conflictClaims, redundancyClaims, executionClaims }) {
  const score = clampScore(
    30
      + (redundancyClaims.length * 12)
      + (conflictClaims.length ? -18 * conflictClaims.length : 12)
      + (dependencyClaims.length > 2 ? -10 : 8)
      + (anchors.engage.length > 1 ? 8 : 0)
      + (anchors.frontline.length > 1 ? 8 : 0)
      + (anchors.carry.length > 1 ? 6 : 0)
      + (teamProfile?.timings?.length > 1 ? 4 : 0)
      - (executionClaims[0]?.score >= 70 ? 8 : 0)
  );

  const band = score >= 75 ? 'robust' : score >= 50 ? 'stable' : 'fragile';
  const detailByBand = {
    robust: 'La composición es robusta: si te quitan una pieza, aún te queda otra forma razonable de cerrar la pelea.',
    stable: 'La composición es razonablemente estable: aguanta alguna pérdida, pero no conviene que te obliguen a improvisar demasiado.',
    fragile: 'La composición es frágil: si te rompen la primera pieza, el resto del plan pierde coherencia muy rápido.',
  };

  return [{
    label: 'Robustez del draft',
    detail: detailByBand[band],
    kind: 'robustness',
    priority: band === 'fragile' ? 'high' : 'medium',
    evidence: uniqueValues([...(anchors.engage || []), ...(anchors.frontline || []), ...(anchors.carry || []), ...(anchors.objective || [])]).slice(0, 4),
    score,
  }];
}

function buildFlexibilityClaims({ champions, teamProfile, anchors, conflictClaims, redundancyClaims }) {
  const families = uniqueValues([
    ...(anchors.engage.length ? ['engage'] : []),
    ...(anchors.frontline.length ? ['frontline'] : []),
    ...(anchors.poke.length ? ['poke'] : []),
    ...(anchors.splitpush.length ? ['splitpush'] : []),
    ...(anchors.objective.length ? ['control'] : []),
  ]);
  const score = clampScore(
    20
      + (families.length * 16)
      + (redundancyClaims.length * 6)
      - (conflictClaims.length * 12)
      + (teamProfile?.key === 'control' ? 8 : 0)
      + (teamProfile?.key === 'poke' ? 4 : 0)
  );

  const band = score >= 70 ? 'high' : score >= 45 ? 'medium' : 'low';
  const detailByBand = {
    high: `La flexibilidad es alta: puedes pivotar entre ${joinPhrase(families)} según la respuesta rival sin perder identidad.`,
    medium: `La flexibilidad es media: tienes alguna ruta alternativa, pero no tantas como para improvisar el plan completo.`,
    low: 'La flexibilidad es baja: el draft pide una sola lectura y castiga los cambios de última hora.',
  };

  return [{
    label: 'Flexibilidad del draft',
    detail: detailByBand[band],
    kind: 'flexibility',
    priority: band === 'low' ? 'high' : 'medium',
    evidence: families.slice(0, 4),
    score,
  }];
}

function buildContingencyClaims({ teamProfile, anchors, cascadeClaims, conflictClaims, executionClaims, flexibilityClaims }) {
  const fallback = teamProfile?.condition || 'reordena la pelea y vuelve a tu ventana';
  const primaryThreat = cascadeClaims[0]?.evidence?.[0] || anchors.engage[0] || anchors.frontline[0] || anchors.splitpush[0] || 'tu pieza clave';
  const flexBand = flexibilityClaims[0]?.score >= 70 ? 'high' : flexibilityClaims[0]?.score >= 45 ? 'medium' : 'low';
  const riskBand = executionClaims[0]?.score >= 75 ? 'critical' : executionClaims[0]?.score >= 55 ? 'high' : 'medium';

  const detailByBand = {
    high: `Plan de contingencia: si ${primaryThreat} no puede ejecutar su función, pivota a ${fallback.toLowerCase()} y evita forzar una pelea frontal sin ventaja.`,
    medium: `Plan de contingencia: si la entrada principal falla, baja el ritmo, gana visión y vuelve a ${fallback.toLowerCase()} antes de comprometerte.`,
    low: `Plan de contingencia: la estructura es tan rígida que cualquier error te obliga a jugar sólo a ${fallback.toLowerCase()}.`,
  };

  const priority = riskBand === 'critical' ? 'critical' : riskBand === 'high' ? 'high' : 'medium';
  return [{
    label: 'Plan de contingencia',
    detail: detailByBand[flexBand],
    kind: 'contingency',
    priority,
    evidence: uniqueValues([primaryThreat, fallback, ...(anchors.engage || []), ...(anchors.frontline || [])]).slice(0, 4),
  }];
}

function buildAdaptationClaims({ report, teamProfile, anchors, champions, signalSet, flexibilityClaims, contingencyClaims }) {
  const rivalSignals = extractRivalSignals(report);
  const rivalThreats = uniqueValues([
    ...rivalSignals.categories,
    ...rivalSignals.labels,
    ...(Array.isArray(teamProfile?.losesAgainst) ? teamProfile.losesAgainst : []),
  ]).slice(0, 4);
  const allyPlan = uniqueValues([
    ...(Array.isArray(teamProfile?.needs) ? teamProfile.needs : []),
    ...(Array.isArray(teamProfile?.avoids) ? teamProfile.avoids : []),
  ]).slice(0, 4);

  const hasRival = rivalSignals.labels.length > 0 || rivalSignals.categories.length > 0;
  const detail = hasRival
    ? `Adaptación según rival: contra ${joinPhrase(rivalThreats)}, cambia el ritmo y apóyate en ${joinPhrase(allyPlan) || 'tu ventana principal'}.`
    : `Adaptación según rival: si enfrente aparece ${joinPhrase(teamProfile?.losesAgainst || []) || 'más presión de engage/disengage'}, cambia el ritmo y apóyate en ${joinPhrase(allyPlan) || 'tu ventana principal'}.`;

  const score = clampScore(
    35
      + (flexibilityClaims[0]?.score || 0) * 0.4
      + (contingencyClaims[0]?.priority === 'critical' ? -10 : 8)
      + (rivalThreats.length ? 10 : 0)
  );

  return [{
    label: 'Adaptación según rival',
    detail,
    kind: 'adaptation',
    priority: score >= 70 ? 'high' : 'medium',
    evidence: uniqueValues([...rivalThreats, ...allyPlan, ...(anchors.objective || []), ...(signalSet.categories || [])]).slice(0, 5),
    score,
  }];
}

function buildStrategicSummary({ claims, teamProfile, executionClaims, robustnessClaims, flexibilityClaims, contingencyClaims, adaptationClaims }) {
  const primary = claims[0]?.detail || teamProfile?.summary || 'La composición todavía no define una razón estratégica dominante.';
  const secondary = uniqueValues([
    executionClaims[0]?.detail,
    robustnessClaims[0]?.detail,
    flexibilityClaims[0]?.detail,
    contingencyClaims[0]?.detail,
    adaptationClaims[0]?.detail,
  ]).slice(0, 2);
  return secondary.length ? `${primary} ${secondary.join(' ')}` : primary;
}

function buildStrategicMetrics({ executionClaims, robustnessClaims, flexibilityClaims, contingencyClaims, adaptationClaims, cascadeClaims, redundancyClaims, conflictClaims, dominantWindow }) {
  const executionRisk = executionClaims[0]?.score ?? 0;
  const robustness = robustnessClaims[0]?.score ?? 0;
  const flexibility = flexibilityClaims[0]?.score ?? 0;
  const contingency = clampScore(robustness + flexibility - executionRisk + (contingencyClaims.length ? 8 : 0));
  const adaptation = adaptationClaims[0]?.score ?? 0;
  const resilience = clampScore(robustness + flexibility - Math.max(executionRisk, conflictClaims.length * 8));
  const cascadeDepth = cascadeClaims.length + (dominantWindow ? 1 : 0) + Math.min(2, redundancyClaims.length);

  return {
    executionRisk,
    robustness,
    flexibility,
    contingency,
    adaptation,
    resilience,
    cascadeDepth,
    dominantWindow: dominantWindow || 'mixed',
  };
}

function countCategoryCoverage(champions) {
  const counts = Object.fromEntries([
    ['engage', []],
    ['frontline', []],
    ['poke', []],
    ['control', []],
    ['carry', []],
    ['splitpush', []],
    ['protect', []],
  ]);

  champions.forEach((champion) => {
    const categories = new Set(champion.categories || []);
    if (categories.has('engage') || categories.has('pick')) counts.engage.push(champion.name);
    if (categories.has('frontline') || categories.has('protect')) counts.frontline.push(champion.name);
    if (categories.has('poke')) counts.poke.push(champion.name);
    if (categories.has('control')) counts.control.push(champion.name);
    if (categories.has('carry')) counts.carry.push(champion.name);
    if (categories.has('splitpush')) counts.splitpush.push(champion.name);
    if (categories.has('protect')) counts.protect.push(champion.name);
  });

  return counts;
}

function buildTimingWindows(champions, teamProfile) {
  const windows = { early: [], mid: [], late: [] };

  champions.forEach((champion) => {
    extractTimingTokens(champion.tempo).forEach((token) => windows[token].push(champion.name));
  });

  if (teamProfile?.timings) {
    teamProfile.timings.forEach((timing) => {
      extractTimingTokens(timing).forEach((token) => windows[token].push(teamProfile.label || teamProfile.key || 'perfil'));
    });
  }

  return windows;
}

function determineDominantWindow(windows, teamProfile) {
  const profileTimings = extractTimingTokens((teamProfile?.timings || []).join(' '));
  if (profileTimings.length === 1) return profileTimings[0];
  if (profileTimings.length > 1) {
    const window = profileTimings.find((key) => windows[key]?.length);
    if (window) return window;
  }

  const ranked = Object.entries(windows)
    .map(([key, names]) => ({ key, size: names.length }))
    .sort((a, b) => b.size - a.size || timingRank(a.key) - timingRank(b.key));

  return ranked[0]?.size ? ranked[0].key : null;
}

function extractTimingTokens(value = '') {
  const normalized = normalizeText(value);
  const tokens = [];
  if (!normalized) return tokens;
  if (normalized.includes('early')) tokens.push('early');
  if (normalized.includes('mid')) tokens.push('mid');
  if (normalized.includes('late')) tokens.push('late');
  return uniqueValues(tokens);
}

function timingRank(key) {
  return ({ early: 0, mid: 1, late: 2 }[key] ?? 99);
}

function buildSignalSet(report, composition, champions, teamProfile) {
  const labels = uniqueValues([
    report.primaryIdentity,
    report.tempo,
    report.dominance,
    report.identity?.dominance,
    report.identity?.focus,
    report.identity?.summaryText,
    report.strategic?.focus,
    report.strategic?.summary,
    ...(Array.isArray(report.tags) ? report.tags : []),
    ...(Array.isArray(composition.tags) ? composition.tags : []),
    ...(Array.isArray(champions) ? champions.flatMap((champion) => champion.bundle) : []),
    ...(Array.isArray(report.winConditions) ? report.winConditions.flatMap((item) => [item?.label, item?.detail]) : []),
    ...(Array.isArray(teamProfile?.timings) ? teamProfile.timings : []),
    ...(Array.isArray(teamProfile?.needs) ? teamProfile.needs : []),
    ...(Array.isArray(teamProfile?.objectives) ? teamProfile.objectives : []),
    ...(Array.isArray(report.strategic?.claims) ? report.strategic.claims.map((claim) => claim?.label) : []),
  ].map(toText));

  const categories = uniqueValues([
    ...labels.flatMap((label) => resolveSignalCategories(label)),
    ...champions.flatMap((champion) => champion.categories),
    ...uniqueValues(Array.isArray(report.strategic?.signals) ? report.strategic.signals : []),
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

function extractRivalSignals(report) {
  const source = [
    report.rival,
    report.rivalComposition,
    report.opponent,
    report.enemyComposition,
    report.matchup,
    report.enemy,
    report.opposition,
  ];

  const labels = uniqueValues(source.flatMap((item) => flattenSignals(item)));
  const categories = uniqueValues(labels.flatMap((label) => resolveSignalCategories(label)));
  return { labels, categories };
}

function flattenSignals(value) {
  if (value == null) return [];
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap((item) => flattenSignals(item));
  if (typeof value === 'object') {
    return [
      value.label,
      value.name,
      value.title,
      value.identity,
      value.primaryIdentity,
      value.focus,
      value.summary,
      value.description,
      value.detail,
      value.type,
      value.tags,
      value.categories,
    ].flatMap((item) => flattenSignals(item));
  }
  return [String(value)];
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

function compareClaims(a, b) {
  const priorityDiff = (PRIORITY_WEIGHT[b.priority] || 0) - (PRIORITY_WEIGHT[a.priority] || 0);
  if (priorityDiff !== 0) return priorityDiff;

  const kindDiff = (KIND_ORDER[a.kind] ?? 99) - (KIND_ORDER[b.kind] ?? 99);
  if (kindDiff !== 0) return kindDiff;

  return normalizeText(a.label).localeCompare(normalizeText(b.label));
}

function joinNames(values = []) {
  const items = uniqueValues(values).slice(0, 3);
  if (!items.length) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} y ${items[1]}`;
  return `${items.slice(0, 2).join(', ')} y ${items[2]}`;
}

function joinPhrase(values = []) {
  const items = uniqueValues(values).slice(0, 4);
  if (!items.length) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} y ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}
