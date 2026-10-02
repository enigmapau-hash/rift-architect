import { CONFLICT_RULES, findStrategicProfile, summarizeStrategicProfile } from '../../knowledge/index.js';
import { matchesCategory, normalizeText } from '../engine/utils.js';
import { cleanText, toText, uniqueValues } from './analysis-utils.js';

const PRIORITY_WEIGHT = {
  critical: 400,
  high: 300,
  medium: 200,
  low: 100,
};

const KIND_ORDER = {
  dependency: 0,
  conflict: 1,
  power-spike: 2,
  redundancy: 3,
  objective: 4,
  condition: 5,
  profile: 6,
  tempo: 7,
};

export function buildStrategicReasoning(report = {}) {
  const composition = report.composition || {};
  const champions = collectChampions(report, composition).map(describeChampion);
  const signalSet = buildSignals(report, composition, champions);
  const teamProfile = resolveTeamProfile(report, champions, signalSet);
  const anchors = buildAnchors(champions);

  const claims = uniqueClaims([
    ...buildProfileClaims(teamProfile, champions),
    ...buildDependencyClaims(teamProfile, anchors, champions, signalSet),
    ...buildObjectiveClaims(champions, anchors, teamProfile),
    ...buildConflictClaims(champions, report, composition, anchors, teamProfile),
    ...buildRedundancyClaims(champions),
    ...buildPowerSpikeClaims(champions, teamProfile),
    ...buildTempoClaims(champions, teamProfile),
  ]).sort(compareClaims);

  const focus = claims.length ? claims[0].label : (teamProfile && teamProfile.label) || 'Lectura estratégica';
  const summary = claims.length ? claims[0].detail : (teamProfile && teamProfile.summary) || 'La composición todavía no define una razón estratégica dominante.';

  return {
    focus,
    headline: focus,
    summary,
    claims,
    dependencies: claims.filter(function (claim) { return claim.kind === 'dependency'; }),
    redundancies: claims.filter(function (claim) { return claim.kind === 'redundancy'; }),
    powerSpikes: claims.filter(function (claim) { return claim.kind === 'power-spike'; }),
    conflicts: claims.filter(function (claim) { return claim.kind === 'conflict'; }),
    profiles: champions.map(function (champion) { return champion.profile; }).filter(Boolean).map(summarizeStrategicProfile),
    anchors,
    signals: signalSet.signals.slice(0, 12),
    profile: teamProfile ? summarizeStrategicProfile(teamProfile) : null,
  };
}

function collectChampions(report, composition) {
  if (Array.isArray(composition.selectedChampions) && composition.selectedChampions.length) {
    return composition.selectedChampions.filter(Boolean);
  }

  if (Array.isArray(report.selectedChampions) && report.selectedChampions.length) {
    return report.selectedChampions.filter(Boolean);
  }

  return [];
}

function describeChampion(champion) {
  const name = cleanText(champion && (champion.champion || champion.name || champion.displayName) || 'Sin definir');
  const identity = cleanText(champion && champion.identity || 'Sin definir');
  const role = cleanText(champion && champion.role || '');
  const functionLabel = cleanText(champion && champion.function || 'Sin definir');
  const tempo = cleanText(champion && champion.tempo || 'Sin definir');
  const strengths = uniqueValues(Array.isArray(champion && champion.strengths) ? champion.strengths.map(toText) : []);
  const weaknesses = uniqueValues(Array.isArray(champion && champion.weaknesses) ? champion.weaknesses.map(toText) : []);
  const categories = buildChampionCategories(name, identity, functionLabel, tempo, strengths, weaknesses);
  const profile = findStrategicProfile(identity || functionLabel || name, {
    labels: [name, identity, functionLabel, tempo, role].concat(strengths, weaknesses),
    categories: categories,
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
    bundle: uniqueValues([name, identity, functionLabel, tempo, role].concat(strengths, weaknesses)),
    categories,
  };
}

function resolveTeamProfile(report, champions, signalSet) {
  const primaryIdentity = cleanText((report.primaryIdentity) || (report.identity && report.identity.primaryIdentity) || (champions[0] && champions[0].identity) || '');
  const primaryFunction = cleanText((report.identity && (report.identity.dominance || report.identity.focus)) || '');
  const searchSpace = [primaryIdentity, primaryFunction, report.summaryText, report.executiveSummary && report.executiveSummary.title].filter(Boolean).join(' ');

  return (
    findStrategicProfile(primaryIdentity, signalSet) ||
    findStrategicProfile(searchSpace, signalSet) ||
    findStrategicProfile(champions.map(function (champion) { return champion.categories.join(' '); }).join(' '), signalSet) ||
    null
  );
}

function buildChampionCategories(name, identity, functionLabel, tempo, strengths, weaknesses) {
  const text = [name, identity, functionLabel, tempo].concat(strengths || [], weaknesses || []).join(' ');
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
  ].filter(function (category) { return matchesCategory(text, category); });

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

  if (normalizeText(identity).indexOf('protect') >= 0 || normalizeText(identity).indexOf('fronttoback') >= 0) {
    categories.push('protect');
  }

  return uniqueValues(categories);
}

