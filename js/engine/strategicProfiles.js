import { clampNumber, compareLabels, normalizeText } from './utils.js';

const STRATEGIC_PROFILE_FAMILIES = [
  {
    key: 'initiator',
    needKeys: ['frontline', 'engage'],
    label: 'Iniciador fiable',
    classes: ['Vanguard Tank', 'Engage Support', 'Bruiser Engage'],
    detail: 'Necesitas una forma consistente de empezar peleas y convertir espacio en objetivos.',
    signals: ['front to back', 'protect', 'peel', 'frontline', 'wombo', '5v5', 'engage', 'dive'],
  },
  {
    key: 'anchor',
    needKeys: ['damage', 'scaling'],
    label: 'Ancla de daño',
    classes: ['Scaling ADC', 'Control Mage', 'Carry Bruiser'],
    detail: 'Te asegura daño suficiente para cerrar peleas largas y llegar a late.',
    signals: ['damage', 'scaling', 'carry', 'late'],
  },
  {
    key: 'objectiveControl',
    needKeys: ['objective', 'control'],
    label: 'Control de objetivos',
    classes: ['Objective Controller', 'Zone Support', 'Priority Jungler'],
    detail: 'Convierte la ventaja en dragones, Heraldo y Barón.',
    signals: ['objective', 'baron', 'dragon', 'dragones', 'heraldo', 'vision', 'space', 'zona'],
  },
  {
    key: 'teamfightCore',
    needKeys: ['teamfight'],
    label: 'Core de teamfight',
    classes: ['Front-to-back Core', 'Teamfight Support', 'Wombo Core'],
    detail: 'Hace fiable el 5v5 y la ejecución agrupada.',
    signals: ['teamfight', '5v5', 'front to back', 'protect'],
  },
  {
    key: 'siege',
    needKeys: ['poke'],
    label: 'Asedio / poke',
    classes: ['Siege Mage', 'Poke Support', 'Long-range ADC'],
    detail: 'Desgasta antes de comprometer la pelea.',
    signals: ['poke', 'siege', 'asedio'],
  },
  {
    key: 'tempo',
    needKeys: ['mobility'],
    label: 'Pieza de tempo',
    classes: ['Skirmish Jungler', 'Rotate Tempo', 'Side-lane Rotator'],
    detail: 'Acelera entradas, salidas y rotaciones.',
    signals: ['mobility', 'rotations', 'side lane', 'sidelane'],
  },
  {
    key: 'catch',
    needKeys: ['pick'],
    label: 'Cazador de ventanas',
    classes: ['Catch Support', 'Pick Jungler', 'Assassin'],
    detail: 'Castiga errores cortos y ventanas en niebla.',
    signals: ['pick', 'catch', 'niebla', 'fog'],
  },
  {
    key: 'pressure',
    needKeys: ['splitpush'],
    label: 'Presión lateral',
    classes: ['Side-lane Threat', '1-3-1', 'Pressure Bruiser'],
    detail: 'Abre mapa y fuerza respuestas laterales.',
    signals: ['splitpush', 'side lane', 'sidelane', 'abrir mapa'],
  },
];

function containsAny(text, terms = []) {
  const normalized = normalizeText(text);
  return terms.some((term) => normalized.includes(normalizeText(term)));
}

function planText(plan = {}) {
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

function confidenceBand(score) {
  if (score >= 85) return 'Muy alta';
  if (score >= 70) return 'Alta';
  if (score >= 55) return 'Media';
  return 'Baja';
}

function buildMatchedNeeds(family, needs = []) {
  return family.needKeys
    .map((key) => needs.find((need) => need?.key === key))
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || compareLabels(a.label, b.label));
}

function buildFamilyConfidence(matchedNeeds, family, planContext) {
  const primaryNeed = matchedNeeds[0];
  if (!primaryNeed) return 0;

  const base = Number(primaryNeed.score || 0) * 16;
  const countBoost = Math.min(12, Math.max(0, matchedNeeds.length - 1) * 6);
  const planBoost = containsAny(planContext, family.signals) ? 12 : 0;
  return clampNumber(Math.round(base + countBoost + planBoost), 35, 98);
}

function buildWhy(matchedNeeds, strategicPlan, family) {
  const needsText = matchedNeeds.slice(0, 2).map((need) => need.label.toLowerCase()).join(' y ');
  const fightStyle = String(strategicPlan?.fightStyle || 'tu plan').toLowerCase();

  if (!needsText) {
    return `Encaja con ${fightStyle} y cubre una necesidad flexible.`;
  }

  return `Se apoya en ${needsText} y encaja con ${fightStyle}.`;
}

function buildFallbackProfile() {
  return [
    {
      key: 'flex',
      label: 'Perfil flexible',
      detail: 'La composición puede adaptarse sin forzar una especialización concreta.',
      classes: ['Flexible', 'Adaptive', 'Utility'],
      confidence: 45,
      confidenceLabel: 'Media',
      primaryNeedKey: 'flex',
      priority: 'minor',
      relatedNeeds: [],
      why: 'No hay una carencia dominante clara.',
      impact: 'El plan conserva margen para adaptarse.',
      rank: 1,
    },
  ];
}

export function buildStrategicProfiles(needs = [], strategicPlan = {}) {
  const planContext = planText(strategicPlan);
  const profiles = STRATEGIC_PROFILE_FAMILIES.map((family) => {
    const matchedNeeds = buildMatchedNeeds(family, needs);
    if (!matchedNeeds.length) return null;

    const primaryNeed = matchedNeeds[0];
    const confidence = buildFamilyConfidence(matchedNeeds, family, planContext);

    return {
      key: family.key,
      label: family.label,
      detail: family.detail,
      classes: family.classes,
      confidence,
      confidenceLabel: confidenceBand(confidence),
      primaryNeedKey: primaryNeed.key,
      priority: primaryNeed.priority,
      relatedNeeds: matchedNeeds.map((need) => need.label),
      why: buildWhy(matchedNeeds, strategicPlan, family),
      impact: primaryNeed.impact || '',
      rank: primaryNeed.rank,
    };
  })
    .filter(Boolean)
    .sort((a, b) => b.confidence - a.confidence || compareLabels(a.label, b.label))
    .slice(0, 4);

  return profiles.length ? profiles : buildFallbackProfile();
}
