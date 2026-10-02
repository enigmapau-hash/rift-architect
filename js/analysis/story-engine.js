export function buildAnalysisStory(analysis = {}) {
  const executive = analysis.executiveSummary || {};
  const confidence = clamp(Number(executive.score ?? analysis.confidence ?? analysis.score ?? 0), 0, 100);
  const primaryIdentity = cleanText(analysis.primaryIdentity || 'Sin definir');
  const winLabel = cleanText(analysis.winCondition?.label || analysis.winConditions?.[0]?.label || 'Jugar a tu plan');
  const winDetail = cleanText(analysis.winCondition?.detail || analysis.summaryText || '');
  const title = cleanText(executive.title || `${primaryIdentity} · ${winLabel}`);
  const summaryText = cleanText(executive.text || winDetail || 'Resumen compacto basado en la composición propia.');
  const tempo = cleanText(analysis.tempoDetail?.label || analysis.tempo || 'Tempo medio');
  const dominance = cleanText(analysis.dominance || 'Sin definir');

  const secondaryIdentities = uniqueValues([
    ...(Array.isArray(analysis.secondaryIdentities) ? analysis.secondaryIdentities : []),
    analysis.coherence?.label,
  ]).slice(0, 3);

  const strengths = buildRankedItems(analysis.strengths, 'Apoya el plan', 'Apoya la condición principal.', 92);
  const weaknesses = buildRankedItems(analysis.weaknesses, 'A vigilar', 'Te expone si lo fuerzas mal.', 72);
  const synergies = uniqueValues([
    ...(Array.isArray(analysis.synergies) ? analysis.synergies.map(formatEntry) : []),
    ...(Array.isArray(analysis.dependencies?.items) ? analysis.dependencies.items.map(formatEntry) : []),
  ]).slice(0, 3);
  const risks = uniqueValues([
    ...(Array.isArray(analysis.coherence?.conflicts) ? analysis.coherence.conflicts.map(formatEntry) : []),
    ...(Array.isArray(analysis.threats) ? analysis.threats : []),
    ...(Array.isArray(analysis.risks) ? analysis.risks : []),
  ]).slice(0, 3);

  return {
    title,
    summaryText,
    confidence,
    scoreBadge: labelFromConfidence(confidence),
    grade: gradeFromScore(confidence),
    tags: uniqueValues([
      primaryIdentity,
      tempo,
      winLabel,
      analysis.coherence?.label,
      ...(Array.isArray(analysis.tags) ? analysis.tags : []),
    ]).slice(0, 4),
    primaryIdentity,
    identityCopy: summaryText,
    secondaryIdentities,
    strengths,
    weaknesses,
    synergies,
    risks,
    phases: buildPhases(analysis),
    tempo,
    dominance,
  };
}

function buildRankedItems(items = [], badge = '', detail = '', startScore = 90) {
  return uniqueValues(Array.isArray(items) ? items.map(formatEntry) : [formatEntry(items)])
    .slice(0, 3)
    .map((item, index) => ({
      label: item,
      detail,
      score: clamp(startScore - index * 8, 35, 100),
      badge,
    }));
}

function buildPhases(analysis = {}) {
  const coachPhases = Array.isArray(analysis.coach?.phases) ? analysis.coach.phases : [];
  if (coachPhases.length >= 3) {
    return coachPhases.slice(0, 3).map((phase, index) => ({
      phase: phase.phase || ['EARLY (0–10)', 'MID (10–20)', 'LATE (20+)'][index],
      title: cleanText(phase.title || phase.label || 'Ajusta tu plan'),
      detail: cleanText(phase.detail || 'Sigue la condición de victoria principal.'),
      actions: uniqueValues(Array.isArray(phase.actions) ? phase.actions : []).slice(0, 3),
    }));
  }

  const gamePlan = Array.isArray(analysis.gamePlan) ? analysis.gamePlan : [];
  return [
    {
      phase: 'EARLY (0–10)',
      title: cleanText(gamePlan[0] || 'Gana tiempo'),
      detail: 'Evita regalar ventajas y prepara tu ventana real.',
      actions: ['Visión', 'Tempo', 'Primer objetivo'],
    },
    {
      phase: 'MID (10–20)',
      title: cleanText(gamePlan[1] || 'Convierte ventaja'),
      detail: 'Transforma tu plan en mapa y objetivos.',
      actions: ['Agrupar', 'Pick', 'Objetivos'],
    },
    {
      phase: 'LATE (20+)',
      title: cleanText(gamePlan[2] || 'Cierra limpio'),
      detail: 'Juega tu condición de victoria principal sin improvisar.',
      actions: ['Proteger carry', 'Teamfight', 'Cerrar'],
    },
  ];
}

function formatEntry(value) {
  if (value == null) return '';
  if (typeof value === 'string') return cleanText(value);
  if (typeof value === 'object') {
    return cleanText(value.label || value.name || value.title || value.text || value.value || value.detail || value.summary || value.reason || value.description || value.champion || value.item || '');
  }
  return cleanText(String(value));
}

function uniqueValues(values = []) {
  return [...new Set(values.map(formatEntry).filter(Boolean))];
}

function cleanText(value = '') {
  return formatEntry(value).replace(/\s+/g, ' ').trim();
}

function gradeFromScore(score) {
  const value = clamp(Number(score) || 0, 0, 100);
  if (value >= 90) return 'S';
  if (value >= 80) return 'A+';
  if (value >= 70) return 'A';
  if (value >= 60) return 'B';
  if (value >= 45) return 'C';
  return 'D';
}

function labelFromConfidence(score = 0) {
  const value = clamp(Math.round(Number(score) || 0), 0, 100);
  if (value >= 90) return 'Excelente';
  if (value >= 80) return 'Muy alta';
  if (value >= 70) return 'Alta';
  if (value >= 60) return 'Media';
  return 'Baja';
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
