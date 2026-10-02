import { normalizeText } from '../js/engine/utils.js';

export const STRATEGIC_PROFILES_V2 = [
  {
    key: 'dive',
    label: 'Dive',
    kind: 'identity',
    categories: ['engage', 'pick', 'mobility', 'damage'],
    summary: 'Aunque eres Dive, tu backline es frágil: entra con visión y no abras de frente.',
    condition: 'Si enfrente hay más engage o peel, tu condición cambia: castiga la segunda entrada y no abras de frente.',
    winsAgainst: ['Composiciones lentas', 'Backline sin peel', 'Poke estático'],
    losesAgainst: ['Hard engage', 'Disengage', 'Peel fuerte', 'CC puntual'],
    needs: ['Visión previa', 'Flancos', 'Burst follow-up', 'Cooldowns sincronizados'],
    avoids: ['Abrir de frente', 'Peleas largas', 'Entrar sin visión'],
    timings: ['Early', 'Mid'],
    macro: ['Jugar en niebla', 'Buscar picks antes de objetivo', 'Convertir ventaja pequeña'],
    objectives: ['Herald', 'Primeras torres', 'Picks en niebla'],
    mistakes: ['Entrar sin fijar visión', 'Gastar cooldowns en tanques', 'Forzar una teamfight larga'],
  },
  {
    key: 'fronttoback',
    label: 'Front to Back',
    kind: 'identity',
    categories: ['frontline', 'teamfight', 'control'],
    summary: 'Tu pelea gana de frente: protege al carry, ordénala y no regales ángulos gratis.',
    condition: 'Si el rival rompe tu frontline, la pelea se reordena; protege al carry y fuerza el frente limpio.',
    winsAgainst: ['Composiciones caóticas', 'Dive desordenado', 'Peleas sin visión'],
    losesAgainst: ['Splitpush', 'Poke con alcance', 'Hard engage asimétrico'],
    needs: ['Frontline', 'Peel', 'DPS continuo', 'Visión de objetivo'],
    avoids: ['Perseguir picks lejanos', 'Dividirse', 'Abrir laterales sin necesidad'],
    timings: ['Mid', 'Late'],
    macro: ['Agruparse', 'Controlar objetivos', 'Pelear con la frontline'],
    objectives: ['Dragones', 'Baron', 'Torres centrales'],
    mistakes: ['Ignorar la protección del carry', 'Entrar desordenados', 'Cambiar de plan a mitad de pelea'],
  },
  {
    key: 'teamfight',
    label: 'Teamfight',
    kind: 'identity',
    categories: ['teamfight', 'control', 'objective'],
    summary: 'Tu valor crece cuando la pelea está ordenada; evita improvisar y fuerza el combate en terreno favorable.',
    condition: 'Si la pelea se alarga sin orden, tu ventaja cae; busca agruparte antes y cerrar el espacio.',
    winsAgainst: ['Composiciones partidas', 'Rotaciones pobres', 'Pequeñas peleas desordenadas'],
    losesAgainst: ['Splitpush', 'Poke largo', 'Pick en niebla'],
    needs: ['Visión', 'Agruparse', 'Iniciación clara', 'Peel al carry'],
    avoids: ['Entradas sueltas', 'Perseguir en laterales', 'Pelear sin prioridad'],
    timings: ['Mid', 'Late'],
    macro: ['Forzar 5v5', 'Tomar visión previa', 'Cerrar con objetivos'],
    objectives: ['Dragones', 'Baron', 'Soul fights'],
    mistakes: ['Pelear sin preparación', 'Perder el orden del front-to-back', 'Dividir la pelea'],
  },
  {
    key: 'engage',
    label: 'Engage',
    kind: 'identity',
    categories: ['engage', 'pick', 'mobility'],
    summary: 'Tu entrada manda la pelea: fija un objetivo, protege la ventana de follow-up y no te gastes sin visión.',
    condition: 'Si enfrente hay más engage o disengage, cambia la condición: entra sólo cuando la respuesta rival esté fijada.',
    winsAgainst: ['Composiciones lentas', 'Backline inmóvil', 'Errores de posición'],
    losesAgainst: ['Disengage', 'Peel fuerte', 'Visión profunda del rival'],
    needs: ['Visión adelantada', 'Follow-up', 'Ventana corta de castigo', 'Coordinación'],
    avoids: ['Entrar sin follow-up', 'Abrir en niebla sin info', 'Perseguir fuera de zona'],
    timings: ['Early', 'Mid'],
    macro: ['Forzar picks', 'Castigar rotaciones', 'Abrir objetivos con presión'],
    objectives: ['Herald', 'Primer dragón', 'Pick en río'],
    mistakes: ['Gastar la iniciación sin daño detrás', 'Entrar cuando el rival aún tiene todo', 'Romper la formación'],
  },
  {
    key: 'pick',
    label: 'Pick',
    kind: 'identity',
    categories: ['pick', 'engage', 'mobility'],
    summary: 'Tu mejor ventana es corta: visión, entrada limpia y objetivo antes de que la pelea se alargue.',
    condition: 'Si el rival juega agrupado y con visión cerrada, tu condición cambia: busca niebla y castiga errores cortos.',
    winsAgainst: ['Composiciones expuestas', 'Movilidad pobre', 'Rotaciones previsibles'],
    losesAgainst: ['5v5 cerrado', 'Peel fuerte', 'Visión constante'],
    needs: ['Visión', 'Burst', 'Rotaciones rápidas', 'Ventanas de castigo'],
    avoids: ['Pelear largo', 'Revelarte antes de tiempo', 'Forzar objetivos sin pick'],
    timings: ['Early', 'Mid'],
    macro: ['Controlar niebla', 'Cazar aislados', 'Convertir picks en objetivos'],
    objectives: ['Aislar líneas', 'Herald', 'Pick previo a Baron'],
    mistakes: ['Entrar sin cierre', 'Perder la paciencia', 'Convertir un pick en pelea eterna'],
  },
  {
    key: 'poke',
    label: 'Poke',
    kind: 'identity',
    categories: ['poke', 'control', 'objective'],
    summary: 'Tu plan vive en el desgaste; no cambies el asedio por una entrada corta sin haber ganado espacio primero.',
    condition: 'Si el rival te fuerza all-in, tu condición cambia: desgasta primero y sólo comprométete cuando hayas ganado espacio.',
    winsAgainst: ['Composiciones lentas', 'Peleas frontales sin acceso', 'Equipos que ceden espacio'],
    losesAgainst: ['Dive frontal', 'Engage instantáneo', 'Falta de waveclear'],
    needs: ['Rango', 'Waveclear', 'Visión', 'Espacio para asediar'],
    avoids: ['Entrar a corta distancia', 'Perseguir sin poke previo', 'Forzar 5v5 prematuro'],
    timings: ['Mid', 'Late'],
    macro: ['Asediar', 'Desgastar antes de entrar', 'Preparar objetivos con rango'],
    objectives: ['Torres', 'Dragones', 'Baron siege'],
    mistakes: ['Cambiar el asedio por un all-in', 'No mantener la distancia', 'Regalar iniciaciones'],
  },
  {
    key: 'splitpush',
    label: 'Splitpush',
    kind: 'identity',
    categories: ['splitpush', 'mobility', 'damage'],
    summary: 'La partida se abre por laterales; si la reduces a un 5v5 frontal, te quitas tu ventaja natural.',
    condition: 'Si el mapa se cierra, abre laterales antes de agruparte y no regales un 5v5 sin presión.',
    winsAgainst: ['5v5 estático', 'Mapas cerrados por mala visión', 'Equipos que no colapsan rápido'],
    losesAgainst: ['Hard engage', 'Visión profunda', 'Waveclear fuerte'],
    needs: ['Side lanes libres', 'Visión', 'Gestión de oleadas', 'Teleports o rotación rápida'],
    avoids: ['Agruparte demasiado pronto', 'Perder la ola', 'Cerrar la partida sin presión lateral'],
    timings: ['Mid', 'Late'],
    macro: ['Abrir laterales', 'Intercambiar objetivos', 'Forzar respuestas en mapa'],
    objectives: ['Torres laterales', 'Inhibidor', 'Presión sobre Baron'],
    mistakes: ['Ignorar la oleada', 'Agruparte sin necesidad', 'No coordinar la presión lateral'],
  },
  {
    key: 'protect',
    label: 'Protect',
    kind: 'identity',
    categories: ['frontline', 'control', 'teamfight'],
    summary: 'Tu estructura necesita tiempo: ralentiza el early para alcanzar tu pico de poder con carry y peel listos.',
    condition: 'Si te obligan a pelear sin carry protegido, baja el ritmo y reordena la pelea antes de comprometerte.',
    winsAgainst: ['Dive desordenado', 'Peleas cortas sin acceso', 'Composiciones que se precipitan'],
    losesAgainst: ['Poke largo', 'Splitpush', 'Engage constante sobre backline'],
    needs: ['Frontline', 'Peel', 'Tiempo', 'Escalado'],
    avoids: ['All-in temprano', 'Peleas partidas', 'Perseguir sin proteger al carry'],
    timings: ['Late', 'Mid'],
    macro: ['Ralentizar el early', 'Proteger al carry', 'Reagruparse para 5v5'],
    objectives: ['Dragones tardíos', 'Baron', 'Luchas front-to-back'],
    mistakes: ['Pelear antes del pico', 'Descolocar al carry', 'Forzar sin escalado'],
  },
  {
    key: 'control',
    label: 'Control',
    kind: 'identity',
    categories: ['control', 'objective', 'teamfight'],
    summary: 'Tu plan gana espacio con visión, control de zona y objetivos; no persigas peleas desordenadas.',
    condition: 'Si el mapa se vuelve caótico, vuelve a visión y control de zona antes de comprometer.',
    winsAgainst: ['Composiciones impulsivas', 'Equipos sin limpieza de oleadas', 'Entradas sueltas'],
    losesAgainst: ['Splitpush constante', 'Poke largo', 'Pick en niebla'],
    needs: ['Visión', 'Waveclear', 'Zona segura', 'Prudencia en objetivos'],
    avoids: ['Cazar sin visión', 'Abrir peleas sin terreno', 'Sobrerrotar'],
    timings: ['Mid', 'Late'],
    macro: ['Ordenar el mapa', 'Tomar espacio antes del objetivo', 'Cerrar zonas'],
    objectives: ['Dragones', 'Baron', 'Control de entrada'],
    mistakes: ['Perder el control del río', 'Pelear sin espacio', 'Dejar que el rival desordene el mapa'],
  },
  {
    key: 'skirmish',
    label: 'Skirmish',
    kind: 'identity',
    categories: ['engage', 'damage', 'mobility'],
    summary: 'Tu valor crece en peleas cortas y caóticas; conviértelas en ventajas antes de que se alarguen.',
    condition: 'Si la pelea se alarga, tu ventaja cae: busca ventanas cortas y cierra rápido.',
    winsAgainst: ['Rotaciones lentas', 'Líneas sin movilidad', 'Errores de posicionamiento'],
    losesAgainst: ['Front-to-back muy ordenado', 'Poke a distancia', 'Control de zona fuerte'],
    needs: ['Mobilidad', 'Burst', 'Información', 'Ventanas cortas'],
    avoids: ['Pelea larga', 'Entradas predecibles', 'Perder la rotación'],
    timings: ['Early', 'Mid'],
    macro: ['Pequeñas ventajas', 'Cazar en río', 'Forzar intercambios rápidos'],
    objectives: ['Río', 'Herald', 'Escaramuzas antes de objetivos'],
    mistakes: ['Convertir una skirmish en 5v5 eterno', 'Entrar tarde', 'No cerrar tras el pick'],
  },
  {
    key: 'splitpressure',
    label: 'Split Pressure',
    kind: 'pattern',
    categories: ['splitpush', 'mobility', 'objective'],
    summary: 'La partida se abre por laterales; si la reduces a un 5v5 frontal, te quitas tu ventaja natural.',
    condition: 'Si el mapa se cierra, abre laterales antes de agruparte y no regales un 5v5 sin presión.',
    winsAgainst: ['5v5 estático', 'Mapas cerrados', 'Equipos que colapsan tarde'],
    losesAgainst: ['Hard engage', 'Waveclear fuerte', 'Vision denial'],
    needs: ['Side lanes', 'Visión', 'Gestión de oleadas'],
    avoids: ['Agruparte por costumbre', 'Ignorar las líneas laterales'],
    timings: ['Mid', 'Late'],
    macro: ['Abrir mapa', 'Intercambiar torres por objetivos', 'Desgastar respuestas'],
    objectives: ['Torres laterales', 'Inhibidor', 'Presión de Baron'],
    mistakes: ['Olvidar la ola', 'No sincronizar la presión', 'Quedarte sin escape'],
  },
  {
    key: 'siege',
    label: 'Siege',
    kind: 'pattern',
    categories: ['poke', 'control', 'objective'],
    summary: 'Tu asedio desgasta primero y convierte la torre en objetivo.',
    condition: 'Si el rival fuerza una pelea corta, mantén el rango y recompón la línea antes de entrar.',
    winsAgainst: ['Composiciones sin waveclear', 'Equipos que ceden espacio', 'Defensa lenta'],
    losesAgainst: ['Dive frontal', 'Engage instantáneo', 'Falta de control de visión'],
    needs: ['Rango', 'Waveclear', 'Visión', 'Paciencia'],
    avoids: ['Entrar a corta distancia', 'Forzar sin poke previo'],
    timings: ['Mid', 'Late'],
    macro: ['Asediar torres', 'Desgastar antes del objetivo', 'Convertir presión en estructuras'],
    objectives: ['Torres', 'Inhibidores', 'Baron si hay ventaja'],
    mistakes: ['Cambiar el asedio por un all-in', 'No respetar el rango'],
  },
  {
    key: 'wombo-combo',
    label: 'Wombo Combo',
    kind: 'pattern',
    categories: ['teamfight', 'engage', 'control'],
    summary: 'La pelea en área se resuelve con ultimates encadenadas.',
    condition: 'Si gastas la iniciación antes de tiempo, tu combo pierde valor; espera la ventana real.',
    winsAgainst: ['Equipos agrupados', 'Backline sin movilidad', 'Peleas en choke'],
    losesAgainst: ['Disengage', 'Splitpush', 'Pelea desordenada antes del combo'],
    needs: ['Iniciación limpia', 'Follow-up', 'Zona cerrada'],
    avoids: ['Dispersarte', 'Pelear sin cooldowns clave'],
    timings: ['Mid', 'Late'],
    macro: ['Forzar choke points', 'Agrupar al rival', 'Encadenar ultimates'],
    objectives: ['Dragones', 'Baron', 'Pasillos estrechos'],
    mistakes: ['Entrar por separado', 'Romper el orden del combo'],
  },
  {
    key: 'protect-hypercarry',
    label: 'Protect Hypercarry',
    kind: 'pattern',
    categories: ['frontline', 'control', 'scaling'],
    summary: 'Todo gira alrededor del hiper-carry y del tiempo para protegerlo.',
    condition: 'Si te obligan a pelear sin tu carry protegido, baja el ritmo y reordena antes de gastar recursos.',
    winsAgainst: ['Dive frontal', 'Entradas impulsivas', 'Peleas largas y desordenadas'],
    losesAgainst: ['Poke largo', 'Splitpush', 'Pick constante sobre el carry'],
    needs: ['Peel', 'Frontline', 'Tiempo', 'Visión segura'],
    avoids: ['All-in temprano', 'Separar al carry del equipo'],
    timings: ['Late', 'Mid'],
    macro: ['Proteger al carry', 'Reagruparse', 'Ganar por escalado'],
    objectives: ['Dragones tardíos', 'Baron', '5v5 front-to-back'],
    mistakes: ['Lanzar al carry al frente', 'Pelear sin cooldowns defensivos'],
  },
  {
    key: 'global-pressure',
    label: 'Global Pressure',
    kind: 'pattern',
    categories: ['pick', 'mobility', 'control'],
    summary: 'La presión global obliga a responder en varias zonas del mapa.',
    condition: 'Si el rival agrupa y te quita visión, vuelve a mover las respuestas y castiga laterales.',
    winsAgainst: ['Mapas abiertos', 'Equipos lentos para responder', 'Rotaciones tardías'],
    losesAgainst: ['Vision denial fuerte', 'Waveclear rápido', 'Peel con respuesta inmediata'],
    needs: ['Movilidad', 'Visión', 'Sincronía de mapa'],
    avoids: ['Quedarte estático', 'Forzar una sola línea'],
    timings: ['Early', 'Mid'],
    macro: ['Amenazar varios puntos', 'Castigar rotaciones', 'Forzar respuestas simultáneas'],
    objectives: ['Herald', 'Torres laterales', 'Dragones por tempo'],
    mistakes: ['No convertir la presión en objetivo', 'Telegraphaar el plan'],
  },
];

