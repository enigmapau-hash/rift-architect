import { clampNumber, compareLabels, normalizeText } from './utils.js';

export const NEED_ORDER = [
  'frontline',
  'engage',
  'damage',
  'scaling',
  'objective',
  'control',
  'teamfight',
  'poke',
  'mobility',
  'pick',
  'splitpush',
];

export const NEED_LABELS = {
  frontline: 'Frontline',
  engage: 'Engage',
  damage: 'Daño',
  scaling: 'Escalado',
  objective: 'Objetivos',
  control: 'Control',
  teamfight: 'Teamfight',
  poke: 'Poke',
  mobility: 'Movilidad',
  pick: 'Pick',
  splitpush: 'Splitpush',
};

export const NEED_DETAILS = {
  frontline: 'Hace falta una primera línea que permita pelear sin desorden.',
  engage: 'La composición necesita una iniciación más fiable.',
  damage: 'Falta un perfil de daño que cierre peleas o objetivos.',
  scaling: 'El draft debe asegurar mejor su ventana de poder final.',
  objective: 'Conviene traducir la ventaja en dragones, Heraldo o Barón.',
  control: 'Hace falta más control de espacio, visión o zona.',
  teamfight: 'El 5v5 debe quedar más claro y más fácil de ejecutar.',
  poke: 'La composición se beneficia de más desgaste a distancia.',
  mobility: 'Necesita mejor entrada, salida o rotación lateral.',
  pick: 'Le falta castigo a errores cortos y ventanas en niebla.',
  splitpush: 'Puede abrir más el mapa y forzar respuestas laterales.',
};

function containsAny(text, terms = []) {
  const normalized = normalizeText(text);
  return terms.some((term) => normalized.includes(normalizeText(term)));
}

function textFromPlan(plan = {}) {
  return normalizeText(
    [
      plan?.mode,
      plan?.briefing,
      plan?.primaryObjective,
      plan?.secondaryObjective,
      plan?.tempo,
      plan?.mapFocus,
      plan?.fightStyle,
      plan?.carryPlan,
      plan?.visionPlan,
      ...(Array.isArray(plan?.objectivePriority) ? plan.objectivePriority.map((item) => item?.label) : []),
      ...(Array.isArray(plan?.failConditions) ? plan.failConditions.map((item) => item?.label) : []),
      ...(Array.isArray(plan?.keySignals) ? plan.keySignals : []),
    ]
      .filter(Boolean)
      .join(' ')
  );
}

function buildNeedImpact(need = {}, strategicPlan = {}) {
  const style = String(strategicPlan?.fightStyle || 'tu plan').toLowerCase();
  const focus = String(strategicPlan?.mapFocus || 'los objetivos').toLowerCase();

  const impacts = {
    frontline: `Sin frontline, ${style} pierde espacio para ejecutarse.`,
    engage: 'Te costará iniciar peleas y asegurar objetivos.',
    damage: 'No tendrás cierre claro en peleas largas o Barón.',
    scaling: 'El plan se queda corto en late game.',
    objective: `Convertir ventaja en ${focus} será más difícil.`,
    control: 'Perderás espacio y visión en los puntos clave.',
    teamfight: 'El 5v5 se volverá más caótico y menos fiable.',
    poke: 'No podrás desgastar al rival antes del engage.',
    mobility: 'Rotar y reposicionarte costará más.',
    pick: 'No castigarás errores cortos ni niebla.',
    splitpush: 'No abrirás mapa ni forzarás respuestas laterales.',
  };

  return impacts[need.key] || 'El plan detectado quedará más débil.';
}

function scoreNeed(key, analysis, strategicPlan) {
  const context = textFromPlan(strategicPlan);
  const summary = normalizeText(
    [analysis?.primaryIdentity, analysis?.winCondition?.label, analysis?.winCondition?.detail, analysis?.summaryText]
      .filter(Boolean)
      .join(' ')
  );

  let score = 0;

  if (context.includes(key) || summary.includes(key)) score += 2;
  if (context.includes(normalizeText(NEED_LABELS[key] || key))) score += 1;

  if (key === 'frontline' && containsAny(context, ['front to back', 'protect', 'peel', 'frontline', 'wombo', '5v5'])) score += 3;
  if (key === 'engage' && containsAny(context, ['engage', 'dive', 'pick', 'catch'])) score += 3;
  if (key === 'damage' && containsAny(context, ['damage', 'scaling', 'carry'])) score += 3;
  if (key === 'scaling' && containsAny(context, ['scaling', 'late', 'escala'])) score += 3;
  if (key === 'objective' && containsAny(context, ['objective', 'baron', 'dragon', 'dragones', 'heraldo'])) score += 3;
  if (key === 'control' && containsAny(context, ['control', 'vision', 'space', 'zona'])) score += 3;
  if (key === 'teamfight' && containsAny(context, ['teamfight', '5v5', 'front to back', 'protect'])) score += 3;
  if (key === 'poke' && containsAny(context, ['poke', 'siege', 'asedio'])) score += 3;
  if (key === 'mobility' && containsAny(context, ['mobility', 'rotations', 'rotacion', 'side lane', 'sidelane'])) score += 3;
  if (key === 'pick' && containsAny(context, ['pick', 'catch', 'niebla', 'fog'])) score += 3;
  if (key === 'splitpush' && containsAny(context, ['splitpush', 'side lane', 'sidelane', 'abrir mapa'])) score += 3;

  return clampNumber(score, 0, 5);
}

export function buildNeeds(analysis, strategicPlan) {
  return NEED_ORDER.map((key, index) => {
    const score = scoreNeed(key, analysis, strategicPlan);
    return {
      key,
      label: NEED_LABELS[key],
      detail: NEED_DETAILS[key],
      impact: buildNeedImpact({ key }, strategicPlan),
      score,
      priority: score >= 4 ? 'critical' : score >= 2 ? 'important' : 'minor',
      rank: index + 1,
    };
  })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || compareLabels(a.label, b.label));
}

export function summarizeNeeds(needs) {
  if (!needs.length) return 'La composición está razonablemente balanceada para su plan dominante.';

  const top = needs.slice(0, 3).map((item) => item.label.toLowerCase());
  return `Necesita reforzar ${top.join(', ')} para ejecutar mejor su plan.`;
}
