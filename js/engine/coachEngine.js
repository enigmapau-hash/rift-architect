import { clampNumber, compareLabels, getLabelText, normalizeText, uniqueOrdered } from './utils.js';

function toLabels(values = []) {
  return values
    .map((value) => getLabelText(value))
    .filter(Boolean);
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

function buildPriorityDetail(label, analysis) {
  const normalized = normalizeText(label);

  if (normalized.includes('teamfight') || normalized.includes('5v5')) {
    return 'Convierte la ventaja en pelea ordenada.';
  }

  if (normalized.includes('objetiv') || normalized.includes('objective')) {
    return 'Prioriza dragones, Heraldo o Barón según el momento.';
  }

  if (normalized.includes('pick') || normalized.includes('catch')) {
    return 'Busca visión y castiga errores rápidos.';
  }

  if (normalized.includes('splitpush') || normalized.includes('sidelane')) {
    return 'Abre mapa y obliga respuestas en laterales.';
  }

  if (normalized.includes('poke') || normalized.includes('siege')) {
    return 'Desgasta antes de comprometer la pelea.';
  }

  return analysis?.winCondition?.detail || 'Debe ser una de las primeras decisiones del plan.';
}

function scorePriority(label, analysis, index) {
  const labelText = normalizeText(label);
  const analysisText = normalizeText(
    [
      analysis?.summaryText,
      analysis?.primaryIdentity,
      analysis?.tempo,
      analysis?.tempoDetail?.label,
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

  if (ordered.length) return ordered;

  return [
    {
      label: analysis?.primaryIdentity || 'Jugar alrededor de la identidad',
      score: 5,
      detail: 'La composición debe seguir su plan dominante.',
    },
  ];
}

function buildPowerSpikes(analysis) {
  const tempoPhases = new Set((analysis?.tempoDetail?.phases || []).map((phase) => normalizeText(phase)));
  const win = normalizeText(analysis?.winCondition?.label || '');
  const identity = normalizeText(analysis?.primaryIdentity || '');

  const labels = [];
  if (tempoPhases.has('early')) labels.push('Nivel 6');
  if (tempoPhases.has('mid')) labels.push('1 objeto');
  if (tempoPhases.has('late') || containsAny(win, ['escalar', '5v5', 'front to back', 'protect'])) labels.push('2 objetos');
  if (containsAny(win, ['baron', 'objetivo', 'teamfight', 'control']) || containsAny(identity, ['fronttoback', 'teamfight', 'control'])) {
    labels.push('Barón');
  }

  const fallback = ['Nivel 6', '2 objetos', 'Barón'];
  const chosen = uniqueOrdered(labels.length ? labels : fallback).slice(0, 3);

  const details = {
    'Nivel 6': 'La primera ventana fuerte para pelear suele llegar con definitivas.',
    '1 objeto': 'El equipo empieza a pelear con más seguridad cuando se completa el primer pico.',
    '2 objetos': 'El carry y la primera línea ya pueden forzar una pelea real.',
    'Barón': 'El cierre natural llega alrededor de la visión y del objetivo grande.',
  };

  return chosen.map((label) => ({
    label,
    detail: details[label] || 'Pico de poder relevante para la composición.',
  }));
}

function buildPhase(label, detail, actions = []) {
  return {
    label,
    detail,
    actions: uniqueOrdered(actions.filter(Boolean)).slice(0, 3),
  };
}

function buildPhases(analysis, priorities, powerSpikes) {
  const tempo = normalizeText(analysis?.tempoDetail?.label || analysis?.tempo || '');
  const win = normalizeText(analysis?.winCondition?.label || '');
  const plan = Array.isArray(analysis?.gamePlan) ? analysis.gamePlan : [];
  const avoid = Array.isArray(analysis?.winCondition?.avoid) ? analysis.winCondition.avoid : [];

  const earlyDetail = containsAny(win, ['escalar', 'late'])
    ? 'Gana tiempo y no regales peleas largas.'
    : containsAny(win, ['pick', 'dive'])
      ? 'Busca visión y ventanas cortas para castigar.'
      : containsAny(win, ['poke', 'siege'])
        ? 'Desgasta sin comprometerte.'
        : containsAny(win, ['splitpush'])
          ? 'Abre mapa y ocupa laterales.'
          : 'Juega alrededor de tu identidad sin forzar.';

  const midDetail = containsAny(tempo, ['mid'])
    ? 'Convierte la ventaja en objetivos y control de visión.'
    : containsAny(win, ['pick'])
      ? 'Haz que la visión se transforme en picks.'
      : containsAny(win, ['teamfight', '5v5'])
        ? 'Agrúpate y prepara la pelea clave.'
        : 'Sostén el plan principal con orden.';

  const lateDetail = containsAny(win, ['escalar', 'protect', 'front to back', 'teamfight', '5v5'])
    ? 'Cierra con carry protegido y pelea ordenada.'
    : containsAny(win, ['splitpush'])
      ? 'Presiona laterales y obliga respuestas.'
      : containsAny(win, ['poke', 'siege'])
        ? 'Convierte el rango en torres u objetivos.'
        : 'Usa tu condición de victoria para cerrar la partida.';

  return [
    buildPhase('Early', earlyDetail, [plan[0], priorities[0]?.label, avoid[0], powerSpikes[0]?.label]),
    buildPhase('Mid Game', midDetail, [plan[1], priorities[1]?.label, 'Control de visión', powerSpikes[1]?.label]),
    buildPhase('Late Game', lateDetail, [plan[2], priorities[2]?.label, 'Cerrar partida', powerSpikes[2]?.label]),
  ];
}

function buildRisks(analysis) {
  const risks = uniqueOrdered([
    ...(analysis?.weaknesses || []),
    ...(analysis?.winCondition?.avoid || []),
    ...(analysis?.coherence?.conflicts || []).map((item) => item?.label),
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

  return risks.slice(0, 3).map((label) => {
    const normalized = normalizeText(label);
    const detail = Object.entries(detailMap).find(([key]) => normalized.includes(key))?.[1] || 'Puede romper el plan principal.';
    return { label, detail };
  });
}

function buildInsights(analysis, priorities, powerSpikes) {
  const insights = [];
  const win = normalizeText(analysis?.winCondition?.label || '');

  if (containsAny(win, ['escalar', 'front to back', 'protect', 'teamfight', '5v5'])) {
    insights.push({
      label: 'Escalas mejor que la rival',
      detail: 'Tu composición gana valor con el tiempo y la pelea ordenada.',
    });
  } else if (containsAny(win, ['pick', 'dive'])) {
    insights.push({
      label: 'Busca picks cortos',
      detail: 'Las ventanas breves valen más que las peleas largas.',
    });
  } else if (containsAny(win, ['poke', 'siege'])) {
    insights.push({
      label: 'Desgasta antes de entrar',
      detail: 'Tu rango debe abrir la pelea y no cerrarla a ciegas.',
    });
  } else if (containsAny(win, ['splitpush'])) {
    insights.push({
      label: 'Abre el mapa',
      detail: 'La presión lateral es tu mejor salida.',
    });
  } else {
    insights.push({
      label: analysis?.primaryIdentity || 'Juega tu identidad',
      detail: 'Sigue el plan dominante de la composición.',
    });
  }

  if (priorities[0]) {
    insights.push({
      label: `Prioridad: ${priorities[0].label}`,
      detail: priorities[0].detail || 'Debe ejecutarse primero.',
    });
  }

  if (powerSpikes[0]) {
    insights.push({
      label: `Power spike: ${powerSpikes[0].label}`,
      detail: powerSpikes[0].detail || 'Es una ventana para pelear.',
    });
  }

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

function buildSummary(analysis, priorities, powerSpikes, risks) {
  const priority = priorities[0]?.label || analysis?.winCondition?.label || 'Jugar alrededor de la identidad';
  const risk = risks[0]?.label || 'Sin riesgo claro';
  const powerSpike = powerSpikes[0]?.label || 'Sin pico claro';

  return {
    identity: analysis?.primaryIdentity || 'Sin definir',
    priority,
    risk,
    powerSpike,
    reason: clampWords(
      analysis?.summaryText || analysis?.coherence?.detail || 'La composición sigue su identidad.',
      12
    ),
  };
}

function summarizeHeadline(priorities, phases, analysis) {
  const parts = [priorities[0]?.label || analysis?.primaryIdentity || 'Jugar alrededor de la identidad'];

  if (phases[0]?.detail) parts.push(phases[0].detail);
  if (analysis?.coherence?.label) parts.push(analysis.coherence.label);

  return parts.join(' · ');
}

export function buildCoach(analysis = {}, selectedChampions = []) {
  const priorities = buildPriorities(analysis, selectedChampions);
  const powerSpikes = buildPowerSpikes(analysis, selectedChampions);
  const phases = buildPhases(analysis, priorities, powerSpikes);
  const risks = buildRisks(analysis, selectedChampions);
  const insights = buildInsights(analysis, priorities, powerSpikes);
  const alerts = buildAlerts(risks);
  const summary = buildSummary(analysis, priorities, powerSpikes, risks);

  return {
    headline: summarizeHeadline(priorities, phases, analysis),
    summary,
    insights,
    alerts,
    priorities,
    powerSpikes,
    phases,
    risks,
  };
}
