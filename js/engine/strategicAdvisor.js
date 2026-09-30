import { clampNumber, compareLabels, getLabelText, normalizeText, uniqueOrdered } from './utils.js';

function toLabels(values = []) {
  return values
    .map((value) => getLabelText(value))
    .filter(Boolean);
}

function toText(values = []) {
  return values.filter(Boolean).join(' ');
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

function buildObjectivePriority(analysis) {
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
    .map((label, index) => {
      const normalized = normalizeText(label);
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
      if (analysisText.includes(normalized)) score += 1;
      if (containsAny(label, analysis?.winCondition?.priorities || [])) score += 1;
      if (analysisText.includes(normalizeText(analysis?.winCondition?.label || ''))) score += 1;
      if (analysisText.includes(normalizeText(analysis?.primaryIdentity || ''))) score += 1;

      return {
        label,
        score: clampNumber(score, 1, 5),
        detail: buildPriorityDetail(label, analysis),
      };
    })
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

function buildGameWindows(analysis) {
  const tempoPhases = new Set((analysis?.tempoDetail?.phases || []).map((phase) => normalizeText(phase)));
  const win = normalizeText(analysis?.winCondition?.label || '');
  const identity = normalizeText(analysis?.primaryIdentity || '');

  const early = {
    label: 'Early',
    score: clampNumber(tempoPhases.has('early') || containsAny(win, ['pick', 'dive']) ? 5 : 2, 1, 5),
    detail: containsAny(win, ['escalar', 'late'])
      ? 'Gana tiempo y evita peleas largas.'
      : containsAny(win, ['pick', 'dive'])
        ? 'Busca visión y ventanas cortas.'
        : 'Juega alrededor de tu identidad sin forzar.',
  };

  const mid = {
    label: 'Mid',
    score: clampNumber(tempoPhases.has('mid') || containsAny(win, ['teamfight', 'objective']) ? 5 : 3, 1, 5),
    detail: containsAny(win, ['pick'])
      ? 'Transforma visión en picks.'
      : containsAny(win, ['teamfight', '5v5'])
        ? 'Agrúpate y prepara la pelea clave.'
        : 'Convierte la ventaja en objetivos y control.',
  };

  const late = {
    label: 'Late',
    score: clampNumber(tempoPhases.has('late') || containsAny(win, ['escalar', 'protect', 'front to back', 'teamfight', '5v5']) || containsAny(identity, ['fronttoback', 'teamfight', 'control']) ? 5 : 3, 1, 5),
    detail: containsAny(win, ['splitpush'])
      ? 'Presiona laterales y obliga respuestas.'
      : containsAny(win, ['poke', 'siege'])
        ? 'Convierte el rango en torres u objetivos.'
        : 'Cierra con carry protegido y pelea ordenada.',
  };

  return { early, mid, late };
}

function buildLoseConditions(analysis) {
  const risks = uniqueOrdered([
    ...(analysis?.weaknesses || []),
    ...(analysis?.winCondition?.avoid || []),
    ...(analysis?.coherence?.conflicts || []).map((item) => item?.label),
    ...(analysis?.dependencies?.items || [])
      .filter((item) => item?.status && item.status !== 'Activo')
      .map((item) => `${item.status}: ${item.label}`),
  ]).filter(Boolean);

  const detailMap = {
    splitpush: 'Divides la presión y enfrías el 5v5.',
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

function buildSummary(analysis, objectivePriority, gameWindows, loseConditions) {
  const priority = objectivePriority[0]?.label || analysis?.winCondition?.label || 'Jugar alrededor de la identidad';
  const risk = loseConditions[0]?.label || 'Sin riesgo claro';
  const powerSpike = containsAny(analysis?.summaryText || '', ['late']) ? '2 objetos' : (gameWindows.late.score >= 4 ? 'Barón' : '2 objetos');

  return {
    identity: analysis?.primaryIdentity || 'Sin definir',
    priority,
    risk,
    powerSpike,
    reason: clampWords(analysis?.summaryText || analysis?.coherence?.detail || 'La composición sigue su identidad.', 12),
  };
}

export function buildStrategicAdvisor(analysis = {}, selectedChampions = []) {
  const objectivePriority = buildObjectivePriority(analysis, selectedChampions);
  const gameWindows = buildGameWindows(analysis, selectedChampions);
  const loseConditions = buildLoseConditions(analysis, selectedChampions);
  const summary = buildSummary(analysis, objectivePriority, gameWindows, loseConditions);

  return {
    primaryObjective: objectivePriority[0]?.label || analysis?.winCondition?.label || analysis?.primaryIdentity || 'Jugar alrededor de la identidad',
    objectivePriority,
    gameWindows,
    loseConditions,
    summary,
  };
}
