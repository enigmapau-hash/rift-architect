import { normalizeText } from './utils.js';

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

function words(value = '', maxWords = 18) {
  const tokens = String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);

  return tokens.slice(0, maxWords).join(' ');
}

function first(arr = [], fallback = null) {
  return Array.isArray(arr) && arr.length ? arr[0] : fallback;
}

function buildWinLine(analysis, strategicPlan) {
  const identity = analysis?.primaryIdentity || strategicPlan?.fightStyle || 'Tu composición';
  const objective = strategicPlan?.primaryObjective || analysis?.winCondition?.label || 'su plan principal';
  return `${identity} quiere ganar por ${objective.toLowerCase()}.`;
}

function buildNeedLine(needs = []) {
  if (!needs.length) return 'La composición no muestra una carencia dominante.';
  const topNeeds = needs.slice(0, 3).map((item) => item.label.toLowerCase()).join(', ');
  return `Ahora mismo necesita reforzar ${topNeeds}.`;
}

function buildBecauseLine(primaryNeed, strategicPlan, analysis) {
  if (!primaryNeed) {
    return analysis?.explanation?.summary?.[0]?.detail || 'La historia se apoya en el análisis central del motor.';
  }

  const plan = String(strategicPlan?.fightStyle || strategicPlan?.mode || 'el plan actual').toLowerCase();
  const reason = String(primaryNeed.impact || primaryNeed.detail || 'la composición todavía tiene un hueco importante').trim();
  return `Necesita ${primaryNeed.label.toLowerCase()} porque ${reason.toLowerCase()} y eso afecta a ${plan}.`;
}

function buildSolutionLine(topProfile, topPick, strategicPlan) {
  const profile = topProfile?.label || 'un perfil estable';
  const pick = topPick?.profileLabel || topPick?.label || 'una opción compatible';
  const focus = String(strategicPlan?.fightStyle || strategicPlan?.mapFocus || 'el plan').toLowerCase();
  return `La mejor forma de resolverlo es buscar ${profile.toLowerCase()} y, si hace falta, traducirlo a ${pick.toLowerCase()} para sostener ${focus}.`;
}

function buildWarningLine(topBan) {
  if (!topBan) return 'Evita añadir ruido: prioriza decisiones que encajen con el plan.';
  return `Ten cuidado con ${topBan.label.toLowerCase()}: ${words(topBan.detail, 16)}.`;
}

export function buildNarrative(analysis = {}) {
  const draftAssistant = analysis?.draftAssistant || {};
  const strategicPlan = analysis?.strategicPlan || analysis?.plan || analysis?.coach?.strategicPlan || {};
  const needs = Array.isArray(draftAssistant.compositionNeeds) ? draftAssistant.compositionNeeds : [];
  const strategicProfiles = Array.isArray(draftAssistant.strategicProfiles) ? draftAssistant.strategicProfiles : [];
  const pickRecommendations = Array.isArray(draftAssistant.pickRecommendations) ? draftAssistant.pickRecommendations : [];
  const banRecommendations = Array.isArray(draftAssistant.banRecommendations) ? draftAssistant.banRecommendations : [];

  const primaryNeed = first(needs);
  const topProfile = first(strategicProfiles);
  const topPick = first(pickRecommendations);
  const topBan = first(banRecommendations);

  const winLine = buildWinLine(analysis, strategicPlan);
  const needLine = buildNeedLine(needs);
  const becauseLine = buildBecauseLine(primaryNeed, strategicPlan, analysis);
  const solutionLine = buildSolutionLine(topProfile, topPick, strategicPlan);
  const warningLine = buildWarningLine(topBan);

  return {
    title: winLine,
    summary: `${needLine} ${solutionLine}`,
    winLine,
    needLine,
    becauseLine,
    solutionLine,
    warningLine,
    primaryNeed: primaryNeed ? {
      label: primaryNeed.label,
      score: primaryNeed.score,
      priority: primaryNeed.priority,
      impact: primaryNeed.impact,
    } : null,
    topProfile: topProfile ? {
      label: topProfile.label,
      confidence: topProfile.confidence,
      why: topProfile.why,
    } : null,
    topPick: topPick ? {
      label: topPick.label,
      profileLabel: topPick.profileLabel,
      confidence: topPick.confidence,
    } : null,
    topBan: topBan ? {
      label: topBan.label,
      detail: topBan.detail,
    } : null,
    detail: [winLine, needLine, becauseLine, solutionLine, warningLine].join(' '),
    focus: words(textFromPlan(strategicPlan), 10),
  };
}
