import { normalizeText } from '../js/engine/utils.js';

export const PICK_PROFILE_RULES = [
  {
    key: 'dive',
    label: 'Dive',
    kind: 'identity',
    match: ['dive', 'engage', 'pick', 'skirmish'],
    focus: 'Cerrar la entrada y evitar que el all-in se quede sin follow-up',
    summary: 'El último pick debe convertir una entrada corta en una jugada completa y evitar que el rival pueda estabilizar la pelea.',
    needs: ['engage', 'mobility', 'pick', 'frontline'],
    wants: ['burst', 'followup', 'vision'],
    avoid: ['poke', 'slow'],
    timings: ['Early', 'Mid'],
  },
  {
    key: 'engage',
    label: 'Engage',
    kind: 'identity',
    match: ['engage', 'pick', 'mobility'],
    focus: 'Asegurar una iniciación limpia y proteger la ventana de follow-up',
    summary: 'Si la composición depende de entrar primero, el último pick debe asegurar el inicio o blindar la respuesta rival.',
    needs: ['engage', 'followup', 'vision', 'mobility'],
    wants: ['frontline', 'control', 'pick'],
    avoid: ['disengage', 'slow'],
    timings: ['Early', 'Mid'],
  },
  {
    key: 'pick',
    label: 'Pick',
    kind: 'identity',
    match: ['pick', 'engage', 'mobility'],
    focus: 'Castigar la visión y convertir errores pequeños en ventaja real',
    summary: 'El último pick debería cerrar la caza, asegurar el objetivo aislado y facilitar la conversión a torres o Nashor.',
    needs: ['pick', 'vision', 'burst', 'mobility'],
    wants: ['engage', 'control', 'followup'],
    avoid: ['hard peel', 'disengage'],
    timings: ['Early', 'Mid'],
  },
  {
    key: 'poke',
    label: 'Poke',
    kind: 'identity',
    match: ['poke', 'siege', 'control'],
    focus: 'Asegurar rango, waveclear y control de zona',
    summary: 'Si el plan es desgastar, el último pick debe evitar que el rival llegue limpio a corta distancia.',
    needs: ['poke', 'control', 'waveclear', 'vision'],
    wants: ['objective', 'range', 'zone'],
    avoid: ['hard engage', 'dive'],
    timings: ['Mid', 'Late'],
  },
  {
    key: 'splitpush',
    label: 'Splitpush',
    kind: 'identity',
    match: ['splitpush', 'split', 'side lane', 'mobility'],
    focus: 'Abrir mapa y castigar las respuestas globales',
    summary: 'El último pick debe dar presión lateral, salida y capacidad de sobrevivir al colapso enemigo.',
    needs: ['splitpush', 'mobility', 'duel', 'objective'],
    wants: ['global', 'waveclear', 'side lane'],
    avoid: ['hard engage', 'vision denial'],
    timings: ['Mid', 'Late'],
  },
  {
    key: 'fronttoback',
    label: 'Front to Back',
    kind: 'identity',
    match: ['fronttoback', 'front to back', 'teamfight', 'control'],
    focus: 'Sostener la línea frontal y proteger el carry',
    summary: 'El último pick debe evitar que el rival rompa la frontline o gane la pelea antes de que el carry entre en rango.',
    needs: ['frontline', 'peel', 'control', 'carry'],
    wants: ['vision', 'objective', 'waveclear'],
    avoid: ['dive', 'splitpush'],
    timings: ['Mid', 'Late'],
  },
  {
    key: 'protect',
    label: 'Protect',
    kind: 'identity',
    match: ['protect', 'fronttoback', 'control'],
    focus: 'Blindar al carry y ganar por escalado ordenado',
    summary: 'Cuando la composición protege un hiper-carry, el último pick debe reforzar peel, frontline o control de zona.',
    needs: ['peel', 'frontline', 'scaling', 'control'],
    wants: ['carry', 'vision', 'waveclear'],
    avoid: ['early all-in', 'splitpush'],
    timings: ['Late'],
  },
  {
    key: 'control',
    label: 'Control',
    kind: 'identity',
    match: ['control', 'objective', 'teamfight'],
    focus: 'Ordenar la pelea y cerrar objetivos con visión',
    summary: 'Si el plan gana por espacio y control, el último pick debe dar waveclear, zona segura o capacidad de cerrar la entrada rival.',
    needs: ['control', 'objective', 'waveclear', 'vision'],
    wants: ['frontline', 'peel', 'teamfight'],
    avoid: ['chaos', 'splitpush'],
    timings: ['Mid', 'Late'],
  },
];

