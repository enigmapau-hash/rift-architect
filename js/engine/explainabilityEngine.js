import { normalizeText } from './utils.js';

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function championName(champion) {
  return champion?.champion || champion?.displayName || 'Sin definir';
}

function championText(champion) {
  return [
    champion?.champion,
    champion?.displayName,
    champion?.identity,
    champion?.function,
    champion?.tempo,
    ...(Array.isArray(champion?.strengths) ? champion.strengths : []),
    ...(Array.isArray(champion?.weaknesses) ? champion.weaknesses : []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function collectChampions(selectedChampions, terms = [], limit = 4) {
  const normalizedTerms = unique(terms.map((term) => normalizeText(term))).filter(Boolean);
  if (!normalizedTerms.length) return [];

  return unique(
    selectedChampions
      .filter((champion) => {
        const text = normalizeText(championText(champion));
        return normalizedTerms.some((term) => text.includes(term) || term.includes(text));
      })
      .map(championName)
  ).slice(0, limit);
}

function makeSection(label, detail, champions = []) {
  return {
    label,
    detail: String(detail || '').trim() || 'Sin detalle disponible.',
    champions: unique(champions).slice(0, 4),
  };
}

function buildIdentitySection(analysis, selectedChampions) {
  const identityBreakdown = Array.isArray(analysis.identityBreakdown)
    ? analysis.identityBreakdown.filter((item) => Number(item?.score) > 0)
    : [];
  const primary = identityBreakdown[0] || null;
  const secondary = identityBreakdown[1] || null;

  const champions = unique([
    ...(primary?.champions || []),
    ...(secondary?.champions || []),
    ...collectChampions(selectedChampions, [analysis.primaryIdentity, primary?.label], 4),
  ]).slice(0, 4);

  const detail = identityBreakdown.length
    ? `${analysis.primaryIdentity || primary?.label || 'Sin definir'} gana peso por ${champions.length ? champions.join(' · ') : 'la composición'}.`
    : 'No hay una identidad clara que destaque.';

  return makeSection('Identidad', detail, champions);
}

function buildTempoSection(analysis, selectedChampions) {
  const tempoLabel = analysis.tempoDetail?.label || analysis.tempo || 'Sin definir';
  const tempoPhases = Array.isArray(analysis.tempoDetail?.phases) ? analysis.tempoDetail.phases : [];
  const champions = unique([
    ...collectChampions(selectedChampions, tempoPhases, 4),
    ...collectChampions(selectedChampions, [tempoLabel], 2),
  ]).slice(0, 4);

  const detail =
    tempoLabel !== 'Sin definir'
      ? `${tempoLabel} aparece por ${champions.length ? champions.join(' · ') : tempoPhases.join(' · ') || 'la composición'}.`
      : 'No hay un tempo claro.';

  return makeSection('Tempo', detail, champions);
}

function buildCoherenceSection(analysis) {
  const coherenceLabel = analysis.coherence?.label || 'Sin definir';
  const champions = unique([
    analysis.coherence?.primary,
    ...(Array.isArray(analysis.coherence?.secondary) ? analysis.coherence.secondary : []),
    ...(Array.isArray(analysis.coherence?.drivers) ? analysis.coherence.drivers : []),
  ]).slice(0, 4);

  const detail =
    coherenceLabel !== 'Sin definir'
      ? `${coherenceLabel}${analysis.coherence?.detail ? `: ${analysis.coherence.detail}` : ''}`
      : 'No hay una coherencia clara.';

  return makeSection('Coherencia', detail, champions);
}

function buildWinConditionSection(analysis) {
  const winLabel = analysis.winCondition?.label || 'Sin definir';
  const champions = unique([
    ...(analysis.primaryIdentity ? [analysis.primaryIdentity] : []),
    ...(Array.isArray(analysis.tempoDetail?.phases) ? analysis.tempoDetail.phases.slice(0, 2) : []),
    ...(Array.isArray(analysis.synergies) ? analysis.synergies.slice(0, 2).map((item) => item.label) : []),
    ...(Array.isArray(analysis.winCondition?.priorities) ? analysis.winCondition.priorities.slice(0, 2) : []),
  ]).slice(0, 4);

  const detail =
    winLabel !== 'Sin definir'
      ? `${winLabel}${analysis.winCondition?.detail ? `: ${analysis.winCondition.detail}` : ''}`
      : 'No hay una condición de victoria clara.';

  return makeSection('Victoria', detail, champions);
}

function buildSynergySections(analysis) {
  return (Array.isArray(analysis.synergies) ? analysis.synergies.slice(0, 3) : []).map((item) =>
    makeSection(item.label, item.detail || 'Sinergia detectada.', item.champions || [])
  );
}

function buildDependencySections(analysis) {
  return (Array.isArray(analysis.dependencies?.items) ? analysis.dependencies.items.slice(0, 4) : []).map((item) =>
    makeSection(
      item.label,
      [item.status, item.detail, item.missing?.length ? `Falta: ${item.missing.join(' · ')}` : null].filter(Boolean).join(' · '),
      item.evidence || []
    )
  );
}

function buildQuickSummary(analysis, selectedChampions) {
  return [
    buildIdentitySection(analysis, selectedChampions),
    buildTempoSection(analysis, selectedChampions),
    buildWinConditionSection(analysis),
  ];
}

export function buildExplainability(analysis = {}, selectedChampions = []) {
  const safeChampions = Array.isArray(selectedChampions) ? selectedChampions : [];

  return {
    summary: buildQuickSummary(analysis, safeChampions),
    identity: buildIdentitySection(analysis, safeChampions),
    tempo: buildTempoSection(analysis, safeChampions),
    coherence: buildCoherenceSection(analysis),
    winCondition: buildWinConditionSection(analysis),
    synergies: buildSynergySections(analysis),
    dependencies: buildDependencySections(analysis),
  };
}
