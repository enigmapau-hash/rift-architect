function uniqueValues(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
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

function normalizeEvidence(items = []) {
  return toArray(items)
    .map((item) => ({
      label: toText(item?.label || item?.name || item?.source || item),
      detail: toText(item?.detail || item?.description || item?.text || ''),
      weight: Number(item?.weight) || 0,
      champions: uniqueValues(toArray(item?.champions).map((champion) => toText(champion))).slice(0, 4),
      source: toText(item?.source || item?.label || item?.name || item),
    }))
    .filter((item) => item.label || item.detail || item.source);
}

function normalizeSections(items = []) {
  return toArray(items)
    .map((item) => ({
      label: toText(item?.label || item?.title || item?.name || item),
      detail: toText(item?.detail || item?.text || item?.summary || ''),
      confidence: Number(item?.confidence) || 0,
      confidenceLabel: toText(item?.confidenceLabel || ''),
      reason: toText(item?.reason || ''),
      champions: uniqueValues(toArray(item?.champions).map((champion) => toText(champion))).slice(0, 4),
      evidence: normalizeEvidence(item?.evidence || []),
    }))
    .filter((item) => item.label || item.detail || item.evidence.length);
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
      risks: risks,
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
    selectedChampions: toArray(selectedChampions),
    engineVersion: analysis?.engineVersion || null,
    confidence: Number(analysis?.confidence) || 0,
    raw: analysis,
  };
}
