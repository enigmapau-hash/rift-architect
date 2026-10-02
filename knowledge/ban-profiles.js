import { normalizeText } from '../js/engine/utils.js';

export const BAN_PROFILE_RULES = [
  {
    key: 'dive',
    label: 'Dive',
    kind: 'identity',
    match: ['dive', 'engage', 'pick', 'skirmish'],
    focus: 'Cortar la entrada y negar la segunda ventana',
    summary: 'Tu plan necesita entrar con visión y cerrar la pelea rápido; los mejores bans son los que rompen el all-in y alargan la respuesta rival.',
    bans: [
      {
        champion: 'Poppy',
        reason: 'Su anti-dash corta tu entrada y te obliga a entrar sin ritmo.',
        priority: 'critical',
        weight: 100,
        tags: ['disengage', 'anti-dive'],
      },
      {
        champion: 'Janna',
        reason: 'Desarma el all-in y convierte tu engage en una pelea incómoda.',
        priority: 'critical',
        weight: 98,
        tags: ['disengage', 'peel'],
      },
      {
        champion: 'Lulu',
        reason: 'Protege al carry y te rompe la ventana corta de ejecución.',
        priority: 'high',
        weight: 96,
        tags: ['peel', 'anti-burst'],
      },
      {
        champion: 'Tahm Kench',
        reason: 'Salva al objetivo clave y te frustra el pick o la cadena de daño.',
        priority: 'high',
        weight: 94,
        tags: ['peel', 'anti-pick'],
      },
      {
        champion: 'Renata Glasc',
        reason: 'Castiga la entrada frontal y alarga la pelea más de lo que te conviene.',
        priority: 'high',
        weight: 92,
        tags: ['anti-engage', 'disengage'],
      },
    ],
  },
  {
    key: 'engage',
    label: 'Engage',
    kind: 'identity',
    match: ['engage', 'pick', 'mobility'],
    focus: 'Romper la iniciación limpia y forzar respuestas tempranas',
    summary: 'Si tu valor depende de una iniciación clara, quieres banear lo que corta el tempo, bloquea el acceso y niega el follow-up.',
    bans: [
      {
        champion: 'Janna',
        reason: 'Su disengage te obliga a entrar sin cobertura.',
        priority: 'critical',
        weight: 100,
        tags: ['disengage', 'anti-engage'],
      },
      {
        champion: 'Poppy',
        reason: 'Bloquea desplazamientos y neutraliza muchas entradas limpias.',
        priority: 'critical',
        weight: 98,
        tags: ['anti-engage', 'disengage'],
      },
      {
        champion: 'Morgana',
        reason: 'El escudo negro castiga tu ventana de inicio y el pick aislado.',
        priority: 'high',
        weight: 96,
        tags: ['anti-pick', 'peel'],
      },
      {
        champion: 'Tahm Kench',
        reason: 'Niega el castigo sobre el carry objetivo y rompe la cadena de daño.',
        priority: 'high',
        weight: 94,
        tags: ['peel', 'anti-pick'],
      },
      {
        champion: 'Braum',
        reason: 'Reduce mucho el valor de una entrada frontal sin ventaja de visión.',
        priority: 'high',
        weight: 92,
        tags: ['peel', 'anti-dive'],
      },
    ],
  },
  {
    key: 'pick',
    label: 'Pick',
    kind: 'identity',
    match: ['pick', 'engage', 'mobility'],
    focus: 'Quitar respuestas seguras y castigar la visión',
    summary: 'Tu composición gana cuando un error aislado se convierte en objetivo; los bans deben cortar los recursos que salvan al objetivo y los que limpian la niebla.',
    bans: [
      {
        champion: 'Morgana',
        reason: 'El escudo negro reduce mucho el valor del pick puntual.',
        priority: 'critical',
        weight: 100,
        tags: ['anti-pick', 'peel'],
      },
      {
        champion: 'Sivir',
        reason: 'Su limpieza y escudo dificultan convertir el pick en asesinato.',
        priority: 'high',
        weight: 98,
        tags: ['anti-pick', 'waveclear'],
      },
      {
        champion: 'Tahm Kench',
        reason: 'Salva al objetivo y te rompe la conversión del pick.',
        priority: 'high',
        weight: 96,
        tags: ['peel', 'anti-pick'],
      },
      {
        champion: 'Janna',
        reason: 'Desordena la entrada y desactiva la caza corta.',
        priority: 'high',
        weight: 94,
        tags: ['disengage', 'peel'],
      },
      {
        champion: 'Braum',
        reason: 'Cierra el espacio y castiga el follow-up sobre el objetivo aislado.',
        priority: 'medium',
        weight: 90,
        tags: ['peel', 'anti-pick'],
      },
    ],
  },
  {
    key: 'poke',
    label: 'Poke',
    kind: 'identity',
    match: ['poke', 'siege', 'control'],
    focus: 'Forzar la entrada antes de que el asedio te desgaste',
    summary: 'Si tu plan vive de desgastar, quieres banear iniciadores que entren de golpe y rompan la distancia.',
    bans: [
      {
        champion: 'Zac',
        reason: 'Su alcance y amenaza de engage castigan muchísimo una línea de poke.',
        priority: 'critical',
        weight: 100,
        tags: ['engage', 'anti-poke'],
      },
      {
        champion: 'Rell',
        reason: 'Convierte una zona abierta en una pelea corta muy incómoda.',
        priority: 'critical',
        weight: 98,
        tags: ['engage', 'anti-siege'],
      },
      {
        champion: 'Hecarim',
        reason: 'Su velocidad rompe el espacio que necesitas para desgastar.',
        priority: 'high',
        weight: 96,
        tags: ['dive', 'anti-poke'],
      },
      {
        champion: 'Nocturne',
        reason: 'Niega la seguridad del asedio y obliga a jugar con miedo.',
        priority: 'high',
        weight: 94,
        tags: ['pick', 'anti-poke'],
      },
      {
        champion: 'Malphite',
        reason: 'Su engage directo obliga a responder antes de haber desgastado.',
        priority: 'high',
        weight: 92,
        tags: ['engage', 'anti-siege'],
      },
    ],
  },
  {
    key: 'splitpush',
    label: 'Splitpush',
    kind: 'identity',
    match: ['splitpush', 'split', 'side lane', 'mobility'],
    focus: 'Cortar las respuestas globales y el colapso lateral',
    summary: 'Tu plan se gana abriendo mapa y castigando respuestas. Banea lo que te iguala el mapa, te persigue en laterales o te fuerza a pelear 5v5 antes de tiempo.',
    bans: [
      {
        champion: 'Twisted Fate',
        reason: 'Su definitiva convierte tu lateral en una respuesta global inmediata.',
        priority: 'critical',
        weight: 100,
        tags: ['global', 'anti-split'],
      },
      {
        champion: 'Shen',
        reason: 'Protege el lateral y hace muy difícil aislar una ventaja real.',
        priority: 'critical',
        weight: 98,
        tags: ['global', 'anti-split'],
      },
      {
        champion: 'Malphite',
        reason: 'Te obliga a respetar un 5v5 que no quieres jugar todavía.',
        priority: 'high',
        weight: 96,
        tags: ['engage', 'anti-split'],
      },
      {
        champion: 'Nocturne',
        reason: 'Su presión global castiga la visión y el push lateral sin info.',
        priority: 'high',
        weight: 94,
        tags: ['global', 'anti-split'],
      },
      {
        champion: 'Quinn',
        reason: 'Gana el duelo lateral y te quita libertad para abrir mapa.',
        priority: 'high',
        weight: 92,
        tags: ['duel', 'anti-split'],
      },
    ],
  },
  {
    key: 'fronttoback',
    label: 'Front to Back',
    kind: 'identity',
    match: ['fronttoback', 'front to back', 'teamfight', 'control'],
    focus: 'Evitar el daño que rompe la línea frontal',
    summary: 'Si ganas de frente, los bans deben ir contra campeones que atraviesan la frontline o castigan demasiado la agrupación ordenada.',
    bans: [
      {
        champion: 'Karthus',
        reason: 'Castiga el front-to-back incluso sin entrar en la pelea.',
        priority: 'critical',
        weight: 100,
        tags: ['global', 'anti-frontline'],
      },
      {
        champion: 'Brand',
        reason: 'Destruye agrupaciones y hace muy incómodo el espacio frontal.',
        priority: 'critical',
        weight: 98,
        tags: ['aoe', 'anti-frontline'],
      },
      {
        champion: 'Ziggs',
        reason: 'Te obliga a avanzar bajo daño y rompe el ritmo del carry protegido.',
        priority: 'high',
        weight: 96,
        tags: ['poke', 'anti-frontline'],
      },
      {
        champion: 'Kennen',
        reason: 'Castiga la agrupación y la línea frontal con una pelea explosiva.',
        priority: 'high',
        weight: 94,
        tags: ['aoe', 'anti-frontline'],
      },
      {
        champion: 'Vayne',
        reason: 'Ignora parte de tu primera línea si la partida se alarga demasiado.',
        priority: 'high',
        weight: 92,
        tags: ['anti-tank', 'anti-frontline'],
      },
    ],
  },
  {
    key: 'protect',
    label: 'Protect',
    kind: 'identity',
    match: ['protect', 'peel', 'frontline'],
    focus: 'Quitar el daño que borra al carry protegido',
    summary: 'Si tu plan es proteger y escalar, banea el daño que entra por área o atraviesa tu pantalla frontal demasiado rápido.',
    bans: [
      {
        champion: 'Kennen',
        reason: 'Una iniciación en área puede borrar la protección del carry muy rápido.',
        priority: 'critical',
        weight: 100,
        tags: ['aoe', 'anti-protect'],
      },
      {
        champion: 'Karthus',
        reason: 'Su daño global castiga incluso una defensa perfecta.',
        priority: 'critical',
        weight: 98,
        tags: ['global', 'anti-protect'],
      },
      {
        champion: 'Brand',
        reason: 'Deshace las peleas ordenadas y castiga la agrupación de protección.',
        priority: 'high',
        weight: 96,
        tags: ['aoe', 'anti-protect'],
      },
      {
        champion: 'Malphite',
        reason: 'Forza una ventana de all-in muy incómoda para el carry protegido.',
        priority: 'high',
        weight: 94,
        tags: ['engage', 'anti-protect'],
      },
      {
        champion: 'Ziggs',
        reason: 'Te obliga a moverte y rompe la comodidad del front-to-back.',
        priority: 'high',
        weight: 92,
        tags: ['poke', 'anti-protect'],
      },
    ],
  },
  {
    key: 'teamfight',
    label: 'Teamfight',
    kind: 'identity',
    match: ['teamfight', 'control', 'objective'],
    focus: 'Romper el 5v5 ordenado antes de que encuentre su forma',
    summary: 'Una composición de teamfight se quiere pelear ordenada; los bans deben impedirle agruparse cómoda y cerrar en choke point.',
    bans: [
      {
        champion: 'Twisted Fate',
        reason: 'La presión global desordena el 5v5 y te obliga a repartir recursos.',
        priority: 'critical',
        weight: 100,
        tags: ['global', 'anti-teamfight'],
      },
      {
        champion: 'Shen',
        reason: 'Añade respuestas laterales que rompen el orden del 5v5.',
        priority: 'critical',
        weight: 98,
        tags: ['global', 'anti-teamfight'],
      },
      {
        champion: 'Nocturne',
        reason: 'Rompe la visión y abre una pelea descontrolada.',
        priority: 'high',
        weight: 96,
        tags: ['global', 'anti-teamfight'],
      },
      {
        champion: 'Quinn',
        reason: 'Castiga el agrupamiento y te obliga a defender laterales.',
        priority: 'high',
        weight: 94,
        tags: ['split', 'anti-teamfight'],
      },
      {
        champion: 'Poppy',
        reason: 'Su control sobre las entradas puede frenar el inicio de la pelea que quieres jugar.',
        priority: 'high',
        weight: 92,
        tags: ['disengage', 'anti-teamfight'],
      },
    ],
  },
  {
    key: 'control',
    label: 'Control',
    kind: 'identity',
    match: ['control', 'objective', 'vision'],
    focus: 'Quitar el colapso global y el castigo a la visión',
    summary: 'Si tu valor sale del control de zonas, quieres banear lo que te obliga a jugar a ciegas o a responder demasiado tarde en el mapa.',
    bans: [
      {
        champion: 'Nocturne',
        reason: 'Te roba la seguridad sobre la visión y los objetivos.',
        priority: 'critical',
        weight: 100,
        tags: ['global', 'anti-control'],
      },
      {
        champion: 'Twisted Fate',
        reason: 'Convierte cada división del mapa en una amenaza real.',
        priority: 'critical',
        weight: 98,
        tags: ['global', 'anti-control'],
      },
      {
        champion: 'Quinn',
        reason: 'Castiga el despliegue de visión y el control de laterales.',
        priority: 'high',
        weight: 96,
        tags: ['split', 'anti-control'],
      },
      {
        champion: 'Karthus',
        reason: 'Presiona objetivos y castiga cualquier pelea cerrada sin espacio.',
        priority: 'high',
        weight: 94,
        tags: ['global', 'anti-control'],
      },
      {
        champion: 'Malphite',
        reason: 'Rompe la estabilidad del mapa con un engage muy directo.',
        priority: 'high',
        weight: 92,
        tags: ['engage', 'anti-control'],
      },
    ],
  },
  {
    key: 'skirmish',
    label: 'Skirmish',
    kind: 'identity',
    match: ['skirmish', 'brawl', 'early', 'mid'],
    focus: 'Quitar los frenos que convierten la pelea corta en pelea larga',
    summary: 'Cuando quieres pelear en ventanas pequeñas, lo peor es un rival que te alarga el intercambio o te corta el ritmo con control y peel.',
    bans: [
      {
        champion: 'Maokai',
        reason: 'Su control y su capacidad de cortar la pelea hacen muy incómodo el skirmish.',
        priority: 'critical',
        weight: 100,
        tags: ['control', 'anti-skirmish'],
      },
      {
        champion: 'Rammus',
        reason: 'Te obliga a replantear el daño en una pelea corta.',
        priority: 'critical',
        weight: 98,
        tags: ['anti-carry', 'anti-skirmish'],
      },
      {
        champion: 'Poppy',
        reason: 'Corta desplazamientos y rompe el tempo del combate corto.',
        priority: 'high',
        weight: 96,
        tags: ['disengage', 'anti-skirmish'],
      },
      {
        champion: 'Renata Glasc',
        reason: 'Alarga la pelea y castiga la ejecución rápida.',
        priority: 'high',
        weight: 94,
        tags: ['anti-burst', 'anti-skirmish'],
      },
      {
        champion: 'Lissandra',
        reason: 'Puede congelar a la pieza clave y desordenar el remate.',
        priority: 'high',
        weight: 92,
        tags: ['cc', 'anti-skirmish'],
      },
    ],
  },
  {
    key: 'siege',
    label: 'Siege',
    kind: 'pattern',
    match: ['siege', 'poke', 'objective'],
    focus: 'Forzar la entrada antes de que el asedio te desgaste',
    summary: 'El asedio necesita rango y espacio; los bans deben traer iniciación rápida o presión global que rompa la distancia.',
    bans: [
      {
        champion: 'Zac',
        reason: 'Su engage castiga muchísimo una línea de asedio estática.',
        priority: 'critical',
        weight: 100,
        tags: ['engage', 'anti-siege'],
      },
      {
        champion: 'Rell',
        reason: 'Convierte un asedio en una pelea cerrada muy incómoda.',
        priority: 'critical',
        weight: 98,
        tags: ['engage', 'anti-siege'],
      },
      {
        champion: 'Hecarim',
        reason: 'Su velocidad rompe la distancia que necesita el asedio.',
        priority: 'high',
        weight: 96,
        tags: ['dive', 'anti-siege'],
      },
      {
        champion: 'Nocturne',
        reason: 'La amenaza de colapso te obliga a dejar de asediar.',
        priority: 'high',
        weight: 94,
        tags: ['global', 'anti-siege'],
      },
      {
        champion: 'Kennen',
        reason: 'Un engage en área puede tumbar el asedio de golpe.',
        priority: 'high',
        weight: 92,
        tags: ['aoe', 'anti-siege'],
      },
    ],
  },
];