function buildAnchors(champions) {
  const groups = {
    engage: champions.filter(function (champion) { return champion.categories.some(function (category) { return category === 'engage' || category === 'pick'; }); }),
    frontline: champions.filter(function (champion) { return champion.categories.some(function (category) { return category === 'frontline' || category === 'protect'; }); }),
    objective: champions.filter(function (champion) { return champion.categories.some(function (category) { return category === 'objective' || category === 'control' || category === 'poke'; }); }),
    splitpush: champions.filter(function (champion) { return champion.categories.indexOf('splitpush') >= 0; }),
    carry: champions.filter(function (champion) { return champion.categories.indexOf('carry') >= 0; }),
  };

  return Object.fromEntries(Object.entries(groups).map(function (entry) {
    const key = entry[0];
    const items = entry[1];
    return [key, items.map(function (item) { return item.name; })];
  }));
}

function buildProfileClaims(teamProfile, champions) {
  const claims = [];
  if (!teamProfile) return claims;

  if (teamProfile.summary) {
    claims.push({
      label: teamProfile.label ? ('Lectura de ' + teamProfile.label) : 'Lectura estratégica',
      detail: teamProfile.summary,
      kind: 'profile',
      priority: 'low',
      evidence: uniqueValues([teamProfile.label, teamProfile.key].concat(Array.isArray(teamProfile.timings) ? teamProfile.timings : [])).slice(0, 4),
    });
  }

  if (teamProfile.condition) {
    claims.push({
      label: teamProfile.label ? ('Condición de ' + teamProfile.label) : 'Condición de victoria',
      detail: teamProfile.condition,
      kind: 'condition',
      priority: 'medium',
      evidence: uniqueValues([teamProfile.label, teamProfile.key].concat(Array.isArray(teamProfile.needs) ? teamProfile.needs : [])).slice(0, 4),
    });
  }

  if (Array.isArray(teamProfile.needs) && teamProfile.needs.length) {
    claims.push.apply(claims, buildNeedClaims(teamProfile, champions));
  }

  if (Array.isArray(teamProfile.objectives) && teamProfile.objectives.length) {
    claims.push({
      label: 'Objetivos prioritarios',
      detail: 'Tus objetivos prioritarios son ' + joinPhrase(teamProfile.objectives) + '.',
      kind: 'objective',
      priority: 'low',
      evidence: teamProfile.objectives.slice(0, 4),
    });
  }

  if (Array.isArray(teamProfile.avoids) && teamProfile.avoids.length) {
    claims.push({
      label: 'Lo que debes evitar',
      detail: 'Evita ' + joinPhrase(teamProfile.avoids) + ' para no romper el plan.',
      kind: 'profile',
      priority: 'low',
      evidence: teamProfile.avoids.slice(0, 4),
    });
  }

  return claims;
}

