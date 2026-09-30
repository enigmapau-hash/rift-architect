import { clampNumber, compareLabels, getLabelText, normalizeText, uniqueOrdered } from './utils.js';

function toLabels(values = []) {
  return values.map((value) => getLabelText(value)).filter(Boolean);
}

function containsAny(text, terms = []) {
  const normalized = normalizeText(text);
  return terms.some((term) => normalized.includes(normalizeText(term)));
}

function clampWords(text, maxWords = 12) {
  const words = String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);

  return words.slice(0, maxWords).join(' ');
}

function uniqueByLabel(items = []) {
  const seen = new Set();
  const result = [];

  items.forEach((item) => {
    const label = String(item?.label || '').trim();
    if (!label) return;
    const key = normalizeText(label);
    if (seen.has(key)) return;
    seen.add(key);
    result.push({ ...item, label });
  });

  return result.slice(0, 3);
}

function buildContextText(analysis = {}) {
  return normalizeText(
    [
      analysis?.primaryIdentity,
      analysis?.tempo,
      analysis?.tempoDetail?.label,
      analysis?.summaryText,
      analysis?.winCondition?.label,
      analysis?.winCondition?.detail,
      analysis?.coherence?.label,
      analysis?.coherence?.detail,
      ...(analysis?.strengths || []),
      ...(analysis?.weaknesses || []),
      ...(analysis?.synergies || []).map((item) => item?.label),
      ...(analysis?.dependencies?.items || []).map((item) => item?.label),
    ]
      .filter(Boolean)
      .join(' ')
  );
}

function detectPlanMode(analysis = {}) {
  const context = buildContextText(analysis);

  if (containsAny(context, ['splitpush', 'sidelane', 'side lane', 'abrir mapa'])) return 'splitpush';
  if (containsAny(context, ['poke', 'siege'])) return 'poke';
  if (containsAny(context, ['pick', 'dive', 'catch'])) return 'pick';
  if (containsAny(context, ['protect', 'front to back', 'fronttoback', 'peel', 'teamfight', 'wombo', 'frontline'])) return 'frontToBack';
  if (containsAny(context, ['scaling', 'late', 'escala'])) return 'scaling';
  return 'hybrid';
}

function buildPriorityDetail(label, analysis) {
  const normalized = normalizeText(label);

  if (normalized.includes('teamfight') || normalized.includes('5v5')) return 'Convierte la ventaja en pelea ordenada.';
  if (normalized.includes('objetiv') || normalized.includes('objective')) return 'Prioriza dragones, Heraldo o Barón según el momento.';
  if (normalized.includes('pick') || normalized.includes('catch')) return 'Busca visión y castiga errores rápidos.';
  if (normalized.includes('splitpush') || normalized.includes('sidelane')) return 'Abre mapa y obliga respuestas en laterales.';
  if (normalized.includes('poke') || normalized.includes('siege')) return 'Desgasta antes de comprometer la pelea.';

  return analysis?.winCondition?.detail || 'Debe ser una de las primeras decisiones del plan.';
}

function scorePriority(label, analysis, index) {
  const labelText = normalizeText(label);
  const analysisText = buildContextText(analysis);

  let score = 5 - index;
  if (analysisText.includes(labelText)) score += 1;
  if (containsAny(label, analysis?.winCondition?.priorities || [])) score += 1;
  if (analysisText.includes(normalizeText(analysis?.winCondition?.label || ''))) score += 1;
  if (analysisText.includes(normalizeText(analysis?.primaryIdentity || ''))) score += 1;
  return clampNumber(score, 1, 5);
}

function buildPriorities(analysis) {
  const raw = uniqueOrdered(
    toLabels([
      ...(analysis?.winCondition?.priorities || []),
      ...(analysis?.strengths || []).slice(0, 2),
      ...(analysis?.dependencies?.items || []).slice(0, 2).map((item) => item?.label),
      ...(analysis?.synergies || []).slice(0, 1).map((item) => item?.label),
    ])
  ).filter(Boolean);

  const ordered = raw
    .slice(0, 4)
    .map((label, index) => ({
      label,
      score: scorePriority(label, analysis, index),
      detail: buildPriorityDetail(label, analysis),
    }))
    .sort((a, b) => b.score - a.score || compareLabels(a.label, b.label));

  return ordered.length
    ? ordered
    : [
        {
          label: analysis?.primaryIdentity || 'Jugar alrededor de la identidad',
          score: 5,
          detail: 'La composición debe seguir su plan dominante.',
        },
      ];
}

