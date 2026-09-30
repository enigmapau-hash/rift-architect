import { clampNumber, compareLabels, getLabelText, normalizeText, uniqueOrdered } from './utils.js';

const BAN_CATALOG = [
  {
    champion: 'Trundle',
    category: 'Anti-frontline',
    reason: 'Rompe tanques y deja sin valor a los frontales largos.',
    tags: ['frontline', 'fronttoback', 'protect', 'teamfight', 'tank'],
  },
  {
    champion: 'Vayne',
    category: 'Anti-frontline',
    reason: 'Castiga composiciones que dependen de una primera línea sólida.',
    tags: ['frontline', 'fronttoback', 'protect', 'scaling', 'tank'],
  },
  {
    champion: 'Gwen',
    category: 'Anti-frontline',
    reason: 'Penetra frontlines y fuerzas de peleas agrupadas.',
    tags: ['frontline', 'fronttoback', 'teamfight', 'scaling'],
  },
  {
    champion: 'Brand',
    category: 'Anti-frontline',
    reason: 'Castiga agrupaciones y peleas cerradas en 5v5.',
    tags: ['teamfight', 'fronttoback', 'protect', 'control'],
  },
  {
    champion: 'Poppy',
    category: 'Anti-dive',
    reason: 'Corta la entrada y desactiva engages directos.',
    tags: ['dive', 'pick', 'engage', 'mobility'],
  },
  {
    champion: 'Janna',
    category: 'Anti-dive',
    reason: 'Desarma las entradas y compra tiempo para el carry.',
    tags: ['dive', 'pick', 'engage', 'protect'],
  },
  {
    champion: 'Tahm Kench',
    category: 'Anti-pick',
    reason: 'Niega picks y protege a quien quiera forzar la pelea.',
    tags: ['pick', 'dive', 'protect', 'control'],
  },
  {
    champion: 'Braum',
    category: 'Anti-poke',
    reason: 'Reduce el valor del daño frontal y frena el asedio.',
    tags: ['poke', 'siege', 'teamfight', 'protect'],
  },
  {
    champion: 'Malphite',
    category: 'Anti-poke',
    reason: 'Castiga composiciones inmóviles y de rango medio.',
    tags: ['poke', 'siege', 'teamfight', 'control'],
  },
  {
    champion: 'Hecarim',
    category: 'Anti-poke',
    reason: 'Convierte un draft de rango en una pelea incómoda.',
    tags: ['poke', 'siege', 'control', 'teamfight'],
  },
  {
    champion: 'Zac',
    category: 'Anti-poke',
    reason: 'Amenaza backlines estáticas y setups de asedio.',
    tags: ['poke', 'siege', 'engage', 'control'],
  },
  {
    champion: 'Nocturne',
    category: 'Anti-vision',
    reason: 'Castiga composiciones que dependen de visión limpia y calma.',
    tags: ['pick', 'vision', 'globalpressure', 'dive'],
  },
  {
    champion: 'Twisted Fate',
    category: 'Anti-splitpush',
    reason: 'Convierte la presión lateral en respuestas forzadas.',
    tags: ['splitpush', 'globalpressure', 'pick', 'control'],
  },
  {
    champion: 'Shen',
    category: 'Anti-splitpush',
    reason: 'Niega side lanes aisladas y refuerza respuestas globales.',
    tags: ['splitpush', 'globalpressure', 'frontline', 'control'],
  },
  {
    champion: 'Galio',
    category: 'Anti-pick',
    reason: 'Protege al equipo contra ventanas cortas de castigo.',
    tags: ['pick', 'globalpressure', 'protect', 'control'],
  },
  {
    champion: 'Olaf',
    category: 'Anti-control',
    reason: 'Rompe cadenas de control y acelera peleas caóticas.',
    tags: ['control', 'frontline', 'engage', 'dive'],
  },
  {
    champion: 'Zed',
    category: 'Anti-carry',
    reason: 'Castiga carries expuestos y drafts sin peel suficiente.',
    tags: ['pick', 'dive', 'backline', 'mobility'],
  },
  {
    champion: "Kha'Zix",
    category: 'Anti-carry',
    reason: 'Aprovecha objetivos aislados y castiga mala visión.',
    tags: ['pick', 'vision', 'dive', 'mobility'],
  },
  {
    champion: 'Rengar',
    category: 'Anti-carry',
    reason: 'Explota backlines poco protegidas y partidas abiertas.',
    tags: ['pick', 'vision', 'dive', 'mobility'],
  },
];

function uniqueLabels(values = []) {
  return uniqueOrdered(values.map((value) => getLabelText(value)).filter(Boolean));
}

