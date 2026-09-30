const DEFAULT_WINDOW = 'Mid Game';

function uniqueValues(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function clampWords(text, maxWords = 12) {
  const words = String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);

  return words.slice(0, maxWords).join(' ');
}

function normalizeText(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function containsAny(text, terms = []) {
  const normalized = normalizeText(text);
  return terms.some((term) => normalized.includes(normalizeText(term)));
}

function scoreMetric(metrics, key) {
  if (!Array.isArray(metrics)) return 0;
  const metric = metrics.find((entry) => entry?.key === key);
  return clamp(Number(metric?.score) || 0, 0, 100);
}

function scoreToFive(score) {
  return clamp(Math.round(score / 20), 1, 5);
}

function scoreBand(score) {
  if (score >= 4) return 'Muy alta';
  if (score === 3) return 'Alta';
  if (score === 2) return 'Media';
  return 'Baja';
}

function buildDraftProfile(analysis = {}) {
  const metrics = Array.isArray(analysis.metrics) ? analysis.metrics : [];
  const score = (key) => scoreMetric(metrics, key);
  const average = (keys) => Math.round(keys.reduce((sum, key) => sum + score(key), 0) / Math.max(1, keys.length));
  const label = (value) => {
    if (value >= 75) return 'Muy fuerte';
    if (value >= 55) return 'Aceptable';
    return 'Débil';
  };

  return [
    {
      label: 'Teamfight',
      score: average(['frontline', 'engage', 'control', 'teamfight']),
      text: analysis?.winCondition?.label || 'Luchas agrupadas y controladas.',
    },
    {
      label: 'Engage',
      score: average(['engage', 'pick', 'mobility']),
      text: 'Capacidad para iniciar y forzar.',
    },
    {
      label: 'Scaling',
      score: average(['scaling', 'damage']),
      text: analysis?.tempoDetail?.label || DEFAULT_WINDOW,
    },
    {
      label: 'Poke',
      score: average(['poke', 'control']),
      text: 'Desgaste a distancia antes de entrar.',
    },
    {
      label: 'Split Push',
      score: score('splitpush'),
      text: 'Capacidad para abrir mapa y laterales.',
    },
  ].map((item) => ({
    ...item,
    badge: label(item.score),
  }));
}

function buildExecutionProfile(analysis = {}) {
  const metrics = Array.isArray(analysis.metrics) ? analysis.metrics : [];
  const score = (key) => scoreMetric(metrics, key);
  const average = (keys) => Math.round(keys.reduce((sum, key) => sum + score(key), 0) / Math.max(1, keys.length));
  const context = normalizeText(
    [
      analysis?.primaryIdentity,
      analysis?.winCondition?.label,
      analysis?.winCondition?.detail,
      analysis?.summaryText,
      analysis?.tempoDetail?.label,
      analysis?.tempoDetail?.detail,
    ]
      .filter(Boolean)
      .join(' ')
  );
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

  coordination += Math.min(8, dependencies * 2);
  macro += Math.min(6, dependencies);
  vision += Math.min(6, conflicts * 2);

  const difficulty = clamp(Math.round((coordination + macro + micro + vision) / 4 + conflicts * 3), 0, 100);

  return [
    {
      label: 'Coordinación',
      score: scoreToFive(coordination),
      badge: scoreBand(scoreToFive(coordination)),
      detail: 'Cuánta sincronía de equipo pide la composición.',
    },
    {
      label: 'Macro',
      score: scoreToFive(macro),
      badge: scoreBand(scoreToFive(macro)),
      detail: 'Cuánto depende del mapa, los objetivos y las rotaciones.',
    },
    {
      label: 'Micro',
      score: scoreToFive(micro),
      badge: scoreBand(scoreToFive(micro)),
      detail: 'Cuánta precisión individual exige para ejecutarla.',
    },
    {
      label: 'Visión',
      score: scoreToFive(vision),
      badge: scoreBand(scoreToFive(vision)),
      detail: 'Cuánta visión necesitas para jugar sin castigo.',
    },
    {
      label: 'Dificultad',
      score: scoreToFive(difficulty),
      badge: scoreBand(scoreToFive(difficulty)),
      detail: 'Qué difícil es convertir el plan en una victoria.',
    },
  ];
}

function buildCriticalErrors(analysis = {}) {
  const items = uniqueValues([
    ...(Array.isArray(analysis?.winCondition?.avoid) ? analysis.winCondition.avoid : []),
    ...(Array.isArray(analysis?.weaknesses) ? analysis.weaknesses : []),
    ...(Array.isArray(analysis?.coherence?.conflicts) ? analysis.coherence.conflicts.map((item) => item?.label || item) : []),
    ...(Array.isArray(analysis?.dependencies?.items)
      ? analysis.dependencies.items
          .filter((item) => item?.status && item.status !== 'Activo')
          .map((item) => `${item.status}: ${item.label}`)
      : []),
  ]).filter(Boolean);

  const toLabel = (label) => {
    const normalized = normalizeText(label);
    if (normalized.includes('splitpush') || normalized.includes('sidelane') || normalized.includes('sidelane')) return 'No dividas el mapa';
    if (normalized.includes('poke') || normalized.includes('siege')) return 'No te expongas antes de entrar';
    if (normalized.includes('engage') || normalized.includes('dive')) return 'No fuerces una mala entrada';
    if (normalized.includes('teamfight') || normalized.includes('5v5')) return 'No pelees desordenado';
    if (normalized.includes('vision')) return 'No juegues sin visión';
    if (normalized.includes('frontline')) return 'No rompas tu frontline';
    if (normalized.includes('peel')) return 'No expongas al carry';
    if (normalized.includes('late')) return 'No fuerces antes del pico';
    if (normalized.includes('early')) return 'No alargues la fase temprana';
    if (normalized.includes('control')) return 'No te quedes sin tempo';
    return `No ${String(label).trim()}`;
  };

  const toDetail = (label) => {
    const normalized = normalizeText(label);
    if (normalized.includes('splitpush')) return 'La composición pierde su historia principal si la separas en dos frentes.';
    if (normalized.includes('poke') || normalized.includes('siege')) return 'El draft necesita desgastar antes de comprometer la pelea.';
    if (normalized.includes('engage') || normalized.includes('dive')) return 'Una entrada mala suele dejarte sin follow-up ni recurso de salida.';
    if (normalized.includes('teamfight')) return 'La ventaja desaparece si la pelea no se ordena alrededor del carry.';
    if (normalized.includes('vision')) return 'Sin visión, el plan pierde valor y regalas la ventana de castigo.';
    if (normalized.includes('frontline')) return 'Si la primera línea cae pronto, el backline queda demasiado expuesto.';
    if (normalized.includes('peel')) return 'El carry necesita protección constante para rendir de verdad.';
    if (normalized.includes('late')) return 'Forzar antes de tu pico convierte el draft en una versión peor de sí mismo.';
    if (normalized.includes('early')) return 'Si no ganas tiempo, el rival te desplaza el plan de partida.';
    return 'Puede romper el plan principal.';
  };

  return items.slice(0, 3).map((label) => ({
    label: toLabel(label),
    detail: toDetail(label),
  }));
}

function buildChecklist(analysis = {}) {
  const context = normalizeText(
    [analysis?.winCondition?.label, analysis?.primaryIdentity, analysis?.summaryText]
      .filter(Boolean)
      .join(' ')
  );

  if (containsAny(context, ['splitpush', 'abrir mapa', 'side lane', 'sidelane'])) {
    return [
      { label: 'Presiona laterales', detail: 'Abre el mapa con intención y fuerza respuestas.' },
      { label: 'Evita 5v5 innecesarios', detail: 'Tu valor real aparece al estirar la partida.' },
      { label: 'Controla la visión lateral', detail: 'Sin visión, la presión pierde valor.' },
      { label: 'Fuerza rotaciones', detail: 'Obliga al rival a responder fuera de posición.' },
    ];
  }

  if (containsAny(context, ['poke', 'siege'])) {
    return [
      { label: 'Desgasta antes de entrar', detail: 'Tu daño gana valor antes del compromiso final.' },
      { label: 'Asegura visión', detail: 'La visión convierte el rango en una ventaja real.' },
      { label: 'No regales la entrada', detail: 'Si entras mal, pierdes la pelea y el tempo.' },
      { label: 'Convierte rango en objetivo', detail: 'Tras el poke, busca torre, dragón o heraldo.' },
    ];
  }

  if (containsAny(context, ['pick', 'dive'])) {
    return [
      { label: 'Busca niebla', detail: 'Sin visión, el pick pierde valor.' },
      { label: 'Castiga ventanas cortas', detail: 'La composición funciona mejor en acciones rápidas.' },
      { label: 'No alargues la pelea', detail: 'Si se alarga, pierdes la ventaja de tu ventana.' },
      { label: 'Ejecuta rápido', detail: 'La coordinación debe ser limpia y decisiva.' },
    ];
  }

  if (containsAny(context, ['protect', 'front to back', 'fronttoback', 'teamfight', 'wombo'])) {
    return [
      { label: 'Agrúpate antes de pelear', detail: 'La composición gana orden y no caos.' },
      { label: 'Protege al carry', detail: 'Tu daño real depende de mantenerlo vivo.' },
      { label: 'Guarda peel y engage', detail: 'No gastes tus herramientas antes del objetivo.' },
      { label: 'Busca 5v5 ordenado', detail: 'Tu ventana de poder aparece en peleas limpias.' },
    ];
  }

  return [
    { label: 'Juega tu identidad', detail: 'No fuerces un plan que contradiga la composición.' },
    { label: 'Asegura visión', detail: 'La información correcta evita errores caros.' },
    { label: 'Prioriza objetivos', detail: 'Convierte cualquier ventaja en oro estructural.' },
    { label: 'No improvises', detail: 'La ejecución simple suele ser la correcta.' },
  ];
}

function buildPriorityChips(analysis = {}) {
  const windowLabel = analysis?.tempoDetail?.label || DEFAULT_WINDOW;
  return uniqueValues([
    analysis?.winCondition?.label,
    analysis?.coherence?.label,
    `Pico: ${windowLabel}`,
    analysis?.primaryIdentity,
  ]).slice(0, 4);
}

export function buildExecutiveSummary(analysis = {}) {
  const confidence = clamp(Number(analysis?.confidence) || 0, 0, 100);
  const executionProfile = buildExecutionProfile(analysis);
  const executionTag = (label) => {
    const item = executionProfile.find((entry) => normalizeText(entry.label) === normalizeText(label));
    return item ? `${item.label}: ${item.badge}` : null;
  };
  const title = `${analysis?.primaryIdentity || 'Draft'} · ${analysis?.winCondition?.label || 'Plan claro'}`;
  const text = clampWords(
    [
      analysis?.winCondition?.detail || analysis?.summaryText || 'Tu composición sigue su identidad principal.',
      `Objetivo: ${analysis?.winCondition?.label || analysis?.primaryIdentity || 'jugar a tu plan'}.`,
      `Pico de poder: ${analysis?.tempoDetail?.label || DEFAULT_WINDOW}.`,
    ].join(' '),
    24
  );

  return {
    title,
    text,
    grade: gradeFromScore(confidence),
    badge: labelFromScore(confidence),
    score: confidence,
    tags: uniqueValues([
      executionTag('Coordinación'),
      executionTag('Macro'),
      executionTag('Visión'),
      executionTag('Dificultad'),
    ]).slice(0, 4),
    profile: buildDraftProfile(analysis),
    priorities: buildPriorityChips(analysis),
    executionProfile,
    criticalErrors: buildCriticalErrors(analysis),
    checklist: buildChecklist(analysis),
  };
}