function buildPowerSpikes(analysis, mode) {
  const tempoPhases = new Set((analysis?.tempoDetail?.phases || []).map((phase) => normalizeText(phase)));
  const win = normalizeText(analysis?.winCondition?.label || '');
  const identity = normalizeText(analysis?.primaryIdentity || '');

  const labels = [];
  if (tempoPhases.has('early')) labels.push('Nivel 6');
  if (tempoPhases.has('mid')) labels.push('1 objeto');
  if (tempoPhases.has('late') || containsAny(win, ['escalar', '5v5', 'front to back', 'protect'])) labels.push('2 objetos');
  if (containsAny(win, ['baron', 'objetivo', 'teamfight', 'control']) || containsAny(identity, ['fronttoback', 'teamfight', 'control'])) labels.push('Barón');

  if (mode === 'poke') labels.push('Visión');
  if (mode === 'pick') labels.push('Niebla');
  if (mode === 'splitpush') labels.push('Presión lateral');
  if (mode === 'frontToBack') labels.push('5v5');

  const fallback = ['Nivel 6', '2 objetos', 'Barón'];
  const chosen = uniqueOrdered(labels.length ? labels : fallback).slice(0, 3);

  const details = {
    'Nivel 6': 'La primera ventana fuerte para pelear suele llegar con definitivas.',
    '1 objeto': 'El equipo empieza a pelear con más seguridad cuando se completa el primer pico.',
    '2 objetos': 'El carry y la primera línea ya pueden forzar una pelea real.',
    Barón: 'El cierre natural llega alrededor de la visión y del objetivo grande.',
    Visión: 'El control de visión convierte el poke en una ventaja real.',
    Niebla: 'Las ventanas en niebla son las mejores para cazadas rápidas.',
    'Presión lateral': 'La presión lateral abre el mapa y obliga respuestas.',
    '5v5': 'El 5v5 ordenado es tu mejor contexto para cerrar la partida.',
  };

  return chosen.map((label) => ({
    label,
    detail: details[label] || 'Pico de poder relevante para la composición.',
  }));
}

