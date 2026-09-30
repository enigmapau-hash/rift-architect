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

function toLabel(value, fallback = '') {
  if (value == null) return fallback;
  if (typeof value === 'string') return value.trim() || fallback;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    return value.map((item) => toLabel(item, '')).filter(Boolean).join(' · ') || fallback;
  }
  if (typeof value === 'object') {
    return toLabel(
      value.label ?? value.name ?? value.title ?? value.text ?? value.value ?? value.detail ?? value.summary ?? value.reason ?? value.description ?? value.item ?? '',
      fallback
    );
  }
  return String(value) || fallback;
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

  return result;
}

function gradeFromScore(score) {
  if (score >= 95) return 'A+';
  if (score >= 88) return 'A';
  if (score >= 80) return 'B+';
  if (score >= 72) return 'B';
  if (score >= 64) return 'C+';
  if (score >= 56) return 'C';
  return 'D';
}

function labelFromScore(score) {
  if (score >= 85) return 'Alta confianza';
  if (score >= 70) return 'Confianza media-alta';
  return 'Necesita ajustes';
}

function buildInitiator(selectedChampions = []) {
  const candidates = selectedChampions.map((champion) => {
    const text = [
      champion?.champion,
      champion?.identity,
      champion?.function,
      champion?.tempo,
      ...(Array.isArray(champion?.strengths) ? champion.strengths : []),
      ...(Array.isArray(champion?.weaknesses) ? champion.weaknesses : []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    let score = 0;
    const reasons = [];

    if (containsAny(text, ['engage', 'inici', 'start', 'entry', 'hook', 'pick'])) {
      score += 4;
      reasons.push('tiene herramientas para empezar');
    }
    if (containsAny(text, ['cc', 'stun', 'knock', 'root', 'pull', 'immobil', 'silence'])) {
      score += 3;
      reasons.push('aporta control fiable');
    }
    if (containsAny(text, ['frontline', 'tank', 'bruiser', 'support', 'engage'])) {
      score += 2;
      reasons.push('aguanta la primera línea');
    }
    if (String(champion?.role || '').toLowerCase() === 'support' || String(champion?.role || '').toLowerCase() === 'jungle') {
      score += 1;
      reasons.push('suele marcar el ritmo');
    }

    return {
      champion: champion?.champion || '',
      role: champion?.role || '',
      score,
      reason: reasons.join(' y ') || 'encaja con el plan de pelea',
      why: 'Busco la pieza con más engage, CC y capacidad de entrar sin desordenar la composición.',
    };
  });

  const best = candidates.sort((a, b) => b.score - a.score || a.champion.localeCompare(b.champion, 'es'))[0];
  if (!best || best.score < 3) return null;
  return best;
}

function buildRiskItems(analysis) {
  const items = uniqueValues([
    ...(Array.isArray(analysis?.coach?.alerts) ? analysis.coach.alerts : []).map((item) => item?.label || item),
    ...(Array.isArray(analysis?.advisor?.loseConditions) ? analysis.advisor.loseConditions : []).map((item) => item?.label || item),
    ...(Array.isArray(analysis?.weaknesses) ? analysis.weaknesses : []).map((item) => item?.label || item),
    ...(Array.isArray(analysis?.winCondition?.avoid) ? analysis.winCondition.avoid.map((item) => toLabel(item)) : []),
    ...(Array.isArray(analysis?.coherence?.conflicts) ? analysis.coherence.conflicts.map((item) => item?.label || item) : []),
  ]).filter(Boolean);

  return items.slice(0, 3).map((label) => {
    const normalized = normalizeText(label);
    const detailMap = [
      ['splitpush', 'Divides la presión y enfrías el 5v5.'],
      ['poke', 'Te obliga a gastar vida y recursos antes de empezar.'],
      ['engage', 'Una mala entrada te deja sin plan.'],
      ['teamfight', 'Si peleas desordenado, pierdes tu condición principal.'],
      ['vision', 'Sin visión el pick pierde valor.'],
      ['frontline', 'Falta espacio para que el carry pegue.'],
      ['peel', 'El carry queda expuesto demasiado pronto.'],
      ['late', 'Forzar antes del pico de poder te castiga.'],
      ['early', 'La partida puede volverse incómoda si no ganas tiempo.'],
    ];

    const match = detailMap.find(([key]) => normalized.includes(key));
    return {
      label,
      detail: match?.[1] || 'Puede romper el plan principal.',
    };
  });
}

function buildPhaseRows(analysis) {
  const windows = analysis?.advisor?.gameWindows || {};
  const phaseEntries = [
    ['Early', windows.early],
    ['Mid', windows.mid],
    ['Late', windows.late],
  ];

  const objectivePriority = Array.isArray(analysis?.advisor?.objectivePriority)
    ? analysis.advisor.objectivePriority
    : [];

  return phaseEntries.map(([label, entry], index) => {
    const detail = entry?.detail || entry?.reason || (label === 'Early'
      ? 'Gana tiempo y evita peleas largas.'
      : label === 'Mid'
        ? 'Convierte la ventaja en objetivos y visión.'
        : 'Cierra con carry protegido y pelea ordenada.');

    const actions = uniqueValues([
      ...(Array.isArray(entry?.actions) ? entry.actions : []),
      objectivePriority[index]?.label,
      analysis?.advisor?.primaryObjective,
      analysis?.tempoDetail?.label,
    ]).slice(0, 3);

    return {
      label,
      detail,
      actions,
      score: clamp(Number(entry?.score) || 0, 1, 5),
    };
  });
}

function buildInsightRows(analysis) {
  const fromCoach = uniqueByLabel(
    (Array.isArray(analysis?.coach?.insights) ? analysis.coach.insights : []).map((item) => ({
      label: item?.label,
      detail: item?.detail || 'Señal que refuerza la lectura del motor.',
      score: item?.score,
    }))
  );

  const fromAdvisor = uniqueByLabel(
    (Array.isArray(analysis?.advisor?.objectivePriority) ? analysis.advisor.objectivePriority : []).map((item) => ({
      label: item?.label,
      detail: item?.detail || 'Prioridad del plan.',
      score: item?.score,
    }))
  );

  return [...fromCoach, ...fromAdvisor].slice(0, 3);
}

function buildActionHints(analysis, topPriority, topRisk, initiator, powerSpike) {
  return {
    win: topPriority?.detail || analysis?.advisor?.summary?.reason || 'Cómo convertir el plan en victoria',
    risk: topRisk?.detail || 'Qué castiga más a esta composición',
    init: initiator?.champion ? `${initiator.champion} encaja con la iniciación` : 'Quién abre mejor la pelea',
    priority: topPriority?.detail || analysis?.advisor?.summary?.priority || powerSpike || 'Qué priorizar ahora mismo',
  };
}

function buildResponseVariant(action, context) {
  const { analysis, priorities, risks, initiator, phases, powerSpike } = context;
  const topPriority = priorities[0] || null;
  const topRisk = risks[0] || null;
  const objective = analysis?.advisor?.primaryObjective || topPriority?.label || analysis?.winCondition?.label || analysis?.primaryIdentity || 'Jugar alrededor de la identidad';

  switch (action) {
    case 'risk':
      return {
        title: topRisk?.label || 'Mayor riesgo',
        text: topRisk?.detail || 'Forzar la pelea equivocada te hace perder la ventaja del draft.',
        why: uniqueValues([topRisk?.label, analysis?.advisor?.summary?.risk, analysis?.coherence?.label, analysis?.winCondition?.avoid?.[0]]).join(' · ') || 'El riesgo sale de la coherencia del draft.',
        chips: uniqueValues([topRisk?.label, analysis?.advisor?.summary?.risk, analysis?.coherence?.label, analysis?.winCondition?.avoid?.[0]]).map((label) => ({ label, tone: 'danger' })),
      };

    case 'init':
      return {
        title: initiator?.champion ? `${initiator.champion} debe iniciar` : 'Iniciación por orden',
        text: initiator?.champion ? `${initiator.champion} es tu mejor punto de entrada porque ${initiator.reason}.` : 'La iniciación debe venir del campeón con más engage y control.',
        why: initiator?.why || 'Busco la pieza que mejor abre la pelea sin romper la estructura.',
        chips: uniqueValues([initiator?.champion, initiator?.role, analysis?.primaryIdentity, analysis?.advisor?.summary?.identity]).map((label) => ({ label, tone: 'info' })),
      };

    case 'priority':
      return {
        title: topPriority?.label || objective,
        text: topPriority?.detail || `${objective} es la prioridad inmediata del draft.`,
        why: uniqueValues([topPriority?.label, topPriority?.detail, analysis?.advisor?.summary?.priority, phases[0]?.detail, powerSpike]).join(' · ') || 'La prioridad se ordena por identidad, tempo y ventana de poder.',
        chips: uniqueValues([topPriority?.label, powerSpike, phases[0]?.label, phases[1]?.label]).map((label) => ({ label, tone: 'info' })),
      };

    case 'win':
    default:
      return {
        title: objective,
        text: analysis?.winCondition?.detail || 'Tu composición gana jugando a su identidad principal.',
        why: uniqueValues([analysis?.advisor?.summary?.identity, powerSpike, analysis?.tempoDetail?.label, analysis?.winCondition?.label, analysis?.coach?.summary?.priority, analysis?.coach?.summary?.reason]).join(' · ') || 'La respuesta sale del análisis del motor.',
        chips: uniqueValues([objective, powerSpike, analysis?.tempoDetail?.label, analysis?.coherence?.label]).map((label) => ({ label, tone: 'success' })),
      };
  }
}

function buildSignal(analysis, priorities, risks) {
  const title = analysis?.advisor?.primaryObjective || analysis?.advisor?.summary?.identity || analysis?.primaryIdentity || 'Señal principal';
  const text = analysis?.advisor?.summary?.reason || analysis?.coach?.summary?.reason || analysis?.summaryText || 'La aplicación condensa el análisis en una sola idea fácil de seguir.';
  const chips = uniqueValues([analysis?.advisor?.summary?.powerSpike, analysis?.advisor?.summary?.priority, risks[0]?.label, priorities[0]?.label]).map((label) => ({ label, tone: 'info' }));
  return { title, text, chips };
}

export function buildDecisionFlowBase(analysis = {}, selectedChampions = []) {
  const executive = analysis?.executiveSummary || {};
  const confidence = clamp(Number(analysis?.confidence) || 0, 0, 100);
  const grade = executive.grade || gradeFromScore(confidence);
  const overall = executive.score ?? confidence;
  const badge = executive.badge || labelFromScore(overall);
  const priorities = Array.isArray(executive.priorities) ? executive.priorities : [];
  const risks = buildRiskItems(analysis);
  const phases = buildPhaseRows(analysis);
  const initiator = buildInitiator(selectedChampions);
  const topPriority = priorities[0] || null;
  const topRisk = risks[0] || null;
  const powerSpike = analysis?.advisor?.summary?.powerSpike || analysis?.tempoDetail?.label || DEFAULT_WINDOW;

  const responseVariants = {
    win: buildResponseVariant('win', { analysis, priorities, risks, initiator, phases, powerSpike }),
    risk: buildResponseVariant('risk', { analysis, priorities, risks, initiator, phases, powerSpike }),
    init: buildResponseVariant('init', { analysis, priorities, risks, initiator, phases, powerSpike }),
    priority: buildResponseVariant('priority', { analysis, priorities, risks, initiator, phases, powerSpike }),
  };

  const advisorBase = {
    summary: clampWords(analysis?.advisor?.summary?.reason || analysis?.summaryText || 'La lectura unificada resume identidad, plan y riesgos.', 12),
    badge: 'IA',
    line: clampWords(analysis?.advisor?.summary?.reason || analysis?.summaryText || 'El asesor condensa la decisión principal del draft.', 12),
    text: clampWords(analysis?.advisor?.summary?.reason || analysis?.summaryText || 'El asesor condensa la decisión principal del draft.', 18),
    why: clampWords(analysis?.advisor?.summary?.reason || analysis?.summaryText || 'El razonamiento sale de las prioridades y el tempo.', 22),
    chips: uniqueValues([analysis?.advisor?.summary?.identity, analysis?.advisor?.summary?.priority, analysis?.advisor?.summary?.powerSpike, analysis?.advisor?.summary?.risk]).map((label) => ({
      label,
      tone: 'info',
    })),
    insights: buildInsightRows(analysis),
    actionHints: buildActionHints(analysis, topPriority, topRisk, initiator, powerSpike),
    signal: buildSignal(analysis, priorities, risks),
    responses: responseVariants,
    evidence: uniqueValues([
      analysis?.advisor?.summary?.identity,
      analysis?.advisor?.summary?.priority,
      analysis?.advisor?.summary?.powerSpike,
      analysis?.advisor?.summary?.risk,
      topPriority?.label,
      topRisk?.label,
    ]),
    activeAction: 'win',
    response: responseVariants.win,
  };

  return {
    heroHeadline: analysis?.primaryIdentity || executive.title || 'Tu composición',
    summary: clampWords(executive.text || analysis?.summaryText || analysis?.advisor?.summary?.reason || 'La lectura unificada resume identidad, plan y riesgos.', 14),
    score: {
      grade,
      overall,
      badge,
    },
    verdict: {
      summary: `${grade} · ${analysis?.coherence?.label || 'Lectura clara'}`,
      badge: analysis?.winCondition?.label || 'Veredicto',
      line: clampWords(analysis?.winCondition?.detail || analysis?.summaryText || 'La composición se entiende como una historia visual.', 10),
      text: analysis?.winCondition?.detail || analysis?.summaryText || 'La composición se entiende como una historia visual.',
      metrics: Array.isArray(executive.profile)
        ? executive.profile.map((item) => ({
            label: item.label,
            score: item.score,
            detail: item.text || item.badge || '',
          }))
        : [],
      chips: uniqueValues([analysis?.primaryIdentity, analysis?.winCondition?.label, analysis?.tempoDetail?.label, analysis?.coherence?.label]).slice(0, 3),
      evidence: uniqueValues([analysis?.primaryIdentity, analysis?.coherence?.label, analysis?.winCondition?.label, analysis?.tempoDetail?.label]).slice(0, 4),
    },
    plan: {
      summary: clampWords(topPriority?.label || analysis?.advisor?.primaryObjective || analysis?.winCondition?.label || 'Plan claro', 6),
      badge: topPriority ? 'Juega tu identidad' : 'Plan claro',
      line: clampWords(topPriority?.detail || analysis?.advisor?.summary?.reason || 'El plan debe seguir la identidad principal.', 10),
      text: analysis?.advisor?.summary?.reason || analysis?.summaryText || 'El plan debe seguir la identidad principal.',
      steps: priorities.length ? priorities : [{ label: analysis?.advisor?.primaryObjective || 'Jugar alrededor de la identidad', detail: analysis?.advisor?.summary?.reason || 'La composición debe seguir su plan dominante.' }],
      chips: uniqueValues([topPriority?.label, powerSpike, initiator?.champion, analysis?.primaryIdentity]).slice(0, 3),
      evidence: uniqueValues([topPriority?.label, powerSpike, analysis?.synergies?.[0]?.label, analysis?.dependencies?.items?.[0]?.label]).filter(Boolean).slice(0, 4),
    },
    risks: {
      summary: topRisk?.label || 'Sin riesgo claro',
      badge: risks.length ? 'Vigilar' : 'Sin riesgo',
      line: clampWords(topRisk?.detail || 'No hay una debilidad crítica evidente.', 10),
      text: risks.map((item) => `${item.label}: ${item.detail}`).join(' '),
      items: risks,
      chips: risks.slice(0, 3).map((item) => item.label),
      evidence: uniqueValues([analysis?.weaknesses?.[0]?.label || analysis?.weaknesses?.[0], analysis?.winCondition?.avoid?.[0], analysis?.coherence?.conflicts?.[0]?.label]).filter(Boolean).slice(0, 4),
    },
    timing: {
      summary: `${powerSpike} · ${phases[1]?.label || DEFAULT_WINDOW}`,
      badge: 'Timing',
      line: clampWords(
        analysis?.advisor?.summary?.reason || analysis?.tempoDetail?.detail || 'Tu ventana de poder se concentra en el mid game.',
        10
      ),
      text: analysis?.advisor?.summary?.reason || analysis?.tempoDetail?.detail || 'Tu ventana de poder se concentra en el mid game.',
      windows: phases,
      chips: uniqueValues([phases[0]?.label, phases[1]?.label, phases[2]?.label, powerSpike]).slice(0, 3),
      evidence: uniqueValues([powerSpike, phases[0]?.label, phases[1]?.label, phases[2]?.label]).filter(Boolean).slice(0, 4),
    },
    advisor: advisorBase,
    activeAction: 'win',
  };
}

export function applyDecisionFlowAction(base = {}, activeAction = 'win') {
  const advisor = base?.advisor || {};
  const response = advisor.responses?.[activeAction] || advisor.responses?.win || advisor.response || {
    title: advisor.summary || 'Asesor',
    text: advisor.text || advisor.summary || '',
    why: advisor.why || advisor.line || advisor.summary || '',
    chips: advisor.chips || [],
  };

  return {
    ...base,
    activeAction,
    advisor: {
      ...advisor,
      activeAction,
      response,
    },
  };
}