function buildNeedClaims(teamProfile, champions) {
  const needs = uniqueValues((teamProfile.needs || []).map(toText));
  const normalizedNeeds = needs.map(function (item) { return normalizeText(item); });
  const claims = [];
  const profileLabel = cleanText(teamProfile.label || 'la composición');
  const evidence = needs.slice(0, 4);

  if (normalizedNeeds.some(function (item) { return item.indexOf('vision') >= 0; })) {
    claims.push({
      label: 'Dependencia crítica de visión',
      detail: 'Tu ' + profileLabel.toLowerCase() + ' necesita visión previa: sin control del río y del Nashor, gran parte de su valor desaparece.',
      kind: 'dependency',
      priority: 'critical',
      evidence,
    });
  }

  if (normalizedNeeds.some(function (item) { return item.indexOf('follow') >= 0; })) {
    const sourceNames = uniqueValues([
      ...champions.filter(function (champion) { return champion.categories.some(function (category) { return category === 'engage' || category === 'pick' || category === 'skirmish'; }); }).map(function (champion) { return champion.name; }),
      ...(Array.isArray(teamProfile.labels) ? teamProfile.labels.slice(0, 3) : []),
    ]).slice(0, 3);

    claims.push({
      label: 'Dependencia de follow-up',
      detail: sourceNames.length ? ('Tu entrada depende del follow-up de ' + joinNames(sourceNames) + '; sin conversión detrás, la ventana de engage se queda corta.') : 'Tu entrada depende del follow-up: si no conviertes la primera ventana, el engage se queda colgando.',
      kind: 'dependency',
      priority: 'critical',
      evidence: uniqueValues([...evidence, ...sourceNames]),
    });
  }

  if (normalizedNeeds.some(function (item) { return item.indexOf('frontline') >= 0 || item.indexOf('front line') >= 0 || item.indexOf('peel') >= 0; })) {
    const protection = joinPhrase(needs.filter(function (item) { return /frontline|front line|peel|protect/i.test(item); })).toLowerCase() || 'protección';
    claims.push({
      label: 'Dependencia de protección',
      detail: 'Tu plan necesita ' + protection + '; si el carry queda expuesto, la pelea se desordena.',
      kind: 'dependency',
      priority: 'high',
      evidence,
    });
  }

  if (normalizedNeeds.some(function (item) { return item.indexOf('flank') >= 0 || item.indexOf('flanco') >= 0 || item.indexOf('side') >= 0; })) {
    claims.push({
      label: 'Dependencia de flancos',
      detail: 'Necesitas ángulos laterales claros; si el mapa se cierra, la composición pierde acceso a su mejor ventana de entrada.',
      kind: 'dependency',
      priority: 'high',
      evidence,
    });
  }

  if (normalizedNeeds.some(function (item) { return item.indexOf('space') >= 0 || item.indexOf('espacio') >= 0; })) {
    claims.push({
      label: 'Dependencia de espacio',
      detail: 'Tu plan necesita espacio para jugar la oleada y la visión; no entres a una zona cerrada sin haberla abierto antes.',
      kind: 'dependency',
      priority: 'high',
      evidence,
    });
  }

  return claims;
}

function buildDependencyClaims(teamProfile, anchors, champions, signalSet) {
  const claims = [
    buildDependencyClaim('engage', anchors.engage),
    buildDependencyClaim('frontline', anchors.frontline),
  ].filter(Boolean);

  if (teamProfile && (teamProfile.key === 'dive' || teamProfile.key === 'engage' || teamProfile.key === 'pick' || teamProfile.key === 'skirmish')) {
    if (teamProfile.condition) {
      claims.push({
        label: 'Regla de entrada',
        detail: teamProfile.condition,
        kind: 'dependency',
        priority: 'high',
        evidence: uniqueValues([].concat(anchors.engage, anchors.frontline)).slice(0, 4),
      });
    }
  }

  if (teamProfile && teamProfile.key === 'protect' && Array.isArray(teamProfile.needs) && teamProfile.needs.some(function (item) { return /carry|peel|protect/i.test(item); })) {
    claims.push({
      label: 'Dependencia de carry protegido',
      detail: 'Tu estructura necesita que el carry llegue vivo al cierre; si se expone antes, el plan pierde el sentido.',
      kind: 'dependency',
      priority: 'high',
      evidence: uniqueValues([].concat(anchors.frontline, anchors.carry, signalSet.signals)).slice(0, 4),
    });
  }

  return claims;
}

