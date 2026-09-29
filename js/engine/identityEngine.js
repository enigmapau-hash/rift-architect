import { clampNumber, normalizeText } from './utils.js';
import { IDENTITY_RELATIONS } from '../../knowledge/identity-relations.js';

const FIELD_WEIGHTS = {
  identity: 5,
  function: 4,
  strengths: 2,
  weaknesses: 1,
  tempo: 2,
};

function championName(champion) {
  return champion?.champion || champion?.displayName || 'Sin definir';
}

function matchesTempoBias(tempo, bias = []) {
  const normalizedTempo = normalizeText(tempo);
  if (!normalizedTempo) return false;

  return bias.some((item) => {
    const normalizedBias = normalizeText(item);
    if (!normalizedBias) return false;
    return normalizedTempo.includes(normalizedBias);
  });
}

function scoreChampionForRule(champion, rule) {
  const fields = [
    { value: champion?.identity, weight: FIELD_WEIGHTS.identity },
    { value: champion?.function, weight: FIELD_WEIGHTS.function },
    { value: champion?.tempo, weight: FIELD_WEIGHTS.tempo },
    ...((Array.isArray(champion?.strengths) ? champion.strengths : []).map((value) => ({ value, weight: FIELD_WEIGHTS.strengths }))),
    ...((Array.isArray(champion?.weaknesses) ? champion.weaknesses : []).map((value) => ({ value, weight: FIELD_WEIGHTS.weaknesses }))),
  ];

  let score = 0;
  fields.forEach((field) => {
    if (!field.value) return;
    const matchesRule = rule.categories.some((category) => matchesCategory(field.value, category));
    if (matchesRule) score += field.weight;
  });

  if (matchesTempoBias(champion?.tempo, rule.tempoBias)) {
    score += 1;
  }

  return score;
}

function scoreRule(rule, selectedChampions) {
  const contributors = [];
  let score = 0;

  selectedChampions.forEach((champion, index) => {
    const championScore = scoreChampionForRule(champion, rule);
    if (championScore <= 0) return;

    score += championScore;
    contributors.push({
      name: championName(champion),
      score: championScore,
      role: champion?.role || null,
      index,
    });
  });

  return {
    key: rule.key,
    label: rule.label,
    score,
    count: contributors.length,
    champions: contributors.map((item) => item.name),
    championScores: contributors,
    firstIndex: contributors.length ? Math.min(...contributors.map((item) => item.index)) : Number.MAX_SAFE_INTEGER,
  };
}

function dominanceFromScores(primaryScore, secondaryScore) {
  if (primaryScore < 8) return 'flexible';
  if (primaryScore - secondaryScore >= 6 && primaryScore / Math.max(1, secondaryScore) >= 1.35) {
    return 'dominant';
  }
  if (Math.abs(primaryScore - secondaryScore) <= 4 || primaryScore / Math.max(1, secondaryScore) <= 1.18) {
    return 'hybrid';
  }
  return 'dominant';
}

function confidenceFromScores(primaryScore, secondaryScore, dominance, rankedCount) {
  const base = primaryScore * 4 + Math.max(0, primaryScore - secondaryScore) * 3 + rankedCount * 2;
  const bonus = dominance === 'dominant' ? 12 : dominance === 'hybrid' ? 6 : 0;
  return clampNumber(Math.round(base / 3 + bonus), 0, 100);
}

export function summarizeIdentities(selectedChampions = []) {
  const ranked = IDENTITY_RELATIONS.map((rule) => scoreRule(rule, selectedChampions)).sort(
    (a, b) => b.score - a.score || a.firstIndex - b.firstIndex || a.label.localeCompare(b.label, 'es')
  );

  const meaningful = ranked.filter((item) => item.score > 0);
  if (!meaningful.length) {
    return {
      primary: {
        key: 'sin-definir',
        label: 'Sin definir',
        score: 0,
        count: 0,
        champions: [],
        championScores: [],
      },
      secondary: [],
      ranked,
      dominance: 'flexible',
      confidence: 0,
    };
  }

  const [primary, secondary] = meaningful;
  const dominance = dominanceFromScores(primary.score, secondary?.score || 0);
  const confidence = confidenceFromScores(primary.score, secondary?.score || 0, dominance, meaningful.length);

  return {
    primary,
    secondary: meaningful.slice(1, 3),
    ranked,
    dominance,
    confidence,
  };
}