export const STRATEGIC_PROFILE_INDEX = buildStrategicProfileIndex(STRATEGIC_PROFILES_V2);

export function buildStrategicProfileIndex(profiles = STRATEGIC_PROFILES_V2) {
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

export function findStrategicProfile(query = '', signalSet = null) {
  const normalizedQuery = normalizeText(query);
  const signals = normalizeSignalSet(signalSet);

  if (normalizedQuery && STRATEGIC_PROFILE_INDEX.has(normalizedQuery)) {
    return STRATEGIC_PROFILE_INDEX.get(normalizedQuery);
  }

  let bestProfile = null;
  let bestScore = 0;

  for (const profile of STRATEGIC_PROFILES_V2) {
    const score = scoreProfile(profile, normalizedQuery, signals);
    if (score > bestScore) {
      bestScore = score;
      bestProfile = profile;
    }
  }

  return bestScore > 0 ? bestProfile : null;
}

export function summarizeStrategicProfile(profile) {
  if (!profile) return null;

  return {
    key: profile.key,
    label: profile.label,
    kind: profile.kind,
    summary: profile.summary,
    condition: profile.condition,
    winsAgainst: sliceList(profile.winsAgainst),
    losesAgainst: sliceList(profile.losesAgainst),
    needs: sliceList(profile.needs),
    avoids: sliceList(profile.avoids),
    timings: sliceList(profile.timings),
    macro: sliceList(profile.macro),
    objectives: sliceList(profile.objectives),
    mistakes: sliceList(profile.mistakes),
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
    if (Array.isArray(profile.categories) && profile.categories.includes(category)) score += 12;
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
    ...(Array.isArray(profile.categories) ? profile.categories : []),
    ...(Array.isArray(profile.winsAgainst) ? profile.winsAgainst : []),
    ...(Array.isArray(profile.losesAgainst) ? profile.losesAgainst : []),
    ...(Array.isArray(profile.needs) ? profile.needs : []),
    ...(Array.isArray(profile.avoids) ? profile.avoids : []),
    ...(Array.isArray(profile.timings) ? profile.timings : []),
    ...(Array.isArray(profile.macro) ? profile.macro : []),
    ...(Array.isArray(profile.objectives) ? profile.objectives : []),
    ...(Array.isArray(profile.mistakes) ? profile.mistakes : []),
    profile.summary,
    profile.condition,
  ]);
}

function sliceList(values = []) {
  return Array.isArray(values) ? values.slice(0, 6) : [];
}

function uniqueValues(values = []) {
  return [...new Set(values.map((value) => String(value ?? '').trim()).filter(Boolean))];
}