function buildObjectiveClaims(champions, anchors, teamProfile) {
  const objectiveNames = uniqueValues(anchors.objective || []).slice(0, 3);
  const engageNames = uniqueValues(anchors.engage || []).slice(0, 3);
  const profileObjectives = uniqueValues(Array.isArray(teamProfile && teamProfile.objectives) ? teamProfile.objectives : []);
  const hasObjectivePressure = objectiveNames.length > 0 || profileObjectives.length > 0 || champions.some(function (champion) { return champion.profile && Array.isArray(champion.profile.objectives) && champion.profile.objectives.length; });
  if (!hasObjectivePressure) return [];

  const evidence = uniqueValues([].concat(objectiveNames, engageNames, profileObjectives)).slice(0, 4);

  return [{
    label: 'Control de visión y Nashor',
    detail: 'Si pierdes visión antes del Nashor, tu composición pierde gran parte de su valor: necesitas preparar el río antes de comprometerte.',
    kind: 'objective',
    priority: evidence.length ? 'high' : 'medium',
    evidence,
  }];
}

function buildConflictClaims(champions, report, composition, anchors, teamProfile) {
  const claims = [];
  const splitpush = anchors.splitpush.length > 0 || champions.some(function (champion) { return champion.categories.indexOf('splitpush') >= 0; });
  const teamfight = anchors.frontline.length > 0 || champions.some(function (champion) { return champion.categories.indexOf('frontline') >= 0; });
  const poke = champions.some(function (champion) { return champion.categories.indexOf('poke') >= 0; });
  const dive = champions.some(function (champion) { return champion.categories.indexOf('engage') >= 0; });
  const protect = champions.some(function (champion) { return champion.categories.indexOf('protect') >= 0; });

  if (splitpush && teamfight) {
    claims.push({
      label: 'Condiciones de victoria incompatibles',
      detail: 'Tu equipo tiene dos condiciones de victoria incompatibles: Splitpush y Teamfight. La presión lateral y el 5v5 piden mapas y tempos distintos.',
      kind: 'conflict',
      priority: 'critical',
      evidence: uniqueValues([].concat(anchors.splitpush, anchors.frontline)),
    });
  }

  if (poke && dive) {
    claims.push({
      label: 'Condiciones de victoria incompatibles',
      detail: 'Tu equipo mezcla Poke y Dive: una quiere desgastar y la otra quiere entrar de golpe. Si no defines una sola ventana, la composición se rompe.',
      kind: 'conflict',
      priority: 'critical',
      evidence: uniqueValues(champions.filter(function (champion) { return champion.categories.some(function (category) { return category === 'poke' || category === 'engage'; }); }).map(function (champion) { return champion.name; })),
    });
  }

  if (protect && dive) {
    claims.push({
      label: 'Protección vs entrada',
      detail: 'Proteger al carry y lanzarte al frente al mismo tiempo te obliga a escoger una sola lectura: o escalas protegido o juegas a la entrada corta.',
      kind: 'conflict',
      priority: 'high',
      evidence: champions.filter(function (champion) { return champion.categories.some(function (category) { return category === 'protect' || category === 'engage'; }); }).map(function (champion) { return champion.name; }),
    });
  }

  if (teamProfile && teamProfile.key === 'splitpush' && (teamfight || protect)) {
    claims.push({
      label: 'Plan de mapa incompatible',
      detail: 'Tu identidad de splitpush choca con una lectura centrada en front-to-back: o abres laterales o te obligas a jugar el 5v5 que querías evitar.',
      kind: 'conflict',
      priority: 'high',
      evidence: uniqueValues([].concat(anchors.splitpush, anchors.frontline)),
    });
  }

  if (teamProfile && teamProfile.key === 'poke' && dive) {
    claims.push({
      label: 'Plan de mapa incompatible',
      detail: 'Tu plan de poke no quiere entrar de golpe: si juegas a Dive sin haber desgastado, conviertes el asedio en una pelea incómoda.',
      kind: 'conflict',
      priority: 'high',
      evidence: champions.filter(function (champion) { return champion.categories.some(function (category) { return category === 'poke' || category === 'engage'; }); }).map(function (champion) { return champion.name; }),
    });
  }

  if (teamProfile && teamProfile.key === 'protect' && splitpush) {
    claims.push({
      label: 'Plan de mapa incompatible',
      detail: 'Proteger al carry y abrir el mapa por laterales piden tempos distintos; si mezclas ambos, una mitad del plan siempre llega tarde.',
      kind: 'conflict',
      priority: 'high',
      evidence: uniqueValues([].concat(anchors.splitpush, anchors.frontline)),
    });
  }

  const explicitRules = CONFLICT_RULES.filter(function (rule) {
    const labels = (rule.labels || []).map(function (label) { return normalizeText(label); });
    const signal = [].concat(
      champions.flatMap(function (champion) { return champion.bundle.map(function (value) { return normalizeText(value); }); }),
      uniqueValues(report.tags || []),
      uniqueValues(composition.tags || []),
      uniqueValues(report.winConditions || []).map(function (item) { return normalizeText((item && item.label) || item || ''); })
    );

    return labels.every(function (label) {
      return signal.some(function (value) { return value === label || value.indexOf(label) >= 0; });
    });
  });

  explicitRules.forEach(function (rule) {
    claims.push({
      label: 'Tensión estratégica',
      detail: rule.detail || (rule.labels || []).join(' y ') + ' entran en conflicto.',
      kind: 'conflict',
      priority: rule.penalty >= 16 ? 'critical' : 'high',
      evidence: rule.labels,
    });
  });

  return claims;
}

