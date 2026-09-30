import { clampNumber, compareLabels, normalizeText, uniqueOrdered } from './utils.js';

const NEED_ORDER = [
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

const NEED_LABELS = {
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

const NEED_DETAILS = {
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

function buildNeeds(analysis, strategicPlan) {
  return NEED_ORDER.map((key, index) => {
    const score = scoreNeed(key, analysis, strategicPlan);
    return {
      key,
      label: NEED_LABELS[key],
      detail: NEED_DETAILS[key],
      score,
      priority: score >= 4 ? 'critical' : score >= 2 ? 'important' : 'minor',
      rank: index + 1,
    };
  })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || compareLabels(a.label, b.label));
}

function summarizeNeeds(needs) {
  if (!needs.length) return 'La composición está razonablemente balanceada para su plan dominante.';

  const top = needs.slice(0, 3).map((item) => item.label.toLowerCase());
  return `Necesita reforzar ${top.join(', ')} para ejecutar mejor su plan.`;
}

function buildPickRecommendations(needs, strategicPlan) {
  const mode = normalizeText(strategicPlan?.mode || 'hybrid');

  const buckets = needs.slice(0, 4).map((need) => ({
    key: need.key,
    label: need.label,
    detail: `Busca un pick que cubra ${need.label.toLowerCase()} y se adapte a ${strategicPlan?.fightStyle || 'tu plan'}.\`,
    priority: need.priority,
  }));

  if (!buckets.length) {
    return [
      {
        key: 'flex',
        label: 'Pick flexible',
        detail: 'La composición no muestra una carencia evidente y puede priorizar flexibilidad.',
        priority: 'minor',
      },
    ];
  }

  return buckets.map((item) => ({
    ...item,
    mode,
    action: `Completar ${item.label.toLowerCase()}`,
  }));
}

function buildBanRecommendations(needs, strategicPlan) {
  const focus = normalizeText([strategicPlan?.fightStyle, strategicPlan?.mapFocus, strategicPlan?.carryPlan].filter(Boolean).join(' '));

  const banMap = {
    frontline: 'Campeones que rompen la frontline o eliminan tanques demasiado rápido.',
    engage: 'Campeones que niegan la entrada o castigan engages predecibles.',
    damage: 'Composiciones que aguantan demasiado y te dejan sin cierre.',
    scaling: 'Rivales que escalan mejor y te obligan a cerrar tarde.',
    objective: 'Campeones que pelean muy bien en objetivos y niegan el tempo.',
    control: 'Composiciones con demasiado control de zona o visión.',
    teamfight: 'Campeones que desordenan el 5v5 o te ganan el front-to-back.',
    poke: 'Rivales que desgastan más y te sacan de la zona de confort.',
    mobility: 'Campeones muy móviles que evitan tu presión o rompen rotaciones.',
    pick: 'Amenazas de niebla que castigan cada error corto.',
    splitpush: 'Opciones que te obligan a defender laterales sin poder responder.',
  };

  const recommendations = needs.slice(0, 4).map((need) => ({
    key: need.key,
    label: need.label,
    detail: banMap[need.key] || 'Amenazas que castiguen el plan principal de la composición.',
    priority: need.priority,
  }));

  if (!recommendations.length) {
    recommendations.push({
      key: 'generic',
      label: 'Ban flexible',
      detail: 'No hay una amenaza dominante clara; prioriza el counter más incómodo para tu plan.',
      priority: 'minor',
    });
  }

  return recommendations.map((item) => ({
    ...item,
    focus: focus || 'plan general',
  }));
}

export function buildDraftAssistant(analysis = {}) {
  const strategicPlan = analysis?.strategicPlan || analysis?.plan || {};
  const compositionNeeds = buildNeeds(analysis, strategicPlan);

  return {
    summary: summarizeNeeds(compositionNeeds),
    compositionNeeds,
    priorities: compositionNeeds.slice(0, 4).map((item) => ({
      key: item.key,
      label: item.label,
      detail: item.detail,
      priority: item.priority,
    })),
    pickRecommendations: buildPickRecommendations(compositionNeeds, strategicPlan),
    banRecommendations: buildBanRecommendations(compositionNeeds, strategicPlan),
  };
}