export const BAN_PROFILE_INDEX = buildBanProfileIndex(BAN_PROFILE_RULES);

export function buildBanProfileIndex(profiles = BAN_PROFILE_RULES) {
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

export function findBanProfile(query = '', signalSet = null) {
  const normalizedQuery = normalizeText(query);
  const signals = normalizeSignalSet(signalSet);

  if (normalizedQuery && BAN_PROFILE_INDEX.has(normalizedQuery)) {
    return BAN_PROFILE_INDEX.get(normalizedQuery);
  }

  let bestProfile = null;
  let bestScore = 0;

  for (const profile of BAN_PROFILE_RULES) {
    const score = scoreProfile(profile, normalizedQuery, signals);
    if (score > bestScore) {
      bestScore = score;
      bestProfile = profile;
    }
  }

  return bestScore > 0 ? bestProfile : null;
}

export function summarizeBanProfile(profile) {
  if (!profile) return null;

  return {
    key: profile.key,
    label: profile.label,
    kind: profile.kind,
    summary: profile.summary,
    focus: profile.focus,
    bans: sliceList(profile.bans).map((ban) => ({ ...ban })),
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
  });

  signals.labels.forEach((label) => {
    const normalizedLabel = normalizeText(label);
    if (!normalizedLabel) return;
    if (profileNormalized.some((value) => value === normalizedLabel || value.includes(normalizedLabel) || normalizedLabel.includes(value))) {
      score += 4;
    }
  });

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
    profile.focus,
    profile.summary,
    ...(Array.isArray(profile.match) ? profile.match : []),
    ...(Array.isArray(profile.bans) ? profile.bans.flatMap((ban) => [ban.champion, ban.reason, ...(Array.isArray(ban.tags) ? ban.tags : [])]) : []),
  ]);
}

function sliceList(values = []) {
  return Array.isArray(values) ? values.slice(0, 6) : [];
}

function uniqueValues(values = []) {
  return [...new Set(values.map((value) => String(value ?? '').trim()).filter(Boolean))];
}
