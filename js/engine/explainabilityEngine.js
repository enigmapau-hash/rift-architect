import { normalizeText } from './utils.js';

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function textOf(value, fallback = 'Sin definir') {
  if (value == null) return fallback;
  if (typeof value === 'string') return value.trim() || fallback;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map((item) => textOf(item, '')).filter(Boolean).join(' · ') || fallback;
  if (typeof value === 'object') {
    return textOf(
      value.label ?? value.name ?? value.title ?? value.text ?? value.value ?? value.detail ?? value.summary ?? value.reason ?? value.description ?? value.champion ?? value.item ?? '',
      fallback
    );
  }
  return String(value) || fallback;
}

function championName(champion) {
  return textOf(champion?.champion || champion?.displayName || champion?.name || 'Sin definir');
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

function buildEvidence(source, label, detail, weight = 0, champions = []) {
  return {
    source: textOf(source),
    label: textOf(label),
    detail: textOf(detail, ''),
    weight: clampNumber(Math.round(Number(weight) || 0), 0, 100),
    champions: unique(champions).slice(0, 4),
  };
}

function mergeChampions(...groups) {
  return unique(groups.flat()).filter(Boolean).slice(0, 4);
}

function confidenceFromEvidence(evidence = [], baseline = 45) {
  const score = evidence.reduce((total, item) => total + clampNumber(Number(item?.weight) || 0, 0, 100), 0);
  const weighted = baseline + Math.min(45, Math.round(score * 0.8));
  return clampNumber(weighted, 0, 100);
}

function confidenceLabel(score = 0) {
  if (score >= 85) return 'Muy alta';
  if (score >= 70) return 'Alta';
  if (score >= 55) return 'Media';
  return 'Baja';
}

function makeSection(label, detail, champions = [], evidence = [], baselineConfidence = 45) {
  const safeEvidence = asArray(evidence).filter(Boolean).slice(0, 4);
  const confidence = confidenceFromEvidence(safeEvidence, baselineConfidence);
  const reason = safeEvidence.length
    ? safeEvidence
        .slice(0, 3)
        .map((item) => item.label || item.source)
        .filter(Boolean)
        .join(' · ')
    : 'Sin evidencia suficiente.';

  return {
    label,
    detail: textOf(detail, 'Sin detalle disponible.'),
    champions: unique(champions).slice(0, 4),
    confidence,
    confidenceLabel: confidenceLabel(confidence),
    evidence: safeEvidence,
    reason,
  };
}

function buildIdentitySection(analysis, selectedChampions) {
  const identityBreakdown = Array.isArray(analysis.identityBreakdown)
    ? analysis.identityBreakdown.filter((item) => Number(item?.score) > 0)
    : [];
  const primary = identityBreakdown[0] || null;
  const secondary = identityBreakdown[1] || null;
  const primaryLabel = textOf(analysis.primaryIdentity || primary?.label || 'Sin definir');

  const champions = mergeChampions(
    primary?.champions || [],
    secondary?.champions || [],
    collectChampions(selectedChampions, [primaryLabel, primary?.label, secondary?.label], 4)
  );

  const evidence = [
    buildEvidence('identity', primaryLabel, `Identidad principal: ${primaryLabel}.`, primary?.score || 4, primary?.champions || champions),
    ...(secondary?.label
      ? [buildEvidence('identity', secondary.label, `Identidad secundaria: ${secondary.label}.`, secondary.score || 2, secondary.champions || champions)]
      : []),
    ...champions.slice(0, 3).map((champion) => buildEvidence('champion', champion, `Aporta a la identidad de ${primaryLabel}.`, 2, [champion])),
  ].slice(0, 4);

  const detail = identityBreakdown.length
    ? `${primaryLabel} gana peso por ${champions.length ? champions.join(' · ') : 'la composición'}.`
    : 'No hay una identidad clara que destaque.';

  return makeSection('Identidad', detail, champions, evidence, primary?.score ? 55 + primary.score * 3 : 45);
}

function buildTempoSection(analysis, selectedChampions) {
  const tempoLabel = textOf(analysis.tempoDetail?.label || analysis.tempo || 'Sin definir');
  const tempoPhases = asArray(analysis.tempoDetail?.phases);
  const champions = mergeChampions(
    collectChampions(selectedChampions, tempoPhases, 4),
    collectChampions(selectedChampions, [tempoLabel], 2)
  );

  const evidence = [
    buildEvidence('tempo', tempoLabel, `Tempo principal: ${tempoLabel}.`, tempoPhases.length ? 4 : 3, champions),
    ...tempoPhases.slice(0, 3).map((phase) => buildEvidence('phase', phase, `Aparece en fase ${textOf(phase, 'sin fase')}.`, 2, champions)),
    ...champions.slice(0, 2).map((champion) => buildEvidence('champion', champion, `Conecta con el ritmo de la composición.`, 1, [champion])),
  ].slice(0, 4);

  const detail =
    tempoLabel !== 'Sin definir'
      ? `${tempoLabel} aparece por ${champions.length ? champions.join(' · ') : tempoPhases.join(' · ') || 'la composición'}.`
      : 'No hay un tempo claro.';

  return makeSection('Tempo', detail, champions, evidence, 52);
}

function buildCoherenceSection(analysis) {
  const coherenceLabel = textOf(analysis.coherence?.label || 'Sin definir');
  const champions = mergeChampions(
    analysis.coherence?.primary,
    asArray(analysis.coherence?.secondary),
    asArray(analysis.coherence?.drivers)
  );
  const conflicts = asArray(analysis.coherence?.conflicts);

  const evidence = [
    buildEvidence('coherence', coherenceLabel, analysis.coherence?.detail || `Coherencia: ${coherenceLabel}.`, analysis.coherence?.score || 4, champions),
    ...(analysis.coherence?.primary ? [buildEvidence('coherence-primary', analysis.coherence.primary, 'Nodo principal de la coherencia.', 3, champions)] : []),
    ...asArray(analysis.coherence?.drivers).slice(0, 2).map((driver) => buildEvidence('driver', driver, 'Impulsa la lectura global.', 2, champions)),
    ...conflicts.slice(0, 2).map((conflict) => buildEvidence('conflict', conflict, 'Introduce fricción en el plan.', 1, champions)),
  ].slice(0, 4);

  const detail =
    coherenceLabel !== 'Sin definir'
      ? `${coherenceLabel}${analysis.coherence?.detail ? `: ${analysis.coherence.detail}` : ''}`
      : 'No hay una coherencia clara.';

  return makeSection('Coherencia', detail, champions, evidence, 50);
}

function buildWinConditionSection(analysis) {
  const winLabel = textOf(analysis.winCondition?.label || 'Sin definir');
  const winPriorities = asArray(analysis.winCondition?.priorities);
  const winAvoid = asArray(analysis.winCondition?.avoid);
  const champions = mergeChampions(
    analysis.primaryIdentity,
    asArray(analysis.tempoDetail?.phases).slice(0, 2),
    asArray(analysis.synergies).slice(0, 2).map((item) => item?.label),
    winPriorities.slice(0, 2)
  );

  const evidence = [
    buildEvidence('win-condition', winLabel, analysis.winCondition?.detail || `Condición de victoria: ${winLabel}.`, winPriorities.length ? 5 : 4, champions),
    ...winPriorities.slice(0, 3).map((priority) => buildEvidence('priority', priority, 'Define una acción de cierre.', 2, champions)),
    ...winAvoid.slice(0, 2).map((avoid) => buildEvidence('avoid', avoid, 'Es una línea roja para el plan.', 1, champions)),
  ].slice(0, 4);

  const detail =
    winLabel !== 'Sin definir'
      ? `${winLabel}${analysis.winCondition?.detail ? `: ${analysis.winCondition.detail}` : ''}`
      : 'No hay una condición de victoria clara.';

  return makeSection('Victoria', detail, champions, evidence, 54);
}

function buildSynergySections(analysis) {
  return (Array.isArray(analysis.synergies) ? analysis.synergies.slice(0, 3) : []).map((item) => {
    const champions = unique(asArray(item.champions)).slice(0, 4);
    const evidence = [
      buildEvidence('synergy', item.label, item.detail || 'Sinergia detectada.', item.score || 4, champions),
      ...champions.slice(0, 2).map((champion) => buildEvidence('champion', champion, `Refuerza ${item.label}.`, 2, [champion])),
    ].slice(0, 4);

    return makeSection(item.label, item.detail || 'Sinergia detectada.', champions, evidence, 50 + (Number(item.score) || 0));
  });
}

function buildDependencySections(analysis) {
  return (Array.isArray(analysis.dependencies?.items) ? analysis.dependencies.items.slice(0, 4) : []).map((item) => {
    const champions = unique(asArray(item.evidence)).slice(0, 4);
    const evidence = [
      buildEvidence('dependency', item.label, item.detail || 'Dependencia detectada.', item.score || 3, champions),
      ...(item.missing || []).slice(0, 2).map((missing) => buildEvidence('missing', missing, 'Falta cubrirlo.', 1, champions)),
    ].slice(0, 4);

    return makeSection(
      item.label,
      [item.status, item.detail, item.missing?.length ? `Falta: ${item.missing.join(' · ')}` : null].filter(Boolean).join(' · '),
      champions,
      evidence,
      item.status && item.status !== 'Activo' ? 42 : 52
    );
  });
}

function buildSignals(analysis, selectedChampions) {
  const identity = buildIdentitySection(analysis, selectedChampions);
  const tempo = buildTempoSection(analysis, selectedChampions);
  const winCondition = buildWinConditionSection(analysis);
  return unique([...identity.evidence, ...tempo.evidence, ...winCondition.evidence]).slice(0, 6);
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
  const summary = buildQuickSummary(analysis, safeChampions);
  const identity = buildIdentitySection(analysis, safeChampions);
  const tempo = buildTempoSection(analysis, safeChampions);
  const coherence = buildCoherenceSection(analysis);
  const winCondition = buildWinConditionSection(analysis);
  const synergies = buildSynergySections(analysis);
  const dependencies = buildDependencySections(analysis);
  const signals = buildSignals(analysis, safeChampions);

  return {
    summary,
    identity,
    tempo,
    coherence,
    winCondition,
    synergies,
    dependencies,
    signals,
    confidence: clampNumber(Math.round((identity.confidence + tempo.confidence + coherence.confidence + winCondition.confidence) / 4), 0, 100),
  };
}
