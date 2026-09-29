import { normalizeText } from './utils.js';

function toLabels(values = []) {
  return values
    .map((value) => (typeof value === 'string' ? value : value?.label))
    .filter(Boolean);
}

function setFirst(plan, label) {
  if (!label) return plan;
  plan[0] = label;
  return plan;
}

export function buildGamePlan(primaryIdentity, tempo, strengths = [], weaknesses = []) {
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
    plan = setFirst(plan, 'Presión temprana');
  } else if (tempoText.includes('mid') && !plan[0]) {
    plan = setFirst(plan, 'Tempo medio');
  } else if (tempoText.includes('late')) {
    plan = setFirst(plan, 'Escalar');
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
