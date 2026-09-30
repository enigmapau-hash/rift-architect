import { normalizeText } from './utils.js';
import { buildNeeds, summarizeNeeds } from './needEngine.js';
import { buildStrategicProfiles } from './strategicProfiles.js';

function summarizeProfiles(profiles) {
  if (!profiles.length) return 'No hay un perfil dominante todavía.';
  return `Perfiles detectados: ${profiles.slice(0, 3).map((item) => item.label.toLowerCase()).join(' · ')}.`;
}

function findProfileForNeed(need, strategicProfiles = []) {
  return strategicProfiles.find((profile) => {
    if (profile.primaryNeedKey === need.key) return true;
    return Array.isArray(profile.relatedNeeds) && profile.relatedNeeds.some((relatedNeed) => normalizeText(relatedNeed) === normalizeText(need.label));
  });
}

function buildPickRecommendations(needs, strategicPlan, strategicProfiles = []) {
  const mode = normalizeText(strategicPlan?.mode || 'hybrid');

  const buckets = needs.slice(0, 4).map((need) => {
    const profile = findProfileForNeed(need, strategicProfiles);
    return {
      key: need.key,
      label: need.label,
      detail: `Busca un perfil que cubra ${need.label.toLowerCase()} y se adapte a ${profile?.label || strategicPlan?.fightStyle || 'tu plan'}.`,
      priority: need.priority,
      profileLabel: profile?.label || need.label,
      classTags: Array.isArray(profile?.classes) ? profile.classes.slice(0, 3) : [],
      confidence: profile?.confidence || Math.min(95, 50 + need.score * 10),
      confidenceLabel: profile?.confidenceLabel || (need.priority === 'critical' ? 'Alta' : need.priority === 'important' ? 'Media' : 'Baja'),
    };
  });

  if (!buckets.length) {
    return [
      {
        key: 'flex',
        label: 'Pick flexible',
        detail: 'La composición no muestra una carencia evidente y puede priorizar flexibilidad.',
        priority: 'minor',
        profileLabel: 'Flexible',
        classTags: ['Flexible', 'Adaptive', 'Utility'],
        confidence: 45,
        confidenceLabel: 'Media',
      },
    ];
  }

  return buckets.map((item) => ({
    ...item,
    mode,
    action: `Completar ${item.label.toLowerCase()}`,
  }));
}

function buildBanRecommendations(needs, strategicPlan, strategicProfiles = []) {
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

  const recommendations = needs.slice(0, 4).map((need) => {
    const profile = findProfileForNeed(need, strategicProfiles);
    return {
      key: need.key,
      label: need.label,
      detail: banMap[need.key] || 'Amenazas que castiguen el plan principal de la composición.',
      priority: need.priority,
      profileLabel: profile?.label || need.label,
      classTags: Array.isArray(profile?.classes) ? profile.classes.slice(0, 3) : [],
      focus: focus || 'plan general',
    };
  });

  if (!recommendations.length) {
    recommendations.push({
      key: 'generic',
      label: 'Ban flexible',
      detail: 'No hay una amenaza dominante clara; prioriza el counter más incómodo para tu plan.',
      priority: 'minor',
      profileLabel: 'Flexible',
      classTags: ['Utility', 'Adaptive', 'Reactive'],
      focus: focus || 'plan general',
    });
  }

  return recommendations;
}

export function buildDraftAssistant(analysis = {}) {
  const strategicPlan = analysis?.strategicPlan || analysis?.plan || {};
  const compositionNeeds = buildNeeds(analysis, strategicPlan);
  const strategicProfiles = buildStrategicProfiles(compositionNeeds, strategicPlan);

  return {
    summary: summarizeNeeds(compositionNeeds),
    profileSummary: summarizeProfiles(strategicProfiles),
    compositionNeeds,
    strategicProfiles,
    priorities: compositionNeeds.slice(0, 4).map((item) => ({
      key: item.key,
      label: item.label,
      detail: item.detail,
      impact: item.impact,
      priority: item.priority,
    })),
    pickRecommendations: buildPickRecommendations(compositionNeeds, strategicPlan, strategicProfiles),
    banRecommendations: buildBanRecommendations(compositionNeeds, strategicPlan, strategicProfiles),
  };
}
