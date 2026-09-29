import { cleanLabel, matchesCategory, normalizeText } from './utils.js';

const DIRECT_SYNERGY_RULES = [
  {
    key: 'orianna-jarvan',
    label: 'Iniciación en área',
    detail: 'La iniciación abre una pelea limpia para el follow-up en área.',
    champions: [
      ['orianna'],
      ['jarvaniv', 'jarvan iv'],
    ],
    categories: ['engage', 'teamfight', 'control'],
  },
  {
    key: 'taric-masteryi',
    label: 'Protect Carry',
    detail: 'Protección directa del carry y ventana de pelea muy segura.',
    champions: [
      ['taric'],
      ['masteryi', 'master yi'],
    ],
    categories: ['frontline', 'control', 'teamfight'],
  },
  {
    key: 'shen-nocturne',
    label: 'Presión global',
    detail: 'Amenaza simultánea en mapa y picks desde la niebla.',
    champions: [
      ['shen'],
      ['nocturne'],
    ],
    categories: ['pick', 'mobility', 'control'],
  },
  {
    key: 'yasuo-malphite',
    label: 'Engage explosivo',
    detail: 'Engage en cadena para pelea cerrada y ejecución rápida.',
    champions: [
      ['yasuo'],
      ['malphite'],
    ],
    categories: ['engage', 'teamfight', 'pick'],
  },
  {
    key: 'wukong-orianna',
    label: 'Combo de wombo',
    detail: 'Ults encadenadas para iniciar y cerrar en área.',
    champions: [
      ['wukong'],
      ['orianna'],
    ],
    categories: ['teamfight', 'engage', 'control'],
  },
  {
    key: 'vi-orianna',
    label: 'Pick de confirmación',
    detail: 'Un pick fiable que garantiza la entrada del daño en área.',
    champions: [
      ['vi'],
      ['orianna'],
    ],
    categories: ['engage', 'pick', 'teamfight'],
  },
];

const MACRO_SYNERGY_RULES = [
  {
    key: 'front-to-back',
    label: 'Front to Back',
    detail: 'La primera línea protege al carry y la pelea se resuelve al frente.',
    categories: ['frontline', 'control', 'teamfight'],
    minHits: 3,
  },
  {
    key: 'poke-siege',
    label: 'Asedio',
    detail: 'El daño a distancia desgasta y prepara torres o objetivos.',
    categories: ['poke', 'control', 'objective'],
    minHits: 2,
  },
  {
    key: 'split-pressure',
    label: 'Presión lateral',
    detail: 'La composición gana espacio con side lanes y amenaza lateral.',
    categories: ['splitpush', 'mobility', 'damage'],
    minHits: 2,
  },
  {
    key: 'pick-chain',
    label: 'Cadena de picks',
    detail: 'La composición castiga errores y convierte visión en asesinatos.',
    categories: ['pick', 'engage', 'mobility'],
    minHits: 2,
  },
  {
    key: 'protect-carry',
    label: 'Protect Carry',
    detail: 'La composición gira alrededor del carry principal y su protección.',
    categories: ['frontline', 'control', 'teamfight'],
    minHits: 2,
  },
];

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