function buildExecutionProfile(analysis, mode) {
  const metrics = Array.isArray(analysis.metrics) ? analysis.metrics : [];
  const score = (key) => clampNumber(Number(metrics.find((entry) => entry?.key === key)?.score) || 0, 0, 100);
  const average = (keys) => Math.round(keys.reduce((sum, key) => sum + score(key), 0) / Math.max(1, keys.length));
  const context = buildContextText(analysis);
  const conflicts = Array.isArray(analysis?.coherence?.conflicts) ? analysis.coherence.conflicts.length : 0;
  const dependencies = Array.isArray(analysis?.dependencies?.items) ? analysis.dependencies.items.length : 0;

  let coordination = average(['frontline', 'engage', 'control', 'teamfight']);
  let macro = average(['objective', 'control', 'splitpush', 'scaling']);
  let micro = average(['pick', 'mobility', 'damage', 'engage']);
  let vision = average(['control', 'objective', 'pick']);

  if (containsAny(context, ['front to back', 'fronttoback', 'protect', 'peel', 'teamfight', 'wombo', 'frontline'])) {
    coordination += 12;
    macro += 8;
    micro -= 8;
    vision += 8;
  }

  if (containsAny(context, ['poke', 'siege'])) {
    macro += 10;
    vision += 12;
    micro += 3;
  }

  if (containsAny(context, ['splitpush', 'side lane', 'sidelane', 'abrir mapa'])) {
    macro += 12;
    vision += 6;
    coordination -= 4;
  }

  if (containsAny(context, ['pick', 'dive'])) {
    micro += 12;
    vision += 10;
    coordination += 2;
  }

  if (containsAny(context, ['global pressure', 'globalpressure', 'global'])) {
    macro += 8;
    vision += 8;
  }

  if (mode === 'frontToBack') {
    coordination += 6;
    macro += 4;
    micro -= 4;
    vision += 4;
  }

  coordination += Math.min(8, dependencies * 2);
  macro += Math.min(6, dependencies);
  vision += Math.min(6, conflicts * 2);

  const difficulty = clampNumber(Math.round((coordination + macro + micro + vision) / 4 + conflicts * 3), 0, 100);

  return [
    {
      label: 'Coordinación',
      score: clampNumber(Math.round(coordination / 20), 1, 5),
      badge: scoreBand(Math.round(coordination / 20)),
      detail: 'Cuánta sincronía de equipo pide la composición.',
    },
    {
      label: 'Macro',
      score: clampNumber(Math.round(macro / 20), 1, 5),
      badge: scoreBand(Math.round(macro / 20)),
      detail: 'Cuánto depende del mapa, los objetivos y las rotaciones.',
    },
    {
      label: 'Micro',
      score: clampNumber(Math.round(micro / 20), 1, 5),
      badge: scoreBand(Math.round(micro / 20)),
      detail: 'Cuánta precisión individual exige para ejecutarla.',
    },
    {
      label: 'Visión',
      score: clampNumber(Math.round(vision / 20), 1, 5),
      badge: scoreBand(Math.round(vision / 20)),
      detail: 'Cuánta visión necesitas para jugar sin castigo.',
    },
    {
      label: 'Dificultad',
      score: clampNumber(Math.round(difficulty / 20), 1, 5),
      badge: scoreBand(Math.round(difficulty / 20)),
      detail: 'Qué difícil es convertir el plan en una victoria.',
    },
  ];
}

function buildRiskItems(analysis) {
  const items = uniqueOrdered([
    ...(analysis?.weaknesses || []),
    ...(analysis?.winCondition?.avoid || []),
    ...(analysis?.coherence?.conflicts || []).map((item) => item?.label || item),
    ...(analysis?.dependencies?.items || [])
      .filter((item) => item?.status && item.status !== 'Activo')
      .map((item) => `${item.status}: ${item.label}`),
  ]).filter(Boolean);

  const detailMap = {
    splitpush: 'Divide la presión y enfría el 5v5.',
    poke: 'Te obliga a gastar vida y recursos antes de empezar.',
    engage: 'Una mala entrada te deja sin plan.',
    teamfight: 'Si peleas desordenado, pierdes tu condición principal.',
    vision: 'Sin visión el pick pierde valor.',
    frontline: 'Falta espacio para que el carry pegue.',
    peel: 'El carry queda expuesto demasiado pronto.',
    late: 'Forzar antes del pico de poder te castiga.',
    early: 'La partida puede volverse incómoda si no ganas tiempo.',
  };

  return items.slice(0, 3).map((label) => {
    const normalized = normalizeText(label);
    const detail = Object.entries(detailMap).find(([key]) => normalized.includes(key))?.[1] || 'Puede romper el plan principal.';
    return { label, detail };
  });
}

function buildInsights(analysis, priorities, powerSpikes, mode) {
  const insights = [];
  const win = normalizeText(analysis?.winCondition?.label || '');

  if (mode === 'frontToBack' || containsAny(win, ['escalar', 'front to back', 'protect', 'teamfight', '5v5'])) {
    insights.push({ label: 'Escalas mejor que la rival', detail: 'Tu composición gana valor con el tiempo y la pelea ordenada.' });
  } else if (mode === 'pick' || containsAny(win, ['pick', 'dive'])) {
    insights.push({ label: 'Busca picks cortos', detail: 'Las ventanas breves valen más que las peleas largas.' });
  } else if (mode === 'poke' || containsAny(win, ['poke', 'siege'])) {
    insights.push({ label: 'Desgasta antes de entrar', detail: 'Tu rango debe abrir la pelea y no cerrarla a ciegas.' });
  } else if (mode === 'splitpush' || containsAny(win, ['splitpush'])) {
    insights.push({ label: 'Abre el mapa', detail: 'La presión lateral es tu mejor salida.' });
  } else {
    insights.push({ label: analysis?.primaryIdentity || 'Juega tu identidad', detail: 'Sigue el plan dominante de la composición.' });
  }

  if (priorities[0]) insights.push({ label: `Prioridad: ${priorities[0].label}`, detail: priorities[0].detail || 'Debe ejecutarse primero.' });
  if (powerSpikes[0]) insights.push({ label: `Power spike: ${powerSpikes[0].label}`, detail: powerSpikes[0].detail || 'Es una ventana para pelear.' });

  return uniqueByLabel(insights);
}