function buildRedundancyClaims(champions) {
  const counts = countCategoryCoverage(champions);
  const claims = [];
  const specs = [
    {
      key: 'engage',
      label: 'Redundancia de engage',
      threshold: 2,
      priority: 'high',
      detail: function (names) { return 'Tienes ' + names.length + ' fuentes de engage (' + joinNames(names) + '). No necesitas más entrada; necesitas una única ventana limpia y follow-up consistente.'; },
    },
    {
      key: 'frontline',
      label: 'Redundancia de frontline',
      threshold: 2,
      priority: 'high',
      detail: function (names) { return 'Tienes ' + names.length + ' piezas de frontline (' + joinNames(names) + '). El plan no gana por apilar tanques: gana cuando esa línea abre espacio para el carry.'; },
    },
    {
      key: 'poke',
      label: 'Redundancia de poke',
      threshold: 3,
      priority: 'medium',
      detail: function (names) { return 'Tu asedio se repite entre ' + joinNames(names) + '. Hay suficiente desgaste, pero puede faltarte conversión o amenaza de cierre.'; },
    },
    {
      key: 'control',
      label: 'Redundancia de control',
      threshold: 3,
      priority: 'medium',
      detail: function (names) { return 'Tienes varias piezas de control (' + joinNames(names) + '). Eso ordena el mapa, pero no siempre convierte presión en objetivo.'; },
    },
    {
      key: 'carry',
      label: 'Redundancia de carry',
      threshold: 2,
      priority: 'medium',
      detail: function (names) { return 'Tu daño principal se reparte entre ' + joinNames(names) + '. El problema no es el daño, sino quién cierra la pelea.'; },
    },
    {
      key: 'splitpush',
      label: 'Redundancia de splitpush',
      threshold: 2,
      priority: 'medium',
      detail: function (names) { return 'La presión lateral se repite entre ' + joinNames(names) + '. Abres mapa, sí, pero debes asegurar una sola ruta de conversión.'; },
    },
    {
      key: 'protect',
      label: 'Redundancia de protección',
      threshold: 2,
      priority: 'medium',
      detail: function (names) { return 'Tienes más de una capa de protección (' + joinNames(names) + '). Eso compra tiempo, pero no sustituye a una ventana clara de daño.'; },
    },
  ];

  specs.forEach(function (spec) {
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

  const labelMap = {
    early: 'Pico real de early',
    mid: 'Pico real de mid game',
    late: 'Pico real de late game',
  };

  const evidence = windows[dominant].slice(0, 3);
  let detail;
  if (teamProfile && Array.isArray(teamProfile.timings) && teamProfile.timings.length) {
    detail = 'Tu pico real está en ' + joinPhrase(teamProfile.timings) + '; ' + joinNames(evidence) + ' sostienen esa ventana. No fuerces una pelea fuera de ese rango.';
  } else if (dominant === 'late') {
    detail = 'Tu pico real está en late: ' + joinNames(evidence) + ' son las piezas que mejor escalan. No fuerces una pelea larga antes de tiempo.';
  } else if (dominant === 'early') {
    detail = 'Tu pico real está en early: ' + joinNames(evidence) + ' te permiten acelerar antes de que el rival estabilice el mapa.';
  } else {
    detail = 'Tu pico real está en mid game: ' + joinNames(evidence) + ' te dan la mejor ventana para traducir ventaja en objetivos.';
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
  const tempos = champions.map(function (champion) { return normalizeText(champion.tempo); }).filter(Boolean);
  if (!tempos.length) return [];

  const late = tempos.filter(function (tempo) { return tempo.indexOf('late') >= 0; }).length;
  const early = tempos.filter(function (tempo) { return tempo.indexOf('early') >= 0; }).length;
  const mid = tempos.filter(function (tempo) { return tempo.indexOf('mid') >= 0; }).length;

  if (late >= Math.max(2, early + 1)) {
    return [{
      label: 'Ritmo de partida',
      detail: 'Necesitas ralentizar el early para alcanzar tu pico de poder; no fuerces una pelea antes de que la composición esté lista.',
      kind: 'tempo',
      priority: 'medium',
      evidence: champions.filter(function (champion) { return normalizeText(champion.tempo).indexOf('late') >= 0; }).map(function (champion) { return champion.name; }),
    }];
  }

  if (early >= Math.max(2, late + 1)) {
    return [{
      label: 'Ritmo de partida',
      detail: 'Tu valor está en el early: acelera, forzando ventanas cortas antes de que el rival estabilice el mapa.',
      kind: 'tempo',
      priority: 'medium',
      evidence: champions.filter(function (champion) { return normalizeText(champion.tempo).indexOf('early') >= 0; }).map(function (champion) { return champion.name; }),
    }];
  }

  if (mid >= 2) {
    return [{
      label: 'Ritmo de partida',
      detail: 'Tu pico está en el mid game: busca una transición limpia y evita quedarte en un limbo de tempo.',
      kind: 'tempo',
      priority: 'low',
      evidence: champions.filter(function (champion) { return normalizeText(champion.tempo).indexOf('mid') >= 0; }).map(function (champion) { return champion.name; }),
    }];
  }

  if (teamProfile && Array.isArray(teamProfile.timings) && teamProfile.timings.length) {
    return [{
      label: 'Ritmo de partida',
      detail: 'Tu ventana principal está en ' + joinPhrase(teamProfile.timings) + '; no alargues la partida más de lo necesario.',
      kind: 'tempo',
      priority: 'low',
      evidence: teamProfile.timings.slice(0, 4),
    }];
  }

  return [];
}

function countCategoryCoverage(champions) {
  const counts = Object.fromEntries([
    'engage',
    'frontline',
    'poke',
    'control',
    'carry',
    'splitpush',
    'protect',
  ].map(function (key) { return [key, []]; }));

  champions.forEach(function (champion) {
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
  const windows = {
    early: [],
    mid: [],
    late: [],
  };

  function pushTiming(value, name) {
    const tokens = extractTimingTokens(value);
    tokens.forEach(function (token) {
      windows[token].push(name);
    });
  }

  champions.forEach(function (champion) {
    pushTiming(champion.tempo, champion.name);
  });

  if (teamProfile && Array.isArray(teamProfile.timings)) {
    teamProfile.timings.forEach(function (timing) {
      pushTiming(timing, teamProfile.label || teamProfile.key || 'perfil');
    });
  }

  return windows;
}

function determineDominantWindow(windows, teamProfile) {
  const profileTimings = extractTimingTokens((teamProfile && Array.isArray(teamProfile.timings) ? teamProfile.timings : []).join(' '));
  if (profileTimings.length === 1) return profileTimings[0];
  if (profileTimings.length > 1) {
    const window = profileTimings.find(function (key) { return (windows[key] || []).length > 0; });
    if (window) return window;
  }

  const ranked = Object.entries(windows)
    .map(function (entry) { return { key: entry[0], size: entry[1].length }; })
    .sort(function (a, b) { return b.size - a.size || timingRank(a.key) - timingRank(b.key); });

  return ranked.length && ranked[0].size ? ranked[0].key : null;
}

function extractTimingTokens(value) {
  const normalized = normalizeText(value);
  const tokens = [];
  if (!normalized) return tokens;

  if (normalized.indexOf('early') >= 0) tokens.push('early');
  if (normalized.indexOf('mid') >= 0) tokens.push('mid');
  if (normalized.indexOf('late') >= 0) tokens.push('late');

  return uniqueValues(tokens);
}

function timingRank(key) {
  const ranks = { early: 0, mid: 1, late: 2 };
  return ranks[key] == null ? 99 : ranks[key];
}

function buildSignals(report, composition, champions) {
  const labels = uniqueValues([
    report.primaryIdentity,
    report.tempo,
    report.dominance,
    report.identity && report.identity.dominance,
    report.identity && report.identity.focus,
    report.identity && report.identity.summaryText,
    ...(Array.isArray(report.tags) ? report.tags : []),
    ...(Array.isArray(composition.tags) ? composition.tags : []),
    ...(Array.isArray(champions) ? champions.flatMap(function (champion) { return champion.bundle; }) : []),
    ...(Array.isArray(report.winConditions) ? report.winConditions.flatMap(function (item) { return [item && item.label, item && item.detail]; }) : []),
  ]);

  const categories = uniqueValues([
    ...labels.flatMap(resolveSignalCategories),
    ...champions.flatMap(function (champion) { return champion.categories; }),
  ]);

  return {
    labels,
    categories,
    signals: uniqueValues([...labels, ...categories]),
  };
}

function resolveSignalCategories(label) {
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

function buildDependencyClaim(kind, names) {
  if (!Array.isArray(names) || !names.length) return null;

  const uniqueNames = uniqueValues(names).slice(0, 3);
  const lead = uniqueNames.length === 1 ? uniqueNames[0] : joinNames(uniqueNames);
  const templates = {
    engage: {
      label: 'Dependencia de engage',
      single: 'Tu engage depende exclusivamente de ' + lead + '. Si cae, te quedas sin entrada limpia.',
      plural: 'Tu engage se reparte entre ' + lead + '. Si uno falla, la composición pierde la entrada limpia.',
    },
    frontline: {
      label: 'Dependencia de frontline',
      single: 'Tu frontline depende de ' + lead + '. Si cae, el carry queda expuesto y la pelea se desordena.',
      plural: 'Tu frontline se apoya en ' + lead + '. Si uno falla, el carry pierde protección y espacio.',
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

function uniqueClaims(items) {
  const seen = new Set();
  return items.filter(function (item) {
    if (!item) return false;
    const key = normalizeText(item.label) + '::' + normalizeText(item.detail);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function compareClaims(a, b) {
  const priorityDiff = (PRIORITY_WEIGHT[b.priority] || 0) - (PRIORITY_WEIGHT[a.priority] || 0);
  if (priorityDiff !== 0) return priorityDiff;

  const kindDiff = (KIND_ORDER[a.kind] == null ? 99 : KIND_ORDER[a.kind]) - (KIND_ORDER[b.kind] == null ? 99 : KIND_ORDER[b.kind]);
  if (kindDiff !== 0) return kindDiff;

  return normalizeText(a.label).localeCompare(normalizeText(b.label));
}

function joinNames(values) {
  const items = uniqueValues(values).slice(0, 3);
  if (items.length <= 1) return items[0] || '';
  if (items.length === 2) return items[0] + ' y ' + items[1];
  return items.slice(0, 2).join(', ') + ' y ' + items[2];
}

function joinPhrase(values) {
  const items = uniqueValues(values).slice(0, 4);
  if (!items.length) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return items[0] + ' y ' + items[1];
  return items.slice(0, -1).join(', ') + ' y ' + items[items.length - 1];
}
