import { findKnowledgeStyle as resolveKnowledgeStyle, findKnowledgeMatchup as resolveKnowledgeMatchup } from './knowledge-v3.js?v=93';

export { findKnowledgeStyle, findKnowledgeMatchup } from './knowledge-v3.js?v=93';

export function buildKnowledgeV3Context(report = {}, composition = {}, signalSet = {}) {
  const signals = collectSignals(report, composition, signalSet);
  const primaryProfile = resolveKnowledgeStyle(
    report.primaryIdentity || report.identity?.primaryIdentity || composition.identities?.[0] || report.strategic?.focus || '',
    signals,
  );
  const rivalProfile = resolveKnowledgeStyle(
    report.rival?.identity
      || report.rival?.label
      || report.rivalComposition?.identity
      || report.rivalComposition?.label
      || report.opponent?.identity
      || report.opponent?.label
      || report.enemyComposition?.identity
      || report.enemyComposition?.label
      || report.matchup?.identity
      || report.matchup?.label
      || report.enemy?.identity
      || report.enemy?.label
      || report.opposition?.identity
      || report.opposition?.label
      || '',
    signals,
  );
  const matchup = resolveKnowledgeMatchup(primaryProfile?.label || primaryProfile?.key || '', rivalProfile?.label || rivalProfile?.key || '', signals);

  const styleClaim = primaryProfile
    ? makeClaim(`Identidad ${primaryProfile.label}`, primaryProfile.summary, 'identity', 'high', [primaryProfile.label, ...(primaryProfile.aliases || [])])
    : null;
  const matchupClaim = matchup
    ? makeClaim(matchup.label, matchup.detail, 'matchup', 'high', [primaryProfile?.label, rivalProfile?.label, matchup.against])
    : null;
  const macroClaim = primaryProfile
    ? makeClaim(`Macro ${primaryProfile.label}`, primaryProfile.macro?.[0], 'macro', 'medium', primaryProfile.macro)
    : null;
  const visionClaim = primaryProfile
    ? makeClaim(`Visión ${primaryProfile.label}`, primaryProfile.vision?.[0], 'vision', 'medium', primaryProfile.vision)
    : null;
  const tempoClaim = primaryProfile
    ? makeClaim('Ventana de tempo', `Tu ventana real está en ${(primaryProfile.tempo || []).join(' / ')}.`, 'tempo', 'medium', primaryProfile.tempo)
    : null;
  const objectiveClaim = primaryProfile
    ? makeClaim('Prioridad de objetivos', `Prioriza ${(primaryProfile.objectives || []).join(', ')} antes de sobreextenderte.`, 'objective', 'medium', primaryProfile.objectives)
    : null;
  const victoryClaim = primaryProfile
    ? makeClaim('Condición de victoria', primaryProfile.victory, 'victory', 'high', [primaryProfile.victory])
    : null;
  const defeatClaim = primaryProfile
    ? makeClaim('Condición de derrota', primaryProfile.defeat, 'defeat', 'high', [primaryProfile.defeat])
    : null;
  const mistakeClaim = primaryProfile
    ? makeClaim('Error habitual', primaryProfile.mistakes?.[0], 'mistake', 'medium', primaryProfile.mistakes)
    : null;

  const claims = dedupeClaims([
    styleClaim,
    matchupClaim,
    macroClaim,
    visionClaim,
    tempoClaim,
    objectiveClaim,
    victoryClaim,
    defeatClaim,
    mistakeClaim,
  ].filter(Boolean));

  const rules = claims.slice(0, 5);
  const lead = buildLead(primaryProfile, matchup, victoryClaim, tempoClaim);
  const summary = buildSummary(primaryProfile, matchup, victoryClaim, defeatClaim, tempoClaim);
  const tags = uniqueText([
    primaryProfile?.label,
    matchup?.label,
    matchup?.againstStyle ? `vs ${matchup.againstStyle}` : null,
    primaryProfile?.tempo?.[0],
    primaryProfile?.objectives?.[0],
    primaryProfile?.macro?.[0],
  ]);

  return {
    primaryStyle: primaryProfile,
    rivalStyle: rivalProfile,
    matchup,
    style: primaryProfile,
    macro: macroClaim,
    vision: visionClaim,
    tempo: tempoClaim,
    objectives: objectiveClaim,
    victory: victoryClaim,
    defeat: defeatClaim,
    mistake: mistakeClaim,
    lead,
    summary,
    rules,
    claims,
    tags,
    signals,
  };
}

export function summarizeKnowledgeV3Context(context = {}) {
  const parts = [context.lead, context.summary, context.matchup?.detail, context.victory?.detail, context.defeat?.detail].filter(Boolean);
  return parts.length ? parts.slice(0, 2).join(' ') : 'Knowledge Layer v3 sin datos suficientes.';
}

function collectSignals(report = {}, composition = {}, signalSet = {}) {
  return uniqueText([
    report.primaryIdentity,
    report.tempo,
    report.dominance,
    report.identity?.primaryIdentity,
    report.identity?.dominance,
    report.identity?.focus,
    report.identity?.summaryText,
    report.executiveSummary?.title,
    report.executiveSummary?.text,
    report.strategic?.focus,
    report.strategic?.summary,
    report.strategic?.headline,
    ...(Array.isArray(report.tags) ? report.tags : []),
    ...(Array.isArray(composition.tags) ? composition.tags : []),
    ...(Array.isArray(signalSet.labels) ? signalSet.labels : []),
    ...(Array.isArray(signalSet.categories) ? signalSet.categories : []),
    ...(Array.isArray(signalSet.signals) ? signalSet.signals : []),
    ...(Array.isArray(report.winConditions) ? report.winConditions.flatMap((item) => [item?.label, item?.detail]) : []),
    report.winCondition?.label,
    report.winCondition?.detail,
    report.rival?.identity,
    report.rival?.label,
    report.rivalComposition?.identity,
    report.rivalComposition?.label,
    report.opponent?.identity,
    report.opponent?.label,
    report.enemyComposition?.identity,
    report.enemyComposition?.label,
    report.matchup?.identity,
    report.matchup?.label,
    report.enemy?.identity,
    report.enemy?.label,
    report.opposition?.identity,
    report.opposition?.label,
  ]);
}

function uniqueText(values = []) {
  return [...new Set(values.map((value) => cleanText(value)).filter(Boolean))];
}

function cleanText(value) {
  return String(value ?? '').trim();
}

function makeClaim(label, detail, kind, priority = 'medium', evidence = []) {
  return {
    label,
    detail,
    kind,
    priority,
    evidence: uniqueText(evidence).slice(0, 4),
  };
}

function dedupeClaims(claims = []) {
  const seen = new Set();
  return claims.filter((claim) => {
    if (!claim) return false;
    const key = `${normalizeForClaim(claim.label)}::${normalizeForClaim(claim.detail)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildLead(primaryProfile, matchup, victoryClaim, tempoClaim) {
  const parts = [primaryProfile?.summary, matchup?.detail, victoryClaim?.detail || tempoClaim?.detail].filter(Boolean);
  return parts.length ? parts.slice(0, 2).join(' ') : 'La composición todavía necesita una lectura estratégica más clara.';
}

function buildSummary(primaryProfile, matchup, victoryClaim, defeatClaim, tempoClaim) {
  const parts = [primaryProfile?.summary, matchup?.detail, victoryClaim?.detail, defeatClaim?.detail, tempoClaim?.detail].filter(Boolean);
  return parts.length ? parts.slice(0, 2).join(' ') : 'La composición todavía necesita una lectura estratégica más clara.';
}

function normalizeForClaim(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}