function buildAlerts(risks) {
  return uniqueByLabel(
    risks.slice(0, 3).map((risk) => ({
      label: risk.label,
      detail: risk.detail || 'Puede romper el plan principal.',
    }))
  );
}

function buildPhases(analysis, priorities, powerSpikes, mode) {
  const plan = Array.isArray(analysis?.gamePlan) ? analysis.gamePlan : [];
  const avoid = Array.isArray(analysis?.winCondition?.avoid) ? analysis.winCondition.avoid : [];
  const risks = buildRiskItems(analysis);
  const primaryRisk = risks[0]?.label || avoid[0] || 'Sin riesgo claro';
  const secondaryRisk = risks[1]?.label || avoid[1] || 'Sin riesgo secundario';

  const templates = {
    frontToBack: {
      early: ['Escala sin regalar ventajas', 'Protege recursos y evita peleas largas.', ['No fuerces el primer dragón sin prioridad', plan[0], priorities[0]?.label, powerSpikes[0]?.label]],
      mid: ['Agrúpate y fuerza objetivos', 'Es el momento de controlar espacio y jugar alrededor del objetivo clave.', ['Busca el segundo dragón', plan[1], priorities[1]?.label, powerSpikes[1]?.label]],
      late: ['Juega el 5v5 limpio', 'Protege al carry y fuerza peleas limpias.', ['Prioriza Nashor o Barón', plan[2], priorities[2]?.label, powerSpikes[2]?.label]],
    },
    poke: {
      early: ['Desgasta y toma visión', 'Prioriza visión de río y poke seguro.', ['No comprometas la entrada', plan[0], priorities[0]?.label, powerSpikes[0]?.label]],
      mid: ['Convierte poke en objetivo', 'Tu ventana real está en convertir desgaste en torre, dragón o heraldo.', ['Convierte el daño en objetivo', plan[1], priorities[1]?.label, powerSpikes[1]?.label]],
      late: ['No entres sin ventaja', 'Usa el daño previo para evitar entradas malas y cerrar sin regalar el tempo.', ['Evita engages frontales', plan[2], priorities[2]?.label, powerSpikes[2]?.label]],
    },
    pick: {
      early: ['Busca ventanas cortas', 'Juega alrededor de niebla y castiga errores rápidos.', ['Busca visión profunda', plan[0], priorities[0]?.label, powerSpikes[0]?.label]],
      mid: ['Encadena picks y objetivos', 'La visión ya debe producir picks y acabar en objetivos.', ['Convierte la cazada en objetivo', plan[1], priorities[1]?.label, powerSpikes[1]?.label]],
      late: ['No alargues la pelea', 'No necesitas una pelea larga; necesitas una ejecución limpia.', ['Cierra antes de que se reagrupe', plan[2], priorities[2]?.label, powerSpikes[2]?.label]],
    },
    splitpush: {
      early: ['Gana tempo en laterales', 'Abre el mapa y fuerza respuestas tempranas.', ['Asegura presión lateral', plan[0], priorities[0]?.label, powerSpikes[0]?.label]],
      mid: ['Convierte presión en mapa', 'Obliga al rival a responder en más de una línea.', ['Castiga rotaciones', plan[1], priorities[1]?.label, powerSpikes[1]?.label]],
      late: ['Cierra por presión lateral', 'Sigue abriendo el mapa y castiga las respuestas tarde.', ['Evita 5v5 innecesarios', plan[2], priorities[2]?.label, powerSpikes[2]?.label]],
    },
    scaling: {
      early: ['Gana tiempo', 'No regales peleas largas ni ventajas gratis.', ['Protege recursos', plan[0], priorities[0]?.label, powerSpikes[0]?.label]],
      mid: ['Convierte tu pico en presión', 'Sostén el plan principal y prepara el objetivo clave.', ['Llega primero al objetivo', plan[1], priorities[1]?.label, powerSpikes[1]?.label]],
      late: ['Cierra con calma y orden', 'Tu ventaja aparece aquí: agrúpate y no improvises.', ['Juega alrededor del carry', plan[2], priorities[2]?.label, powerSpikes[2]?.label]],
    },
    hybrid: {
      early: ['Asegura la base', 'Gana tiempo, evita desventajas gratis y prepara la composición.', [primaryRisk, plan[0], priorities[0]?.label, powerSpikes[0]?.label]],
      mid: ['Transforma la ventaja', 'Convierte el mapa en una ventaja concreta y repetible.', [secondaryRisk, plan[1], priorities[1]?.label, powerSpikes[1]?.label]],
      late: ['Ejecuta la condición de victoria', 'Haz que todo el trabajo previo termine en una pelea clara o un cierre.', [plan[2], priorities[2]?.label, powerSpikes[2]?.label]],
    },
  };

  const t = templates[mode] || templates.hybrid;

  return [
    { phase: 'EARLY (0–10)', title: t.early[0], detail: t.early[1], actions: uniqueOrdered(t.early[2].filter(Boolean)).slice(0, 3) },
    { phase: 'MID (10–20)', title: t.mid[0], detail: t.mid[1], actions: uniqueOrdered(t.mid[2].filter(Boolean)).slice(0, 3) },
    { phase: 'LATE (20+)', title: t.late[0], detail: t.late[1], actions: uniqueOrdered(t.late[2].filter(Boolean)).slice(0, 3) },
  ];
}

