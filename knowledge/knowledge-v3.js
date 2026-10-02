import { normalizeText } from '../js/engine/utils.js';

export const STYLE_KNOWLEDGE_V3 = [
  {
    key: 'dive',
    label: 'Dive',
    aliases: ['dive', 'engage', 'pick', 'flank'],
    summary: 'Entrevistas rápidas, ángulos ocultos y una entrada que convierte una muerte en objetivo.',
    macro: ['Jugar en niebla', 'Forzar flancos', 'Convertir pick en torre o dragón'],
    vision: ['Visión adelantada en río y jungla', 'Borrar wards antes de entrar', 'No cruzar sin información'],
    objectives: ['Herald', 'Primeras torres', 'Dragón temprano'],
    tempo: ['Early', 'Mid'],
    victory: 'Ganas cuando la primera entrada fija la respuesta rival y deja follow-up limpio.',
    defeat: 'Pierdes si el rival te niega la entrada o te obliga a pelear de frente.',
    mistakes: ['Entrar sin visión', 'Gastar la iniciación sin daño detrás', 'Convertir un pick en pelea larga'],
    matchups: [
      { against: 'disengage', label: 'Dive vs Disengage', detail: 'Si te separan de la pelea, cambia la condición: espera a que el rival gaste su respuesta antes de comprometerte.' },
      { against: 'peel', label: 'Dive vs Peel', detail: 'El peel rompe la primera ventana; entra por flanco y no por la línea más obvia.' },
      { against: 'control', label: 'Dive vs Control', detail: 'El control te obliga a gastar más tiempo del que quieres; acelera la visión y entra sólo con una ruta clara.' },
    ],
  },
  {
    key: 'fronttoback',
    label: 'Front to Back',
    aliases: ['front to back', 'frontline', 'peel'],
    summary: 'Orden, protección y daño continuo al frente: no regales ángulos ni peleas partidas.',
    macro: ['Agruparse antes del objetivo', 'Proteger al carry', 'Forzar el frente limpio'],
    vision: ['Capas defensivas en entrada y río', 'Controlar choke points', 'No sobreextenderse sin visión'],
    objectives: ['Dragones', 'Baron', 'Torres centrales'],
    tempo: ['Mid', 'Late'],
    victory: 'Ganas cuando la frontline aguanta y el carry puede pegar sin interrupción.',
    defeat: 'Pierdes si la frontline se rompe o el carry queda aislado.',
    mistakes: ['Perseguir laterales', 'Separar la formación', 'Cambiar de plan a mitad de pelea'],
    matchups: [
      { against: 'splitpush', label: 'Front to Back vs Splitpush', detail: 'Si el rival abre laterales, no persigas sin necesidad; fuerza un 5v5 sólo cuando puedas fijar el mapa.' },
      { against: 'poke', label: 'Front to Back vs Poke', detail: 'El poke te desgasta antes del choque: entra con visión y no regales vida antes del objetivo.' },
      { against: 'dive', label: 'Front to Back vs Dive', detail: 'El dive quiere romper tu orden; protege al carry y castiga la entrada corta.' },
    ],
  },
  {
    key: 'teamfight',
    label: 'Teamfight',
    aliases: ['teamfight', 'wombo', 'group'],
    summary: 'Tu valor crece cuando la pelea está preparada, el espacio está cerrado y el combo llega sincronizado.',
    macro: ['Tomar visión antes de pelear', 'Cerrar el espacio', 'Forzar 5v5 con cooldowns listos'],
    vision: ['Visión de objetivo y flancos', 'Evitar entradas sorpresa', 'Controlar la zona donde ocurre la pelea'],
    objectives: ['Dragones', 'Baron', 'Soul fights'],
    tempo: ['Mid', 'Late'],
    victory: 'Ganas cuando fuerzas una pelea ordenada en terreno favorable.',
    defeat: 'Pierdes si la pelea se parte o llega antes de tiempo.',
    mistakes: ['Pelear sin preparación', 'Dividir la pelea', 'Correr detrás de un pick lejano'],
    matchups: [
      { against: 'splitpush', label: 'Teamfight vs Splitpush', detail: 'Si el rival te abre el mapa, necesitas visión y tempo para no perseguir a ciegas.' },
      { against: 'poke', label: 'Teamfight vs Poke', detail: 'El poke te obliga a entrar tarde; si no cierras antes el espacio, llegas sin vida a la pelea.' },
      { against: 'pick', label: 'Teamfight vs Pick', detail: 'El pick castiga tu agrupación; mantén capas de visión para no regalar una entrada gratuita.' },
    ],
  },
  {
    key: 'engage',
    label: 'Engage',
    aliases: ['engage', 'initiate', 'hook', 'catch'],
    summary: 'La primera decisión manda: fija un objetivo, protege el follow-up y no abras sin ventaja de visión.',
    macro: ['Forzar picks', 'Castigar rotaciones', 'Abrir objetivos con presión'],
    vision: ['Visión adelantada', 'Niega rutas de respuesta', 'No inicies en niebla ciega'],
    objectives: ['Herald', 'Primer dragón', 'Pick en río'],
    tempo: ['Early', 'Mid'],
    victory: 'Ganas cuando la iniciación convierte la respuesta rival en una pelea perdida.',
    defeat: 'Pierdes si entras sin follow-up o sin conocer la respuesta enemiga.',
    mistakes: ['Gastar la iniciación sin daño detrás', 'Abrir sin visión', 'Entrar cuando el rival aún tiene todo'],
    matchups: [
      { against: 'disengage', label: 'Engage vs Disengage', detail: 'Si el rival te corta la entrada, espera a que gaste la respuesta antes de lanzar la tuya.' },
      { against: 'peel', label: 'Engage vs Peel', detail: 'El peel te obliga a fijar una sola ventana; entra cuando la protección ya esté comprometida.' },
      { against: 'control', label: 'Engage vs Control', detail: 'El control reduce tu margen; busca niebla y no inicies donde el rival ya vea todo.' },
    ],
  },
  {
    key: 'pick',
    label: 'Pick',
    aliases: ['pick', 'catch', 'flank'],
    summary: 'Visión, aislamiento y una conversión rápida: si el pick no cierra, se convierte en un intento caro.',
    macro: ['Controlar la niebla', 'Cazar aislados', 'Convertir el pick en objetivo'],
    vision: ['Wards en rutas de tránsito', 'Apagar entradas aisladas', 'Evitar peleas largas sin cierre'],
    objectives: ['Herald', 'Pick previo a Baron', 'Aislar líneas'],
    tempo: ['Early', 'Mid'],
    victory: 'Ganas cuando un error corto del rival se convierte en ventaja inmediata.',
    defeat: 'Pierdes si el rival se agrupa y deja de regalar ángulos.',
    mistakes: ['Revelarte antes de tiempo', 'No convertir el pick', 'Forzar una pelea eterna'],
    matchups: [
      { against: 'group', label: 'Pick vs Group', detail: 'Si el rival agrupa y cierra la visión, necesitas niebla y paciencia; no gastes recursos en una entrada obvia.' },
      { against: 'control', label: 'Pick vs Control', detail: 'El control te quita rutas; busca la esquina débil y no el centro del mapa.' },
      { against: 'fronttoback', label: 'Pick vs Front to Back', detail: 'El front to back ordena la pelea; rompe la formación antes de que el rival se estabilice.' },
    ],
  },
  {
    key: 'poke',
    label: 'Poke',
    aliases: ['poke', 'siege', 'artillery'],
    summary: 'Desgastas primero, castigas después y sólo entras cuando el rival ya ha perdido espacio.',
    macro: ['Asediar', 'Desgastar antes de entrar', 'Preparar objetivos con rango'],
    vision: ['Visión lateral en asedio', 'Controlar entradas al objetivo', 'No ceder el rango por ansiedad'],
    objectives: ['Torres', 'Dragones', 'Baron siege'],
    tempo: ['Mid', 'Late'],
    victory: 'Ganas cuando el rival llega al objetivo tocado y sin espacio para responder.',
    defeat: 'Pierdes si te fuerzan un all-in antes de haber ganado terreno.',
    mistakes: ['Cambiar el asedio por un all-in', 'No respetar el rango', 'Regalar la iniciación'],
    matchups: [
      { against: 'dive', label: 'Poke vs Dive', detail: 'El dive quiere cerrar distancia; si no lo desgastas primero, el asedio se rompe.' },
      { against: 'engage', label: 'Poke vs Engage', detail: 'El engage castiga tu falta de movilidad; guarda distancia y no regales un choque frontal.' },
      { against: 'splitpush', label: 'Poke vs Splitpush', detail: 'Si el rival abre mapa, necesitas convertir el daño en estructura antes de perder control lateral.' },
    ],
  },
  {
    key: 'splitpush',
    label: 'Splitpush',
    aliases: ['splitpush', 'split', 'side lane'],
    summary: 'Abres el mapa por laterales; si conviertes esto en un 5v5, pierdes tu ventaja natural.',
    macro: ['Abrir laterales', 'Forzar respuestas en mapa', 'Intercambiar torres por presión'],
    vision: ['Visión de lado y entrada al río', 'Wards de colapso', 'No empujar sin ruta de salida'],
    objectives: ['Torres laterales', 'Inhibidor', 'Presión sobre Baron'],
    tempo: ['Mid', 'Late'],
    victory: 'Ganas cuando obligas al rival a responder tarde y cedes un objetivo por otro mayor.',
    defeat: 'Pierdes si el mapa se cierra y te obligan al 5v5 que querías evitar.',
    mistakes: ['Agruparte demasiado pronto', 'Perder la ola', 'Olvidar la presión lateral'],
    matchups: [
      { against: 'fronttoback', label: 'Splitpush vs Front to Back', detail: 'El rival quiere pelear limpio; tú quieres abrir laterales y desordenar la respuesta.' },
      { against: 'teamfight', label: 'Splitpush vs Teamfight', detail: 'Si el rival fuerza 5v5, juega la presión lateral hasta que llegue fuera de tiempo.' },
      { against: 'control', label: 'Splitpush vs Control', detail: 'El control quiere cerrar el mapa; mantén oleadas vivas y no te encierres.' },
    ],
  },
  {
    key: 'protect',
    label: 'Protect',
    aliases: ['protect', 'peel', 'front to back'],
    summary: 'Ralentiza el early, conserva recursos y llega al cierre con carry y peel listos.',
    macro: ['Ralentizar el early', 'Proteger al carry', 'Reagruparse para 5v5'],
    vision: ['Visión defensiva y de choke', 'Cubrir la retaguardia', 'Evitar peleas ciegas'],
    objectives: ['Dragones tardíos', 'Baron', 'Luchas front-to-back'],
    tempo: ['Late', 'Mid'],
    victory: 'Ganas cuando el carry puede pegar protegido y el rival no encuentra acceso.',
    defeat: 'Pierdes si te obligan a pelear sin el carry listo o sin frontline.',
    mistakes: ['Pelear antes del pico', 'Descolocar al carry', 'Forzar sin escalado'],
    matchups: [
      { against: 'poke', label: 'Protect vs Poke', detail: 'El poke te desgasta antes de que empiece la pelea; cierra la distancia con paciencia y visión.' },
      { against: 'splitpush', label: 'Protect vs Splitpush', detail: 'El splitpush te obliga a moverte; no persigas si eso deja al carry sin protección.' },
      { against: 'engage', label: 'Protect vs Engage', detail: 'Si el rival inicia bien, tu prioridad es reposicionar al carry y no romper la estructura.' },
    ],
  },
  {
    key: 'control',
    label: 'Control',
    aliases: ['control', 'vision', 'waveclear'],
    summary: 'Tu plan gana con visión, control de zona y objetivos; no persigas peleas desordenadas.',
    macro: ['Ordenar el mapa', 'Tomar espacio antes del objetivo', 'Cerrar zonas'],
    vision: ['Líneas de visión en río y entradas', 'No regalar el control del arbusto', 'Asegurar waveclear antes de moverte'],
    objectives: ['Dragones', 'Baron', 'Control de entrada'],
    tempo: ['Mid', 'Late'],
    victory: 'Ganas cuando obligas al rival a pelear en una zona que ya has cerrado.',
    defeat: 'Pierdes si el mapa se vuelve caótico y pierdes el control del río.',
    mistakes: ['Pelear sin espacio', 'Dejar que el rival desordene el mapa', 'Cazar sin visión'],
    matchups: [
      { against: 'splitpush', label: 'Control vs Splitpush', detail: 'El splitpush quiere abrir el mapa; tú quieres cerrarlo con visión y waveclear.' },
      { against: 'poke', label: 'Control vs Poke', detail: 'El poke desgasta tu zona; responde con capas de visión y limpieza de oleadas.' },
      { against: 'pick', label: 'Control vs Pick', detail: 'El pick castiga la niebla; no cedas rutas sin antes tener visión suficiente.' },
    ],
  },
  {
    key: 'skirmish',
    label: 'Skirmish',
    aliases: ['skirmish', 'brawl', 'small fight'],
    summary: 'Tu valor está en peleas cortas y caóticas; cierra rápido antes de que la pelea se vuelva larga.',
    macro: ['Forzar intercambios rápidos', 'Cazar en río', 'Traducir ventajas pequeñas'],
    vision: ['Visión de rotación', 'Presión en river fight', 'No prolongar la pelea sin ventaja'],
    objectives: ['Río', 'Herald', 'Escaramuzas antes de objetivos'],
    tempo: ['Early', 'Mid'],
    victory: 'Ganas cuando conviertes una pelea corta en ventaja de mapa.',
    defeat: 'Pierdes si el rival alarga la pelea y te ordena el intercambio.',
    mistakes: ['Convertir la skirmish en 5v5 eterno', 'Entrar tarde', 'No cerrar tras el pick'],
    matchups: [
      { against: 'fronttoback', label: 'Skirmish vs Front to Back', detail: 'La pelea ordenada castiga tu caos; usa presión en lado o flancos para romper el ritmo.' },
      { against: 'control', label: 'Skirmish vs Control', detail: 'El control quiere tiempo; quítaselo con movimientos cortos y decisiones rápidas.' },
      { against: 'poke', label: 'Skirmish vs Poke', detail: 'Si el poke te mantiene lejos, no fuerces frontalmente; busca un intercambio corto y no una guerra larga.' },
    ],
  },
];