function collectAnalysisSignals(analysis = {}) {
  const text = normalizeText(
    [
      analysis?.primaryIdentity,
      analysis?.tempo,
      analysis?.tempoDetail?.label,
      analysis?.tempoDetail?.detail,
      analysis?.summaryText,
      analysis?.coherence?.label,
      analysis?.coherence?.detail,
      analysis?.winCondition?.label,
      analysis?.winCondition?.detail,
      ...(Array.isArray(analysis?.strengths) ? analysis.strengths : []),
      ...(Array.isArray(analysis?.weaknesses) ? analysis.weaknesses : []),
      ...(Array.isArray(analysis?.synergies) ? analysis.synergies.map((item) => item?.label || item) : []),
      ...(Array.isArray(analysis?.dependencies?.items) ? analysis.dependencies.items.map((item) => item?.label || item) : []),
      ...(Array.isArray(analysis?.assistant?.insights) ? analysis.assistant.insights.map((item) => item?.label || item) : []),
      ...(Array.isArray(analysis?.advisor?.objectivePriority) ? analysis.advisor.objectivePriority.map((item) => item?.label || item) : []),
    ]
      .filter(Boolean)
      .join(' ')
  );

  const has = (terms = []) => terms.some((term) => text.includes(normalizeText(term)));

  return {
    text,
    frontToBack: has(['front to back', 'fronttoback', 'frontline', 'protect', 'peel']),
    poke: has(['poke', 'siege']),
    splitpush: has(['splitpush', 'side lane', 'sidelane', 'abrir mapa']),
    dive: has(['dive']),
    pick: has(['pick', 'catch']),
    engage: has(['engage', 'inici', 'entry', 'start']),
    teamfight: has(['teamfight', '5v5', 'wombo']),
    control: has(['control', 'vision', 'objective']),
    scaling: has(['scaling', 'late', 'escala']),
    globalPressure: has(['global pressure', 'globalpressure', 'global']),
    carry: has(['carry', 'adc', 'hypercarry']),
  };
}

function scoreBanCandidate(candidate, signals) {
  const candidateTags = candidate.tags.map((tag) => normalizeText(tag));
  const triggerMap = [
    ['frontToBack', 4],
    ['poke', 4],
    ['splitpush', 4],
    ['dive', 4],
    ['pick', 4],
    ['engage', 3],
    ['teamfight', 3],
    ['control', 3],
    ['scaling', 2],
    ['globalPressure', 3],
    ['carry', 2],
  ];

  let score = 0;
  const matchedSignals = [];

  triggerMap.forEach(([signalKey, weight]) => {
    if (!signals[signalKey]) return;
    if (candidateTags.some((tag) => normalizeText(signalKey).includes(tag) || tag.includes(normalizeText(signalKey)) || tag === normalizeText(signalKey))) {
      score += weight;
      matchedSignals.push(signalKey);
    }
  });

  const reasonText = normalizeText([candidate.reason, candidate.category, candidate.champion].join(' '));
  if (signals.text.includes(normalizeText(candidate.champion))) {
    score += 1;
  }
  if (signals.text.includes(normalizeText(candidate.category))) {
    score += 1;
  }
  if (candidateTags.some((tag) => signals.text.includes(tag))) {
    score += 1;
  }
  if (reasonText.includes('front') && signals.frontToBack) score += 1;
  if (reasonText.includes('poke') && signals.poke) score += 1;
  if (reasonText.includes('pick') && signals.pick) score += 1;
  if (reasonText.includes('dive') && signals.dive) score += 1;
  if (reasonText.includes('split') && signals.splitpush) score += 1;

  return {
    score,
    matchedSignals: uniqueOrdered(matchedSignals),
  };
}

function buildSeverity(score) {
  if (score >= 9) return 'Prioritario';
  if (score >= 7) return 'Fuerte';
  return 'Situacional';
}

function buildBanEntry(candidate, score, matchedSignals, analysis) {
  const context = matchedSignals.length
    ? matchedSignals.map((signal) => signal.replace(/([a-z])([A-Z])/g, '$1 $2')).join(' · ')
    : analysis?.winCondition?.label || analysis?.primaryIdentity || 'Tu plan de juego';

  return {
    champion: candidate.champion,
    category: candidate.category,
    severity: buildSeverity(score),
    score: clampNumber(score, 1, 10),
    detail: candidate.reason,
    reason: `${candidate.reason} (${context})`,
    signals: matchedSignals,
  };
}

export function buildBanRecommendations(analysis = {}, limit = 4) {
  const signals = collectAnalysisSignals(analysis);
  const scored = BAN_CATALOG.map((candidate) => {
    const { score, matchedSignals } = scoreBanCandidate(candidate, signals);
    return buildBanEntry(candidate, score, matchedSignals, analysis);
  });

  const ordered = scored
    .sort((a, b) => b.score - a.score || compareLabels(a.champion, b.champion))
    .filter((item, index, array) => array.findIndex((entry) => normalizeText(entry.champion) === normalizeText(item.champion)) === index);

  const selected = ordered.slice(0, Math.max(3, limit));
  const fallback = [
    {
      champion: 'Poppy',
      category: 'Anti-dive',
      severity: 'Situacional',
      score: 5,
      detail: 'Corta engages y entradas directas.',
      reason: 'Corta engages y entradas directas.',
      signals: [],
    },
    {
      champion: 'Nocturne',
      category: 'Anti-vision',
      severity: 'Situacional',
      score: 4,
      detail: 'Castiga poca visión y backlines expuestas.',
      reason: 'Castiga poca visión y backlines expuestas.',
      signals: [],
    },
    {
      champion: 'Brand',
      category: 'Anti-frontline',
      severity: 'Situacional',
      score: 4,
      detail: 'Castiga peleas agrupadas y frontlines largas.',
      reason: 'Castiga peleas agrupadas y frontlines largas.',
      signals: [],
    },
  ];

  const pool = selected.length ? selected : fallback;

  return {
    summary: 'Prohibiciones que castigan mejor tu composición actual.',
    items: pool.slice(0, limit).map((item, index) => ({
      ...item,
      rank: index + 1,
      short: `${item.champion} · ${item.severity}`,
    })),
    highlights: uniqueLabels(pool.map((item) => item.category)).slice(0, 3),
  };
}
