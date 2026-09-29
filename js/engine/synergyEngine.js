import { cleanLabel, matchesCategory, normalizeText } from './utils.js';
import { DIRECT_SYNERGY_RULES, MACRO_SYNERGY_RULES } from '../../knowledge/synergies.js';

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function championName(champion) {
  return cleanLabel(champion?.champion || champion?.displayName || 'Sin definir');
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

function matchChampionTerms(champion, terms = []) {
  const text = championText(champion);
  return terms.some((term) => text.includes(normalizeText(term)));
}

function matchChampionCategories(champion, categories = []) {
  const text = championText(champion);
  return categories.some((category) => matchesCategory(text, category));
}

function scoreRule(rule, supporters, weightBase) {
  const supporterNames = supporters.map((champion) => championName(champion));
  const totalScore = supporters.reduce((sum, champion) => {
    const text = championText(champion);
    return sum + rule.categories.reduce((ruleScore, category) => {
      if (matchesCategory(text, category)) return ruleScore + 1;
      return ruleScore;
    }, 0);
  }, 0);

  if (!supporters.length || totalScore <= 0) {
    return null;
  }

  return {
    key: rule.key,
    label: rule.label,
    detail: rule.detail,
    champions: supporterNames,
    score: clampNumber(weightBase + totalScore * 8, 10, 100),
    kind: 'macro',
  };
}

function scoreDirectRule(rule, selectedChampions) {
  const matched = rule.champions
    .map((terms) => selectedChampions.find((champion) => matchChampionTerms(champion, terms)))
    .filter(Boolean);

  if (matched.length !== rule.champions.length) {
    return null;
  }

  const supportScore = selectedChampions.reduce((sum, champion) => {
    if (!matchChampionCategories(champion, rule.categories)) return sum;
    return sum + 1;
  }, 0);

  return {
    key: rule.key,
    label: rule.label,
    detail: rule.detail,
    champions: matched.map((champion) => championName(champion)),
    score: clampNumber(72 + supportScore * 4, 72, 100),
    kind: 'pair',
  };
}

function buildMacroCandidates(selectedChampions, identitySummary, strengths = []) {
  const candidates = [];
  const identityLabel = normalizeText(identitySummary?.primary?.label || '');
  const strengthSet = new Set((Array.isArray(strengths) ? strengths : []).map((item) => normalizeText(item)));

  MACRO_SYNERGY_RULES.forEach((rule) => {
    const supports = selectedChampions.filter((champion) => {
      const text = championText(champion);
      return rule.categories.some((category) => matchesCategory(text, category));
    });

    if (supports.length < rule.minHits) return;

    if (rule.key === 'front-to-back' && !identityLabel.includes('fronttoback') && !identityLabel.includes('teamfight') && !strengthSet.has(normalizeText('Frontline'))) {
      return;
    }

    candidates.push(scoreRule(rule, supports.slice(0, 3), 50));
  });

  if (identityLabel.includes('fronttoback') || identityLabel.includes('teamfight') || identityLabel.includes('control')) {
    const supports = selectedChampions.filter((champion) => matchChampionCategories(champion, ['frontline', 'teamfight', 'control']));
    candidates.push(scoreRule(MACRO_SYNERGY_RULES[0], supports.slice(0, 3), 56));
  }

  if (identityLabel.includes('poke') || identityLabel.includes('siege')) {
    const supports = selectedChampions.filter((champion) => matchChampionCategories(champion, ['poke', 'control', 'objective']));
    candidates.push(scoreRule(MACRO_SYNERGY_RULES[1], supports.slice(0, 3), 54));
  }

  if (identityLabel.includes('splitpush')) {
    const supports = selectedChampions.filter((champion) => matchChampionCategories(champion, ['splitpush', 'mobility', 'damage']));
    candidates.push(scoreRule(MACRO_SYNERGY_RULES[2], supports.slice(0, 3), 54));
  }

  return candidates.filter(Boolean);
}

export function summarizeSynergies(selectedChampions = [], identitySummary = null, strengths = []) {
  const direct = DIRECT_SYNERGY_RULES
    .map((rule) => scoreDirectRule(rule, selectedChampions))
    .filter(Boolean);

  const macro = buildMacroCandidates(selectedChampions, identitySummary, strengths).filter(Boolean);
  const unique = new Map();

  [...direct, ...macro]
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label, 'es'))
    .forEach((item) => {
      const previous = unique.get(item.key);
      if (!previous || item.score > previous.score) {
        unique.set(item.key, {
          ...item,
          champions: [...new Set(item.champions)].slice(0, 3),
        });
      }
    });

  return [...unique.values()].slice(0, 4);
}