function cleanText(value) {
  return String(value ?? '').trim();
}

function tokenize(value) {
  return normalizeText(value)
    .split(/[^a-z0-9]+/g)
    .filter(Boolean);
}

function flattenValues(value) {
  if (value == null) return [];
  if (Array.isArray(value)) return value.flatMap((item) => flattenValues(item));
  if (typeof value === 'object') {
    return [
      value.key,
      value.label,
      value.summary,
      value.detail,
      value.labelFrom,
      value.labelTo,
      value.against,
      value.victory,
      value.defeat,
      value.mistakes,
      value.macro,
      value.vision,
      value.objectives,
      value.tempo,
    ].flatMap((item) => flattenValues(item));
  }
  return [String(value)];
}

function collectSignals(report = {}, composition = {}, signalSet = {}) {
  return uniqueValues([
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
    ...(Array.isArray(report.winConditions) ? report.winConditions.flatMap((item) => flattenValues(item)) : []),
    report.winCondition,
    report.rival,
    report.rivalComposition,
    report.opponent,
    report.enemyComposition,
    report.matchup,
    report.enemy,
    report.opposition,
  ].flatMap((item) => flattenValues(item)).map(cleanText).filter(Boolean));
}

function uniqueValues(values = []) {
  return [...new Set(values.map((value) => cleanText(value)).filter(Boolean))];
}

