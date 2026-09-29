import { clampNumber, cleanLabel, matchesCategory, normalizeText, TEMPO_ORDER } from './utils.js';

function addTempoVote(scores, label, weight = 1) {
  const normalized = normalizeText(label);
  if (!normalized) return;

  if (normalized.includes('early')) scores.Early += weight;
  if (normalized.includes('mid')) scores.Mid += weight;
  if (normalized.includes('late')) scores.Late += weight;
}

function tempoFromChampion(champion) {
  const scores = { Early: 0, Mid: 0, Late: 0 };
  const label = cleanLabel(champion?.tempo);
  const normalized = normalizeText(label);

  if (normalized.includes('earlymidlate')) {
    addTempoVote(scores, 'Early', 2);
    addTempoVote(scores, 'Mid', 2);
    addTempoVote(scores, 'Late', 2);
  } else if (normalized.includes('earlymid')) {
    addTempoVote(scores, 'Early', 2);
    addTempoVote(scores, 'Mid', 2);
  } else if (normalized.includes('midlate')) {
    addTempoVote(scores, 'Mid', 2);
    addTempoVote(scores, 'Late', 2);
  } else if (normalized.includes('earlylate')) {
    addTempoVote(scores, 'Early', 2);
    addTempoVote(scores, 'Late', 2);
  } else if (normalized.includes('early')) {
    addTempoVote(scores, 'Early', 3);
  } else if (normalized.includes('mid')) {
    addTempoVote(scores, 'Mid', 3);
  } else if (normalized.includes('late')) {
    addTempoVote(scores, 'Late', 3);
  }

  const text = [
    champion?.identity,
    champion?.function,
    ...(Array.isArray(champion?.strengths) ? champion.strengths : []),
    ...(Array.isArray(champion?.weaknesses) ? champion.weaknesses : []),
  ]
    .join(' ')
    .toLowerCase();

  if (matchesCategory(text, 'scaling')) scores.Late += 1.5;
  if (matchesCategory(text, 'teamfight') || matchesCategory(text, 'objective') || matchesCategory(text, 'control')) scores.Mid += 1.2;
  if (matchesCategory(text, 'engage') || matchesCategory(text, 'pick') || matchesCategory(text, 'mobility')) scores.Early += 1.2;

  return scores;
}

function mergeTempoScores(total, next) {
  total.Early += next.Early;
  total.Mid += next.Mid;
  total.Late += next.Late;
  return total;
}

function resolveTempoLabel(scores) {
  const ranked = TEMPO_ORDER.map((label) => ({ label, score: scores[label] || 0 })).sort(
    (a, b) => b.score - a.score || TEMPO_ORDER.indexOf(a.label) - TEMPO_ORDER.indexOf(b.label)
  );

  const active = ranked.filter((item) => item.score > 0);
  if (!active.length) {
    return { label: 'Sin definir', phases: [], ranked, confidence: 0 };
  }

  const [primary, secondary, tertiary] = active;
  const activeByOrder = [...active].sort((a, b) => TEMPO_ORDER.indexOf(a.label) - TEMPO_ORDER.indexOf(b.label));
  let label = primary.label;

  if (active.length >= 3 && tertiary.score >= Math.max(1, primary.score * 0.45)) {
    label = 'Early/Mid/Late';
  } else if (secondary) {
    const firstIndex = TEMPO_ORDER.indexOf(activeByOrder[0].label);
    const secondIndex = TEMPO_ORDER.indexOf(activeByOrder[1].label);
    if (Math.abs(firstIndex - secondIndex) === 1) {
      label = `${activeByOrder[0].label} → ${activeByOrder[1].label}`;
    } else {
      label = `${activeByOrder[0].label} → ${activeByOrder[1].label}`;
    }
  }

  const total = active.reduce((sum, item) => sum + item.score, 0);
  const confidence = clampNumber(Math.round((primary.score / Math.max(1, total)) * 100 + Math.min(20, primary.score * 3)), 0, 100);

  return {
    label,
    phases: activeByOrder.map((item) => item.label),
    ranked,
    confidence,
  };
}

export function summarizeTempo(selectedChampions = []) {
  const totals = selectedChampions.reduce((acc, champion) => mergeTempoScores(acc, tempoFromChampion(champion)), {
    Early: 0,
    Mid: 0,
    Late: 0,
  });

  return resolveTempoLabel(totals);
}
