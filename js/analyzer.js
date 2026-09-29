const METRICS = [
  { key: 'frontline', label: 'Frontline', terms: ['frontline', 'tanque', 'warden', 'peel', 'sustain'] },
  { key: 'engage', label: 'Engage', terms: ['engage', 'pick', 'hook', 'inici', 'enganch', 'flanqueo'] },
  { key: 'damage', label: 'Daño', terms: ['dps', 'burst', 'carry', 'hypercarry', 'marksman', 'battlemage', 'juggernaut', 'bruiser'] },
  { key: 'poke', label: 'Poke/Asedio', terms: ['poke', 'asedio', 'artillery', 'siege'] },
  { key: 'teamfight', label: 'Teamfight', terms: ['teamfight', 'team fight', 'lucha grupal', 'objetivos'] },
  { key: 'mobility', label: 'Movilidad', terms: ['movilidad', 'dash', 'mobile', 'roam', 'backline'] },
  { key: 'control', label: 'Control', terms: ['cc', 'control', 'vision', 'visión', 'anti-engage', 'anti engage', 'control de zonas'] },
  { key: 'scaling', label: 'Escalado', terms: ['scaling', 'escalado', 'late', 'hypercarry'] },
];

const ROLE_NAMES = {
  top: 'Top',
  jungle: 'Jungla',
  mid: 'Mid',
  botline: 'Botline',
  support: 'Support',
};

export function analyzeComposition(selectedChampions) {
  const aggregate = Object.fromEntries(METRICS.map((metric) => [metric.key, 0]));
  let ap = 0;
  let ad = 0;

  selectedChampions.forEach((champion) => {
    const text = buildSearchText(champion);
    METRICS.forEach((metric) => {
      aggregate[metric.key] += scoreText(text, metric.terms);
    });

    const damage = champion.function.toLowerCase();
    if (damage.includes('ap')) ap += 1;
    if (damage.includes('ad')) ad += 1;
  });

  const metrics = METRICS.map((metric) => ({
    label: metric.label,
    score: clamp(Math.round((aggregate[metric.key] / Math.max(selectedChampions.length, 1)) * 2), 0, 10),
  }));

  const recommendations = [];
  if (selectedChampions.length < 5) {
    recommendations.push(`Te faltan ${5 - selectedChampions.length} pick(s) para completar la composición.`);
  }

  if (ap === 0) {
    recommendations.push('No veo daño AP claro en la composición.');
  } else if (ad === 0) {
    recommendations.push('No veo daño AD claro en la composición.');
  }

  if (metrics.find((m) => m.label === 'Frontline')?.score < 5) {
    recommendations.push('Falta frontline real para entrar a objetivos o aguantar front-to-back.');
  }

  if (metrics.find((m) => m.label === 'Engage')?.score < 5) {
    recommendations.push('El draft tiene poco engage directo: te costará forzar peleas.');
  }

  if (metrics.find((m) => m.label === 'Escalado')?.score >= 7) {
    recommendations.push('La composición parece más fuerte en partidas largas.');
  }

  if (!recommendations.length) {
    recommendations.push('La composición está bastante equilibrada para una partida estándar.');
  }

  const strongest = [...metrics].sort((a, b) => b.score - a.score)[0];
  const weakest = [...metrics].sort((a, b) => a.score - b.score)[0];

  return {
    summaryTitle: `${strongest.label} destaca`,
    summaryText: `El punto más fuerte ahora mismo es ${strongest.label.toLowerCase()}, mientras que ${weakest.label.toLowerCase()} es lo más flojo.`,
    metrics,
    recommendations,
  };
}

export function getRoleInsights(selectedChampions) {
  const picksByRole = Object.fromEntries(selectedChampions.map((champion) => [champion.role, champion]));
  const insights = [];

  for (const [role, label] of Object.entries(ROLE_NAMES)) {
    if (!picksByRole[role]) {
      insights.push(`Falta ${label}.`);
    }
  }

  return insights;
}

function buildSearchText(champion) {
  return [
    champion.identity,
    champion.function,
    champion.tempo,
    champion.strengths.join(' '),
    champion.weaknesses.join(' '),
  ]
    .join(' ')
    .toLowerCase();
}

function scoreText(text, terms) {
  return terms.reduce((score, term) => score + (text.includes(term.toLowerCase()) ? 1 : 0), 0);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}