function buildBriefing(analysis, priorities, powerSpikes, risks, mode) {
  const firstPriority = priorities[0]?.label || analysis?.winCondition?.label || analysis?.primaryIdentity || 'Juega tu identidad';
  const firstSpike = powerSpikes[0]?.label || 'mid game';
  const firstRisk = risks[0]?.label || 'Sin riesgo claro';

  const templates = {
    frontToBack: `Protege al carry, fuerza 5v5 ordenado y no regales peleas largas antes de ${firstSpike.toLowerCase()}.`,
    poke: 'Desgasta desde rango, asegura visión y convierte el poke en objetivo antes de comprometer la pelea.',
    pick: 'Juega en niebla, castiga ventanas cortas y transforma cada pick en un objetivo rápido.',
    splitpush: 'Abre el mapa, fuerza respuestas laterales y evita 5v5 innecesarios.',
    scaling: 'Gana tiempo, evita peleas largas y cierra cuando lleguen tus picos.',
    hybrid: 'Juega tu identidad, prioriza visión y convierte la primera ventaja real en objetivo.',
  };

  return clampWords(`${templates[mode] || templates.hybrid} Prioridad: ${firstPriority}. Riesgo a vigilar: ${firstRisk}.`, 26);
}

function buildStrategicPlan(analysis, mode, priorities, powerSpikes, phases, risks, briefing) {
  const primaryObjective = priorities[0]?.label || analysis?.winCondition?.label || analysis?.primaryIdentity || 'Juega tu identidad';
  const secondaryObjective = priorities[1]?.label || phases[1]?.title || 'Prepara el segundo pico';
  const objectivePriority = priorities.slice(0, 3).map((item, index) => ({
    label: item.label,
    detail: item.detail,
    rank: index + 1,
  }));

  const planMap = {
    frontToBack: {
      tempo: 'Mid Game',
      mapFocus: 'Objetivos y 5v5',
      fightStyle: 'Peleas ordenadas',
      carryPlan: 'Protege al carry y juega en torno al backline.',
      visionPlan: 'Visión de río y entrada limpia.',
    },
    poke: {
      tempo: 'Mid Game',
      mapFocus: 'Asedio y visión',
      fightStyle: 'Desgaste',
      carryPlan: 'Aprovecha rango y evita engages directos.',
      visionPlan: 'Asegura visión para convertir poke en objetivo.',
    },
    pick: {
      tempo: 'Early-Mid',
      mapFocus: 'Niebla y cazadas',
      fightStyle: 'Ventanas cortas',
      carryPlan: 'Castiga errores y cierra rápido.',
      visionPlan: 'Visión profunda y control de niebla.',
    },
    splitpush: {
      tempo: 'Mid Game',
      mapFocus: 'Laterales y rotaciones',
      fightStyle: 'Presión lateral',
      carryPlan: 'Abre mapa y fuerza respuestas.',
      visionPlan: 'Controla visión lateral y flancos.',
    },
    scaling: {
      tempo: 'Late Game',
      mapFocus: 'Escalado y objetivos',
      fightStyle: '5v5 limpio',
      carryPlan: 'Llega a pico y cierra ordenado.',
      visionPlan: 'Evita pérdidas y prepara visión.',
    },
    hybrid: {
      tempo: 'Mid Game',
      mapFocus: 'Identidad dominante',
      fightStyle: 'Flexible',
      carryPlan: 'Juega la condición más clara.',
      visionPlan: 'Asegura visión en el lado fuerte.',
    },
  };

  const base = planMap[mode] || planMap.hybrid;
  const failConditions = uniqueByLabel(risks.map((risk) => ({ label: risk.label, detail: risk.detail }))).map((item, index) => ({
    label: item.label,
    detail: item.detail,
    rank: index + 1,
  }));

  return {
    mode,
    briefing,
    primaryObjective,
    secondaryObjective,
    tempo: base.tempo,
    mapFocus: base.mapFocus,
    fightStyle: base.fightStyle,
    carryPlan: base.carryPlan,
    visionPlan: base.visionPlan,
    objectivePriority,
    failConditions,
    powerSpike: powerSpikes[0]?.label || 'Sin pico claro',
    risk: risks[0]?.label || 'Sin riesgo claro',
    phaseGuide: phases,
    keySignals: uniqueOrdered([base.mapFocus, base.fightStyle, base.carryPlan, base.visionPlan, powerSpikes[0]?.label]).filter(Boolean),
  };
}

