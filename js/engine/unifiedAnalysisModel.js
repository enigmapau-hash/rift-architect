import { normalizeText } from './utils.js';
import { buildRecommendationEngine } from './recommendationEngine.js';
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

function confidenceLabel(score = 0) {
  const value = clamp(Number(score) || 0, 0, 100);
  if (value >= 90) return 'Muy alta';
  if (value >= 75) return 'Alta';
  if (value >= 60) return 'Media';
  return 'Baja';
}

function normalizeEvidenceList(items = []) {
  return toArray(items)
    .map((item) => ({
      source: toText(item?.source || item?.label || item?.name || item),
      label: toText(item?.label || item?.title || item?.name || item?.source || item),
      detail: toText(item?.detail || item?.text || item?.summary || item?.description || ''),
      weight: clamp(Math.round(Number(item?.weight) || 0), 0, 100),
      champions: uniqueValues(toArray(item?.champions).map((champion) => toText(champion))).slice(0, 4),
    }))
    .filter((item) => item.label || item.detail || item.source);
}

function normalizeSections(items = []) {
  return toArray(items)
    .map((item) => {
      const confidence = clamp(Math.round(Number(item?.confidence) || Number(item?.score) || Number(item?.weight) || 0), 0, 100);
      return {
        label: toText(item?.label || item?.title || item?.name || item?.source || item),
        detail: toText(item?.detail || item?.text || item?.summary || item?.description || ''),
        confidence,
        confidenceLabel: toText(item?.confidenceLabel || confidenceLabel(confidence)),
        reason: toText(item?.reason || item?.why || ''),
        champions: uniqueValues(toArray(item?.champions).map((champion) => toText(champion))).slice(0, 4),
        evidence: normalizeEvidenceList(item?.evidence || []),
      };
    })
    .filter((item) => item.label || item.detail || item.evidence.length);
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueValues(values = []) {
  return [...new Set(values.filter(Boolean).map((value) => String(value).trim()).filter(Boolean))];
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toText(value, fallback = 'Sin definir') {
  if (value == null) return fallback;
  if (typeof value === 'string') return value.trim() || fallback;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map((item) => toText(item, '')).filter(Boolean).join(' · ') || fallback;
  if (typeof value === 'object') {
    return toText(
      value.label ?? value.name ?? value.title ?? value.text ?? value.value ?? value.detail ?? value.summary ?? value.reason ?? value.description ?? value.champion ?? value.item ?? '',
      fallback
    );
  }
  return String(value) || fallback;
}

export function buildUnifiedAnalysisModel(analysis = {}, selectedChampions = []) {
  const explanation = analysis?.explainability || analysis?.explanation || {};
  const coach = analysis?.coach || {};
  const advisor = analysis?.advisor || {};
  const draftAssistant = analysis?.draftAssistant || {};
  const executiveSummary = analysis?.executiveSummary || {};
  const strategicPlan = analysis?.strategicPlan || analysis?.plan || {};
  const gamePlan = Array.isArray(analysis?.gamePlan) ? analysis.gamePlan : [];
  const priorities = Array.isArray(analysis?.priorities) ? analysis.priorities : [];
  const risks = Array.isArray(analysis?.criticalErrors) ? analysis.criticalErrors : [];
  const checklist = Array.isArray(analysis?.checklist) ? analysis.checklist : [];
  const metrics = Array.isArray(analysis?.metrics) ? analysis.metrics : [];
  const recommendationEngine = draftAssistant?.recommendations?.length
    ? {
        summary: draftAssistant.recommendationSummary || draftAssistant.recommendations[0]?.action || '',
        items: draftAssistant.recommendations,
      }
    : buildRecommendationEngine(analysis);

  const signals = uniqueValues([
    analysis?.primaryIdentity,
    analysis?.tempoDetail?.label,
    analysis?.winCondition?.label,
    analysis?.coherence?.label,
    advisor?.primaryObjective,
    advisor?.summary?.priority,
    coach?.summary?.powerSpike,
  ]).filter(Boolean);

  return {
    meta: {
      engineVersion: analysis?.engineVersion || null,
      confidence: Number(explanation.confidence) || Number(analysis?.confidence) || 0,
      selectedChampions: toArray(selectedChampions).map((champion) => toText(champion?.champion || champion?.displayName || champion?.name || champion)),
    },
    identity: {
      primary: toText(analysis?.primaryIdentity || 'Sin definir'),
      secondary: uniqueValues(toArray(analysis?.secondaryIdentities).map((item) => toText(item))).slice(0, 4),
      dominance: toText(analysis?.dominance || 'hybrid'),
      strengths: toArray(analysis?.strengths).map((item) => toText(item)).filter(Boolean),
      weaknesses: toArray(analysis?.weaknesses).map((item) => toText(item)).filter(Boolean),
      breakdown: toArray(analysis?.identityBreakdown),
    },
    tempo: {
      label: toText(analysis?.tempo || 'Sin definir'),
      detail: analysis?.tempoDetail || {},
      breakdown: toArray(analysis?.tempoBreakdown),
    },
    victory: {
      label: toText(analysis?.winCondition?.label || 'Sin definir'),
      detail: toText(analysis?.winCondition?.detail || ''),
      priorities: uniqueValues(toArray(analysis?.winCondition?.priorities).map((item) => toText(item))).slice(0, 6),
      avoid: uniqueValues(toArray(analysis?.winCondition?.avoid).map((item) => toText(item))).slice(0, 6),
    },
    plan: {
      briefing: toText(strategicPlan?.briefing || analysis?.summaryText || ''),
      mode: toText(strategicPlan?.mode || coach?.summary?.identity || 'hybrid'),
      phases: toArray(coach?.phases).length ? toArray(coach?.phases) : gamePlan,
      steps: toArray(strategicPlan?.steps),
      risks,
    },
    priorities: priorities.map((item) => ({
      label: toText(item?.label || item),
      detail: toText(item?.detail || ''),
      weight: Number(item?.weight) || 0,
      score: Number(item?.score) || 0,
    })),
    risks: risks.map((item) => ({
      label: toText(item?.label || item),
      detail: toText(item?.detail || ''),
    })),
    draft: {
      summary: toText(draftAssistant?.summary || ''),
      profileSummary: toText(draftAssistant?.profileSummary || ''),
      needs: toArray(draftAssistant?.compositionNeeds),
      profiles: toArray(draftAssistant?.strategicProfiles),
      picks: toArray(draftAssistant?.pickRecommendations),
      bans: toArray(draftAssistant?.banRecommendations),
      recommendations: toArray(recommendationEngine?.items),
      recommendationSummary: toText(recommendationEngine?.summary || ''),
    },
    explainability: {
      confidence: Number(explanation.confidence) || Number(analysis?.confidence) || 0,
      summary: normalizeSections(explanation.summary || []),
      identity: explanation.identity || null,
      tempo: explanation.tempo || null,
      coherence: explanation.coherence || null,
      winCondition: explanation.winCondition || null,
      synergies: normalizeSections(explanation.synergies || []),
      dependencies: normalizeSections(explanation.dependencies || []),
      signals: uniqueValues(toArray(explanation.signals).map((item) => toText(item))).slice(0, 8),
    },
    coach: {
      summary: coach?.summary || {},
      headline: toText(coach?.headline || ''),
      briefing: toText(coach?.briefing || ''),
      phases: toArray(coach?.phases),
      insights: toArray(coach?.insights),
      alerts: toArray(coach?.alerts),
      strategicPlan,
    },
    advisor: {
      summary: advisor?.summary || {},
      primaryObjective: toText(advisor?.primaryObjective || ''),
      objectivePriority: toArray(advisor?.objectivePriority),
      gameWindows: advisor?.gameWindows || {},
      loseConditions: toArray(advisor?.loseConditions),
    },
    executive: {
      summary: executiveSummary,
      profile: executiveSummary?.profile || [],
      executionProfile: executiveSummary?.executionProfile || [],
      criticalErrors: executiveSummary?.criticalErrors || [],
      checklist: executiveSummary?.checklist || [],
      priorities: executiveSummary?.priorities || [],
    },
    metrics,
    gamePlan,
    summaryText: toText(analysis?.summaryText || ''),
    signals,
    recommendations: toArray(recommendationEngine?.items),
    recommendationSummary: toText(recommendationEngine?.summary || ''),
    selectedChampions: toArray(selectedChampions),
    engineVersion: analysis?.engineVersion || null,
    confidence: Number(analysis?.confidence) || 0,
    raw: analysis,
  };
}