function scoreRule(rule, signals = []) {
  const tokens = new Set(signals.flatMap((value) => tokenize(value)));
  const candidates = uniqueValues([
    rule.key,
    rule.label,
    ...(rule.aliases || []),
    ...(rule.macros || []),
    ...(rule.vision || []),
    ...(rule.objectives || []),
    ...(rule.tempo || []),
    rule.summary,
    rule.victory,
    rule.defeat,
    ...(rule.mistakes || []),
  ]);

  let score = 0;
  for (const candidate of candidates) {
    const parts = tokenize(candidate);
    if (!parts.length) continue;
    if (parts.some((part) => tokens.has(part))) score += 3;
    if (parts.some((part) => signals.some((signal) => normalizeText(signal).includes(part) || part.includes(normalizeText(signal))))) score += 2;
  }

  return score;
}

function resolveStyleProfile(value, signals = []) {
  const normalized = normalizeText(value);
  if (!normalized) return null;

  return (
    STYLE_KNOWLEDGE_V3.find((profile) => {
      if (normalizeText(profile.key) === normalized || normalizeText(profile.label) === normalized) return true;
      return (profile.aliases || []).some((alias) => normalizeText(alias) === normalized || normalized.includes(normalizeText(alias)));
    }) ||
    STYLE_KNOWLEDGE_V3.map((profile) => ({ profile, score: scoreRule(profile, [...signals, value]) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.profile.label.localeCompare(b.profile.label))[0]?.profile ||
    null
  );
}

function resolveRivalProfile(report = {}, signals = []) {
  const source = [
    report.rival?.identity,
    report.rival?.label,
    report.rival?.primaryIdentity,
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
  ].filter(Boolean);

  for (const item of source) {
    const profile = resolveStyleProfile(item, signals);
    if (profile) return profile;
  }

  return null;
}

function pickMatchupRule(primaryProfile, rivalProfile, signals = []) {
  if (!primaryProfile) return null;
  const matchups = Array.isArray(primaryProfile.matchups) ? primaryProfile.matchups : [];
  if (!matchups.length) return null;

  const rivalKey = normalizeText(rivalProfile?.key || rivalProfile?.label || rivalProfile || '');
  const scored = matchups
    .map((matchup) => {
      const against = normalizeText(matchup.against || matchup.againstLabel || matchup.label);
      const score = [rivalKey, ...signals.map((signal) => normalizeText(signal))].reduce((total, token) => {
        if (!token) return total;
        if (against === token || against.includes(token) || token.includes(against)) return total + 5;
        return total;
      }, 0);
      return { ...matchup, score };
    })
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));

  return scored[0] || null;
}

