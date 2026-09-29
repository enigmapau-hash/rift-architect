import { normalizeText, uniqueOrdered } from './utils.js';

function toLabels(values = []) {
  return values
    .map((value) => (typeof value === 'string' ? value : value?.label))
    .filter(Boolean);
}

function addItem(plan, label) {
  const value = typeof label === 'string' ? label.trim() : '';
  if (!value) return;
  plan.push(value);
}

function buildLegacyPlan(primaryIdentity, tempo, strengths = [], weaknesses = []) {
  const identity = normalizeText(primaryIdentity);
  const tempoText = normalizeText(typeof tempo === 'string' ? tempo : tempo?.label || tempo?.tempo || '');
  const strengthLabels = toLabels(strengths);
  const weaknessLabels = toLabels(weaknesses);
  const strengthSet = new Set(strengthLabels.map((item) => normalizeText(item)));
  const weaknessSet = new Set(weaknessLabels.map((item) => normalizeText(item)));

  let plan = ['Agruparse', 'Objetivos', 'Jugar alrededor de la identidad'];

  if (identity.includes('fronttoback') || identity.includes('teamfight') || identity.includes('control') || identity.includes('protect')) {
    plan = ['Agruparse', '5v5', 'Proteger carry'];
  } else if (identity.includes('poke') || identity.includes('siege')) {
    plan = ['Visión', 'Asedio', 'Castigar'];
  } else if (identity.includes('splitpush')) {
    plan = ['Side lanes', 'Presión lateral', 'Evitar 5v5'];
  } else if (identity.includes('engage') || identity.includes('pick') || identity.includes('dive')) {
    plan = ['Visión', 'Cazar', 'Forzar peleas cortas'];
  } else if (identity.includes('skirmish')) {
    plan = ['Visión', 'Rotaciones', 'Peleas cortas'];
  }

  if (tempoText.includes('early')) {
    plan[0] = 'Presión temprana';
  } else if (tempoText.includes('mid') && !plan[0]) {
    plan[0] = 'Tempo medio';
  } else if (tempoText.includes('late')) {
    plan[0] = 'Escalar';
  }

  if (strengthSet.has(normalizeText('Objective')) || strengthSet.has(normalizeText('Objetivos'))) {
    plan[1] = 'Objetivos';
  }

  if (strengthSet.has(normalizeText('Teamfight'))) {
    plan[1] = plan[1] === 'Objetivos' ? 'Objetivos / 5v5' : '5v5';
  }

  if (weaknessSet.has(normalizeText('Splitpush'))) {
    plan[2] = 'Evitar splitpush';
  } else if (weaknessSet.has(normalizeText('Poke'))) {
    plan[2] = 'Evitar asedio largo';
  } else if (weaknessSet.has(normalizeText('Poca frontline'))) {
    plan[2] = 'Proteger carry';
  }

  return [...new Set(plan)].filter(Boolean).slice(0, 3);
}

function buildModernPlan(winCondition, strengths = [], weaknesses = [], tempoSummary = null, synergies = [], coherence = null) {
  const plan = [];
  const priorities = Array.isArray(winCondition?.priorities) ? winCondition.priorities : [];
  const avoid = Array.isArray(winCondition?.avoid) ? winCondition.avoid : [];
  const tempoText = normalizeText(typeof tempoSummary === 'object' ? tempoSummary?.label : tempoSummary);
  const strengthSet = new Set(toLabels(strengths).map((item) => normalizeText(item)));
  const weaknessSet = new Set(toLabels(weaknesses).map((item) => normalizeText(item)));

  priorities.forEach((item) => addItem(plan, item));

  if (tempoText.includes('late')) {
    addItem(plan, 'Escalar');
  }

  if (tempoText.includes('early') && normalizeText(winCondition?.label).includes('ventaja')) {
    addItem(plan, 'Presión temprana');
  }

  if (strengthSet.has(normalizeText('Objective Control'))) {
    addItem(plan, 'Objetivos');
  }

  if (synergies.some((item) => normalizeText(item?.label || '').includes('presionglobal'))) {
    addItem(plan, 'Presión global');
  }

  if (coherence?.label === 'Dispersa') {
    addItem(plan, 'Unificar el plan');
  }

  if (weaknessSet.has(normalizeText('Splitpush'))) {
    addItem(plan, 'Evitar splitpush');
  }

  if (weaknessSet.has(normalizeText('Poke'))) {
    addItem(plan, 'Evitar trades largos');
  }

  avoid.slice(0, 2).forEach((item) => addItem(plan, item));

  return uniqueOrdered(plan).slice(0, 3);
}

export function buildGamePlan(winConditionOrIdentity, strengths = [], weaknesses = [], tempoSummary = null, synergies = [], coherence = null) {
  if (winConditionOrIdentity && typeof winConditionOrIdentity === 'object' && !Array.isArray(winConditionOrIdentity)) {
    return buildModernPlan(winConditionOrIdentity, strengths, weaknesses, tempoSummary, synergies, coherence);
  }

  return buildLegacyPlan(winConditionOrIdentity, strengths, weaknesses, tempoSummary);
}