export const PICK_PROFILE_INDEX = buildPickProfileIndex(PICK_PROFILE_RULES);

export function buildPickProfileIndex(profiles = PICK_PROFILE_RULES) {
  const index = new Map();

  profiles.forEach((profile) => {
    const keys = [profile.key, profile.label, ...(Array.isArray(profile.aliases) ? profile.aliases : [])]
      .map((value) => normalizeText(value))
      .filter(Boolean);

    keys.forEach((key) => {
      if (!index.has(key)) index.set(key, profile);
    });
  });

  return index;
}

export function findPickProfile(query = '', signalSet = null) {
  const normalizedQuery = normalizeText(query);
  const signals = normalizeSignalSet(signalSet);

  if (normalizedQuery && PICK_PROFILE_INDEX.has(normalizedQuery)) {
    return PICK_PROFILE_INDEX.get(normalizedQuery);
  }

  let bestProfile = null;
  let bestScore = 0;

  for (const profile of PICK_PROFILE_RULES) {
    const score = scoreProfile(profile, normalizedQuery, signals);
    if (score > bestScore) {
      bestScore = score;
      bestProfile = profile;
    }
  }

  return bestScore > 0 ? bestProfile : null;
}

export function summarizePickProfile(profile) {
  if (!profile) return null;

  return {
    key: profile.key,
    label: profile.label,
    kind: profile.kind,
    focus: profile.focus,
    summary: profile.summary,
    needs: sliceList(profile.needs),
    wants: sliceList(profile.wants),
    avoid: sliceList(profile.avoid),
    timings: sliceList(profile.timings),
    signals: buildProfileSignals(profile).slice(0, 16),
  };
}

function scoreProfile(profile, normalizedQuery, signals) {
  let score = 0;
  const profileSignals = buildProfileSignals(profile);
  const profileNormalized = profileSignals.map((value) => normalizeText(value));

  if (normalizedQuery) {
    if (normalizeText(profile.key) === normalizedQuery) score += 50;
    if (normalizeText(profile.label) === normalizedQuery) score += 45;
    if (profileNormalized.some((value) => value === normalizedQuery)) score += 20;
  }

  signals.categories.forEach((category) => {
    if (Array.isArray(profile.match) && profile.match.includes(category)) score += 12;
    if (Array.isArray(profile.needs) && profile.needs.includes(category)) score += 6;
    if (Array.isArray(profile.avoid) && profile.avoid.includes(category)) score -= 3;
  });

  signals.labels.forEach((label) => {
    const normalizedLabel = normalizeText(label);
    if (!normalizedLabel) return;
    if (profileNormalized.some((value) => value === normalizedLabel || value.includes(normalizedLabel) || normalizedLabel.includes(value))) {
      score += 4;
    }
  });

  if (Array.isArray(profile.timings) && profile.timings.some((timing) => signals.labels.includes(timing) || signals.categories.includes(normalizeText(timing)))) {
    score += 8;
  }

  return score;
}

function normalizeSignalSet(signalSet) {
  if (!signalSet || typeof signalSet !== 'object') {
    return { labels: [], categories: [] };
  }

  return {
    labels: uniqueValues([
      ...(Array.isArray(signalSet.labels) ? signalSet.labels : []),
      ...(Array.isArray(signalSet.signals) ? signalSet.signals : []),
    ]),
    categories: uniqueValues(Array.isArray(signalSet.categories) ? signalSet.categories : []),
  };
}

function buildProfileSignals(profile) {
  return uniqueValues([
    profile.key,
    profile.label,
    profile.kind,
    ...(Array.isArray(profile.match) ? profile.match : []),
    ...(Array.isArray(profile.needs) ? profile.needs : []),
    ...(Array.isArray(profile.wants) ? profile.wants : []),
    ...(Array.isArray(profile.avoid) ? profile.avoid : []),
    ...(Array.isArray(profile.timings) ? profile.timings : []),
    profile.focus,
    profile.summary,
  ]);
}

function sliceList(values = []) {
  return Array.isArray(values) ? values.slice(0, 6) : [];
}

function uniqueValues(values = []) {
  return [...new Set(values.map((value) => String(value ?? '').trim()).filter(Boolean))];
}