function makeClaim(label, detail, kind, priority = 'medium', evidence = []) {
  return {
    label,
    detail,
    kind,
    priority,
    evidence: uniqueValues(evidence).slice(0, 4),
  };
}

function buildKnowledgeV3Context(report = {}, composition = {}, signalSet = {}) {
  const signals = collectSignals(report, composition, signalSet);
  const primaryProfile = resolveStyleProfile(
    report.primaryIdentity || report.identity?.primaryIdentity || composition.identities?.[0] || report.strategic?.focus || '',
    signals
  );
  const rivalProfile = resolveRivalProfile(report, signals);
  const matchup = pickMatchupRule(primaryProfile, rivalProfile, signals);

  const styleClaim = primaryProfile
    ? makeClaim(
        `Identidad ${primaryProfile.label}`,
        primaryProfile.summary,
        'identity',
        'high',
        [primaryProfile.label, ...(primaryProfile.aliases || [])]
      )
    : null;

  const matchupClaim = matchup
    ? makeClaim(
        matchup.label,
        matchup.detail,
        'matchup',
        'high',
        [primaryProfile?.label, rivalProfile?.label, matchup.against]
      )
    : null;

  const macroClaim = primaryProfile
    ? makeClaim(
        `Macro ${primaryProfile.label}`,
        primaryProfile.macro?.[0] || primaryProfile.summary,
        'macro',
        'medium',
        primaryProfile.macro || []
      )
    : null;

  const visionClaim = primaryProfile
    ? makeClaim(
        `Visión ${primaryProfile.label}`,
        primaryProfile.vision?.[0] || primaryProfile.summary,
        'vision',
        'medium',
        primaryProfile.vision || []
      )
    : null;

  const tempoClaim = primaryProfile
    ? makeClaim(
        'Ventana de tempo',
        `Tu ventana real está en ${primaryProfile.tempo.join(' / ')}.`,
        'tempo',
        'medium',
        primaryProfile.tempo
      )
    : null;

  const objectiveClaim = primaryProfile
    ? makeClaim(
        'Prioridad de objetivos',
        `Prioriza ${primaryProfile.objectives.join(', ')} antes de sobreextenderte.`,
        'objective',
        'medium',
        primaryProfile.objectives
      )
    : null;

  const victoryClaim = primaryProfile
    ? makeClaim(
        'Condición de victoria',
        primaryProfile.victory,
        'victory',
        'high',
        [primaryProfile.victory]
      )
    : null;

  const defeatClaim = primaryProfile
    ? makeClaim(
        'Condición de derrota',
        primaryProfile.defeat,
        'defeat',
        'high',
        [primaryProfile.defeat]
      )
    : null;

  const mistakeClaim = primaryProfile
    ? makeClaim(
        'Error habitual',
        primaryProfile.mistakes?.[0] || primaryProfile.defeat,
        'mistake',
        'medium',
        primaryProfile.mistakes || []
      )
    : null;

  const claims = uniqueValues([styleClaim, matchupClaim, macroClaim, visionClaim, tempoClaim, objectiveClaim, victoryClaim, defeatClaim, mistakeClaim].filter(Boolean));
  const rules = claims.slice(0, 5);
  const tags = uniqueValues([
    primaryProfile?.label,
    rivalProfile?.label ? `vs ${rivalProfile.label}` : null,
    matchup?.label,
    primaryProfile?.tempo?.[0],
    primaryProfile?.objectives?.[0],
    primaryProfile?.macro?.[0],
    matchup?.against,
  ]);
  const lead = buildLead(primaryProfile, matchup, victoryClaim, tempoClaim);
  const summary = buildSummary(primaryProfile, matchup, victoryClaim, defeatClaim, tempoClaim);

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

function buildLead(primaryProfile, matchup, victoryClaim, tempoClaim) {
  const parts = [primaryProfile?.summary, matchup?.detail, victoryClaim?.detail || tempoClaim?.detail].filter(Boolean);
  return parts.length ? parts.slice(0, 2).join(' ') : 'La composición todavía necesita una lectura estratégica más clara.';
}

function buildSummary(primaryProfile, matchup, victoryClaim, defeatClaim, tempoClaim) {
  const parts = [
    primaryProfile?.summary,
    matchup?.detail,
    victoryClaim?.detail,
    defeatClaim?.detail,
    tempoClaim?.detail,
  ].filter(Boolean);
  return parts.length ? parts.slice(0, 2).join(' ') : 'La composición todavía necesita una lectura estratégica más clara.';
}

export function summarizeKnowledgeV3Context(context = {}) {
  const parts = [context.lead, context.summary, context.matchup?.detail, context.victory?.detail, context.defeat?.detail].filter(Boolean);
  return parts.length ? parts.slice(0, 2).join(' ') : 'Knowledge Layer v3 sin datos suficientes.';
}

export function findKnowledgeStyle(value, signals = []) {
  return resolveStyleProfile(value, signals);
}

export function findKnowledgeMatchup(primaryStyle, rivalStyle, signals = []) {
  return pickMatchupRule(resolveStyleProfile(primaryStyle, signals), resolveStyleProfile(rivalStyle, signals), signals);
}
