import { clampNumber, normalizeText, uniqueOrdered } from './utils.js';

function toLabels(values = []) {
  return values
    .map((value) => (typeof value === 'string' ? value : value?.label))
    .filter(Boolean);
}

function toText(values = []) {
  return values.filter(Boolean).join(' ');
}

function containsAny(text, terms = []) {
  const normalized = normalizeText(text);
  return terms.some((term) => normalized.includes(normalizeText(term)));
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
  const raw = uniqueOrdered([
    ...(analysis?.winCondition?.priorities || []),
    ...(analysis?.strengths || []).slice(0, 2),
    ...(analysis?.dependencies?.items || []).slice(0, 2).map((item) => item?.label),
    ...(analysis?.synergies || []).slice(0, 1).map((item) => item?.label),
  ]).filter(Boolean);

  const ordered = raw
    .slice(0, 4)
    .map((label, index) => ({
      label,
      score: scorePriority(label, analysis, index),
      detail: buildPriorityDetail(label, analysis),
    }))
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label, 'es'));

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

  return {
    headline: summarizeHeadline(priorities, phases, analysis),
    priorities,
    powerSpikes,
    phases,
    risks,
  };
}