function buildSummary(analysis, strategicPlan) {
  return {
    identity: analysis?.primaryIdentity || 'Sin definir',
    priority: strategicPlan.primaryObjective,
    risk: strategicPlan.risk,
    powerSpike: strategicPlan.powerSpike,
    mode: strategicPlan.mode,
    briefing: strategicPlan.briefing,
    reason: clampWords(analysis?.summaryText || analysis?.coherence?.detail || 'La composición sigue su identidad.', 12),
  };
}

function summarizeHeadline(priorities, phases, analysis) {
  const parts = [priorities[0]?.label || analysis?.primaryIdentity || 'Jugar alrededor de la identidad'];
  if (phases[0]?.detail) parts.push(phases[0].detail);
  if (analysis?.coherence?.label) parts.push(analysis.coherence.label);
  return parts.join(' · ');
}

export function buildCoach(analysis = {}, selectedChampions = []) {
  const mode = detectPlanMode(analysis);
  const priorities = buildPriorities(analysis, selectedChampions);
  const powerSpikes = buildPowerSpikes(analysis, mode);
  const phases = buildPhases(analysis, priorities, powerSpikes, mode);
  const risks = buildRiskItems(analysis);
  const insights = buildInsights(analysis, priorities, powerSpikes, mode);
  const alerts = buildAlerts(risks);
  const briefing = buildBriefing(analysis, priorities, powerSpikes, risks, mode);
  const executionProfile = buildExecutionProfile(analysis, mode);
  const strategicPlan = buildStrategicPlan(analysis, mode, priorities, powerSpikes, phases, risks, briefing);
  const summary = buildSummary(analysis, strategicPlan);

  return {
    mode,
    headline: summarizeHeadline(priorities, phases, analysis),
    briefing,
    summary,
    insights,
    alerts,
    priorities,
    powerSpikes,
    phases,
    risks,
    executionProfile,
    strategicPlan,
  };
}
