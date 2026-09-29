import { normalizeText } from './utils.js';

export function buildGamePlan(primaryIdentity, tempo, strengths = [], weaknesses = []) {
  const identity = normalizeText(primaryIdentity);
  const tempoText = normalizeText(tempo);
  const strengthSet = new Set(strengths.map((item) => normalizeText(item)));
  const weaknessSet = new Set(weaknesses.map((item) => normalizeText(item)));

  let plan = ['Agruparse', 'Objetivos', 'Jugar alrededor de la identidad'];

  if (identity.includes('fronttoback') || identity.includes('teamfight') || identity.includes('control')) {
    plan = ['Agruparse', 'Objetivos', '5v5'];
  } else if (identity.includes('poke') || identity.includes('siege')) {
    plan = ['Zona', 'Asedio', 'Castigar'];
  } else if (identity.includes('splitpush')) {
    plan = ['Side lanes', 'Presión', 'Evitar 5v5'];
  } else if (identity.includes('engage') || identity.includes('pick') || identity.includes('dive')) {
    plan = ['Visión', 'Cazar', 'Forzar peleas'];
  } else if (identity.includes('protect')) {
    plan = ['Proteger carry', 'Peel', 'Mantener zonas'];
  }

  if (tempoText.includes('late') && !plan.some((item) => normalizeText(item).includes('escalar'))) {
    plan[0] = 'Escalar';
  }

  if (tempoText.includes('early') && (identity.includes('engage') || identity.includes('pick'))) {
    plan[0] = 'Presión temprana';
  }

  if (strengthSet.has(normalizeText('Objective Control')) && !plan.some((item) => normalizeText(item).includes('objetiv'))) {
    plan[1] = 'Objetivos';
  }

  if (weaknessSet.has(normalizeText('Splitpush')) && !plan.some((item) => normalizeText(item).includes('split'))) {
    plan[2] = 'Evitar splitpush';
  }

  return [...new Set(plan)].slice(0, 3);
}
