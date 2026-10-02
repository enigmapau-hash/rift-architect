import { cleanText, uniqueValues } from './analysis-utils.js';

export function buildIdentityReport(baseAnalysis = {}, composition = {}) {
  const primaryIdentity = cleanText(
    baseAnalysis.primaryIdentity || composition.functions?.[0] || composition.identities?.[0] || 'Sin definir'
  );
  const winLabel = cleanText(baseAnalysis.winCondition?.label || baseAnalysis.winConditions?.[0]?.label || 'Jugar a tu plan');
  const winDetail = cleanText(baseAnalysis.winCondition?.detail || baseAnalysis.summaryText || '');
  const title = cleanText(baseAnalysis.executiveSummary?.title || `${primaryIdentity} · ${winLabel}`);
  const summaryText = cleanText(
    baseAnalysis.executiveSummary?.text || winDetail || 'Resumen compacto basado en la composición propia.'
  );
  const tempo = cleanText(baseAnalysis.tempoDetail?.label || baseAnalysis.tempo || composition.tempos?.[0] || 'Tempo medio');
  const dominance = cleanText(baseAnalysis.dominance || composition.functions?.[0] || 'Sin definir');

  const secondaryIdentities = uniqueValues([
    ...(Array.isArray(baseAnalysis.secondaryIdentities) ? baseAnalysis.secondaryIdentities : []),
    baseAnalysis.coherence?.label,
    ...(Array.isArray(composition.identities) ? composition.identities : []),
    ...(Array.isArray(composition.functions) ? composition.functions : []),
  ])
    .filter((value) => value !== primaryIdentity)
    .slice(0, 3);

  const tags = uniqueValues([
    primaryIdentity,
    tempo,
    winLabel,
    baseAnalysis.coherence?.label,
    ...(Array.isArray(baseAnalysis.tags) ? baseAnalysis.tags : []),
    ...(Array.isArray(composition.identities) ? composition.identities : []),
    ...(Array.isArray(composition.functions) ? composition.functions : []),
    ...(Array.isArray(composition.tempos) ? composition.tempos : []),
  ]).slice(0, 6);

  const winConditions = normalizeWinConditions(baseAnalysis);

  return {
    title,
    summaryText,
    primaryIdentity,
    secondaryIdentities,
    tempo,
    dominance,
    tags,
    winConditions,
    winLabel,
    winDetail,
    focus: cleanText(baseAnalysis.coherence?.label || primaryIdentity),
  };
}

function normalizeWinConditions(baseAnalysis = {}) {
  const current = baseAnalysis?.winConditions || baseAnalysis?.winCondition;
  const items = Array.isArray(current) ? current : current ? [current] : [];

  return items.map((item) => ({
    label: cleanText(item?.label ?? item?.title ?? item?.name ?? item),
    detail: cleanText(item?.detail ?? item?.text ?? item?.summary ?? ''),
  }));
}
