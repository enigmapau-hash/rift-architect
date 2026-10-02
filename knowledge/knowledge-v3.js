import { normalizeText } from '../js/engine/utils.js';

export const STYLE_KNOWLEDGE_V3 = [
  {
    key: 'dive',
    label: 'Dive',
    aliases: ['dive', 'engage', 'pick', 'flank'],
    summary: 'Entrada corta, visión previa y follow-up listo antes de apretar el botón.',
    macro: ['Jugar en niebla', 'Forzar flancos'],
    vision: ['Visión adelantada', 'No entres sin información'],
    objectives: ['Herald', 'Primeras torres'],
    tempo: ['Early', 'Mid'],
    victory: 'Ganas cuando tu primera entrada convierte una respuesta rival en una pelea perdida.',
    defeat: 'Pierdes si el rival te niega la entrada o te obliga a pelear de frente.',
    mistakes: ['Entrar sin visión', 'Gastar la iniciación sin daño detrás'],
    matchups: [
      { against: 'disengage', label: 'Dive vs Disengage', detail: 'Si te separan de la pelea, cambia la condición: espera a que el rival gaste su respuesta antes de comprometerte.' },
      { against: 'peel', label: 'Dive vs Peel', detail: 'El peel rompe la primera ventana; entra por flanco y no por la línea más obvia.' },
    ],
  },
  {
    key: 'fronttoback',
    label: 'Front to Back',
    aliases: ['front to back', 'frontline', 'peel'],
    summary: 'Orden, protección y daño continuo al frente: no regales ángulos ni peleas partidas.',
    macro: ['Agruparse antes del objetivo', 'Proteger al carry'],
    vision: ['Capas defensivas en entrada y río', 'Controlar choke points'],
    objectives: ['Dragones', 'Baron'],
    tempo: ['Mid', 'Late'],
    victory: 'Ganas cuando la frontline aguanta y el carry puede pegar sin interrupción.',
    defeat: 'Pierdes si la frontline se rompe o el carry queda aislado.',
    mistakes: ['Perseguir laterales', 'Separar la formación'],
    matchups: [
      { against: 'splitpush', label: 'Front to Back vs Splitpush', detail: 'Si el rival abre laterales, no persigas sin necesidad; fuerza un 5v5 sólo cuando puedas fijar el mapa.' },
      { against: 'poke', label: 'Front to Back vs Poke', detail: 'El poke te desgasta antes del choque: entra con visión y no regales vida antes del objetivo.' },
    ],
  },
  {
    key: 'teamfight',
    label: 'Teamfight',
    aliases: ['teamfight', 'wombo', 'group'],
    summary: 'La pelea vale cuando está preparada, cerrada y sincronizada.',
    macro: ['Tomar visión antes de pelear', 'Cerrar el espacio'],
    vision: ['Visión de objetivo y flancos', 'Controlar la zona donde ocurre la pelea'],
    objectives: ['Dragones', 'Baron', 'Soul fights'],
    tempo: ['Mid', 'Late'],
    victory: 'Ganas cuando fuerzas una pelea ordenada en terreno favorable.',
    defeat: 'Pierdes si la pelea se parte o llega antes de tiempo.',
    mistakes: ['Pelear sin preparación', 'Dividir la pelea'],
    matchups: [
      { against: 'splitpush', label: 'Teamfight vs Splitpush', detail: 'Si el rival te abre el mapa, necesitas visión y tempo para no perseguir a ciegas.' },
      { against: 'pick', label: 'Teamfight vs Pick', detail: 'El pick castiga tu agrupación; mantén capas de visión para no regalar una entrada gratuita.' },
    ],
  },
  {
    key: 'engage',
    label: 'Engage',
    aliases: ['engage', 'initiate', 'hook', 'catch'],
    summary: 'La primera decisión manda: fija un objetivo y protege el follow-up.',
    macro: ['Forzar picks', 'Castigar rotaciones'],
    vision: ['Visión adelantada', 'No inicies en niebla ciega'],
    objectives: ['Herald', 'Primer dragón'],
    tempo: ['Early', 'Mid'],
    victory: 'Ganas cuando la iniciación convierte la respuesta rival en una pelea perdida.',
    defeat: 'Pierdes si entras sin follow-up o sin conocer la respuesta enemiga.',
    mistakes: ['Abrir sin visión', 'Entrar cuando el rival aún tiene todo'],
    matchups: [
      { against: 'disengage', label: 'Engage vs Disengage', detail: 'Si el rival te corta la entrada, espera a que gaste la respuesta antes de lanzar la tuya.' },
      { against: 'control', label: 'Engage vs Control', detail: 'El control reduce tu margen; busca niebla y no inicies donde el rival ya vea todo.' },
    ],
  },
  {
    key: 'pick',
    label: 'Pick',
    aliases: ['pick', 'catch', 'flank'],
    summary: 'Visión, aislamiento y conversión rápida: si el pick no cierra, se encarece.',
    macro: ['Controlar la niebla', 'Cazar aislados'],
    vision: ['Wards en rutas de tránsito', 'Apagar entradas aisladas'],
    objectives: ['Herald', 'Pick previo a Baron'],
    tempo: ['Early', 'Mid'],
    victory: 'Ganas cuando un error corto del rival se convierte en ventaja inmediata.',
    defeat: 'Pierdes si el rival se agrupa y deja de regalar ángulos.',
    mistakes: ['Revelarte antes de tiempo', 'No convertir el pick'],
    matchups: [
      { against: 'group', label: 'Pick vs Group', detail: 'Si el rival agrupa y cierra la visión, necesitas niebla y paciencia.' },
      { against: 'control', label: 'Pick vs Control', detail: 'El control te quita rutas; busca la esquina débil y no el centro del mapa.' },
    ],
  },
  {
    key: 'poke',
    label: 'Poke',
    aliases: ['poke', 'siege', 'artillery'],
    summary: 'Desgastas primero, castigas después y sólo entras cuando el rival ya ha perdido espacio.',
    macro: ['Asediar', 'Desgastar antes de entrar'],
    vision: ['Visión lateral en asedio', 'Controlar entradas al objetivo'],
    objectives: ['Torres', 'Dragones'],
    tempo: ['Mid', 'Late'],
    victory: 'Ganas cuando el rival llega al objetivo tocado y sin espacio para responder.',
    defeat: 'Pierdes si te fuerzan un all-in antes de haber ganado terreno.',
    mistakes: ['Cambiar el asedio por un all-in', 'No respetar el rango'],
    matchups: [
      { against: 'dive', label: 'Poke vs Dive', detail: 'El dive quiere cerrar distancia; si no lo desgastas primero, el asedio se rompe.' },
      { against: 'engage', label: 'Poke vs Engage', detail: 'El engage castiga tu falta de movilidad; guarda distancia y no regales un choque frontal.' },
    ],
  },
  {
    key: 'splitpush',
    label: 'Splitpush',
    aliases: ['splitpush', 'split', 'side lane'],
    summary: 'Abres el mapa por laterales; si conviertes esto en un 5v5, pierdes tu ventaja natural.',
    macro: ['Abrir laterales', 'Forzar respuestas en mapa'],
    vision: ['Visión de lado y entrada al río', 'Wards de colapso'],
    objectives: ['Torres laterales', 'Inhibidor'],
    tempo: ['Mid', 'Late'],
    victory: 'Ganas cuando obligas al rival a responder tarde y cambias presión por objetivos.',
    defeat: 'Pierdes si el mapa se cierra y te obligan al 5v5 que querías evitar.',
    mistakes: ['Agruparte demasiado pronto', 'Perder la ola'],
    matchups: [
      { against: 'fronttoback', label: 'Splitpush vs Front to Back', detail: 'El rival quiere pelear limpio; tú quieres abrir laterales y desordenar la respuesta.' },
      { against: 'control', label: 'Splitpush vs Control', detail: 'El control quiere cerrar el mapa; mantén oleadas vivas y no te encierres.' },
    ],
  },
  {
    key: 'protect',
    label: 'Protect',
    aliases: ['protect', 'peel'],
    summary: 'Ralentiza el early, conserva recursos y llega al cierre con carry y peel listos.',
    macro: ['Ralentizar el early', 'Proteger al carry'],
    vision: ['Visión defensiva y de choke', 'Cubrir la retaguardia'],
    objectives: ['Dragones tardíos', 'Baron'],
    tempo: ['Late', 'Mid'],
    victory: 'Ganas cuando el carry puede pegar protegido y el rival no encuentra acceso.',
    defeat: 'Pierdes si te obligan a pelear sin el carry listo o sin frontline.',
    mistakes: ['Pelear antes del pico', 'Descolocar al carry'],
    matchups: [
      { against: 'poke', label: 'Protect vs Poke', detail: 'El poke te desgasta antes de que empiece la pelea; cierra la distancia con paciencia y visión.' },
      { against: 'splitpush', label: 'Protect vs Splitpush', detail: 'El splitpush te obliga a moverte; no persigas si eso deja al carry sin protección.' },
    ],
  },
  {
    key: 'control',
    label: 'Control',
    aliases: ['control', 'vision', 'waveclear'],
    summary: 'Tu plan gana con visión, control de zona y objetivos; no persigas peleas desordenadas.',
    macro: ['Ordenar el mapa', 'Tomar espacio antes del objetivo'],
    vision: ['Líneas de visión en río y entradas', 'No regalar el control del arbusto'],
    objectives: ['Dragones', 'Baron'],
    tempo: ['Mid', 'Late'],
    victory: 'Ganas cuando obligas al rival a pelear en una zona que ya has cerrado.',
    defeat: 'Pierdes si el mapa se vuelve caótico y pierdes el control del río.',
    mistakes: ['Pelear sin espacio', 'Cazar sin visión'],
    matchups: [
      { against: 'splitpush', label: 'Control vs Splitpush', detail: 'El splitpush quiere abrir el mapa; tú quieres cerrarlo con visión y waveclear.' },
      { against: 'poke', label: 'Control vs Poke', detail: 'El poke desgasta tu zona; responde con capas de visión y limpieza de oleadas.' },
    ],
  },
  {
    key: 'skirmish',
    label: 'Skirmish',
    aliases: ['skirmish', 'brawl'],
    summary: 'Tu valor está en peleas cortas y caóticas; cierra rápido antes de que la pelea se vuelva larga.',
    macro: ['Forzar intercambios rápidos', 'Cazar en río'],
    vision: ['Visión de rotación', 'Presión en river fight'],
    objectives: ['Río', 'Herald'],
    tempo: ['Early', 'Mid'],
    victory: 'Ganas cuando conviertes una pelea corta en ventaja de mapa.',
    defeat: 'Pierdes si el rival alarga la pelea y te ordena el intercambio.',
    mistakes: ['Convertir la skirmish en 5v5 eterno', 'Entrar tarde'],
    matchups: [
      { against: 'fronttoback', label: 'Skirmish vs Front to Back', detail: 'La pelea ordenada castiga tu caos; usa presión en lado o flancos para romper el ritmo.' },
      { against: 'control', label: 'Skirmish vs Control', detail: 'El control quiere tiempo; quítaselo con movimientos cortos y decisiones rápidas.' },
    ],
  },
];

function cleanText(value) {
  return String(value ?? '').trim();
}

function uniqueText(values = []) {
  return [...new Set(values.map((value) => cleanText(value)).filter(Boolean))];
}

function collectSignals(report = {}, composition = {}, signalSet = {}) {
  return uniqueText([
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
    ...(Array.isArray(report.winConditions) ? report.winConditions.flatMap((item) => [item?.label, item?.detail]) : []),
    report.winCondition?.label,
    report.winCondition?.detail,
    report.rival?.identity,
    report.rival?.label,
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
  ]);
}

function scoreProfile(profile, signals = []) {
  const haystack = normalizeText([
    profile.key,
    profile.label,
    ...(profile.aliases || []),
    profile.summary,
    profile.victory,
    profile.defeat,
    ...(profile.macro || []),
    ...(profile.vision || []),
    ...(profile.objectives || []),
    ...(profile.tempo || []),
    ...(profile.mistakes || []),
    ...(profile.matchups || []).flatMap((matchup) => [matchup.label, matchup.detail, matchup.against]),
  ].join(' '));

  return uniqueText(signals).reduce((total, signal) => {
    const token = normalizeText(signal);
    if (!token) return total;
    if (haystack.includes(token)) return total + 3;
    if (token.includes(haystack)) return total + 1;
    return total;
  }, 0);
}

function resolveStyleProfile(value, signals = []) {
  const target = normalizeText(value);
  if (!target) return null;

  const exact = STYLE_KNOWLEDGE_V3.find((profile) => {
    if (normalizeText(profile.key) === target || normalizeText(profile.label) === target) return true;
    return (profile.aliases || []).some((alias) => normalizeText(alias) === target);
  });
  if (exact) return exact;

  return STYLE_KNOWLEDGE_V3
    .map((profile) => ({ profile, score: scoreProfile(profile, [...signals, value]) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.profile.label.localeCompare(b.profile.label))[0]?.profile || null;
}

function resolveRivalProfile(report = {}, signals = []) {
  const sources = [
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

  for (const source of sources) {
    const profile = resolveStyleProfile(source, signals);
    if (profile) return profile;
  }

  return null;
}

function pickMatchupRule(primaryProfile, rivalProfile, signals = []) {
  if (!primaryProfile) return null;
  const matchups = Array.isArray(primaryProfile.matchups) ? primaryProfile.matchups : [];
  if (!matchups.length) return null;

  const rivalTokens = uniqueText([
    rivalProfile?.key,
    rivalProfile?.label,
    ...(rivalProfile?.aliases || []),
    ...signals,
  ]).map((value) => normalizeText(value));

  const scored = matchups
    .map((matchup, index) => {
      const againstTokens = uniqueText([matchup.against, matchup.label, matchup.detail]).map((value) => normalizeText(value));
      const score = againstTokens.reduce((total, token) => {
        if (!token) return total;
        if (rivalTokens.some((rivalToken) => rivalToken === token || rivalToken.includes(token) || token.includes(rivalToken))) {
          return total + 5;
        }
        return total;
      }, 0);
      return { ...matchup, score, index };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index);

  const best = scored[0];
  if (!best) return null;

  return {
    ...best,
    from: primaryProfile.label,
    againstStyle: rivalProfile?.label || best.against,
  };
}

function makeClaim(label, detail, kind, priority = 'medium', evidence = []) {
  return {
    label,
    detail,
    kind,
    priority,
    evidence: uniqueText(evidence).slice(0, 4),
  };
}

function dedupeClaims(claims = []) {
  const seen = new Set();
  return claims.filter((claim) => {
    if (!claim) return false;
    const key = `${normalizeText(claim.label)}::${normalizeText(claim.detail)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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
    ? makeClaim(`Identidad ${primaryProfile.label}`, primaryProfile.summary, 'identity', 'high', [primaryProfile.label, ...(primaryProfile.aliases || [])])
    : null;
  const matchupClaim = matchup
    ? makeClaim(matchup.label, matchup.detail, 'matchup', 'high', [primaryProfile?.label, rivalProfile?.label, matchup.against])
    : null;
  const macroClaim = primaryProfile
    ? makeClaim(`Macro ${primaryProfile.label}`, primaryProfile.macro[0], 'macro', 'medium', primaryProfile.macro)
    : null;
  const visionClaim = primaryProfile
    ? makeClaim(`Visión ${primaryProfile.label}`, primaryProfile.vision[0], 'vision', 'medium', primaryProfile.vision)
    : null;
  const tempoClaim = primaryProfile
    ? makeClaim('Ventana de tempo', `Tu ventana real está en ${primaryProfile.tempo.join(' / ')}.`, 'tempo', 'medium', primaryProfile.tempo)
    : null;
  const objectiveClaim = primaryProfile
    ? makeClaim('Prioridad de objetivos', `Prioriza ${primaryProfile.objectives.join(', ')} antes de sobreextenderte.`, 'objective', 'medium', primaryProfile.objectives)
    : null;
  const victoryClaim = primaryProfile
    ? makeClaim('Condición de victoria', primaryProfile.victory, 'victory', 'high', [primaryProfile.victory])
    : null;
  const defeatClaim = primaryProfile
    ? makeClaim('Condición de derrota', primaryProfile.defeat, 'defeat', 'high', [primaryProfile.defeat])
    : null;
  const mistakeClaim = primaryProfile
    ? makeClaim('Error habitual', primaryProfile.mistakes[0], 'mistake', 'medium', primaryProfile.mistakes)
    : null;

  const claims = dedupeClaims([styleClaim, matchupClaim, macroClaim, visionClaim, tempoClaim, objectiveClaim, victoryClaim, defeatClaim, mistakeClaim].filter(Boolean));
  const rules = claims.slice(0, 5);
  const lead = buildLead(primaryProfile, matchup, victoryClaim, tempoClaim);
  const summary = buildSummary(primaryProfile, matchup, victoryClaim, defeatClaim, tempoClaim);
  const tags = uniqueText([
    primaryProfile?.label,
    matchup?.label,
    matchup?.againstStyle ? `vs ${matchup.againstStyle}` : null,
    primaryProfile?.tempo?.[0],
    primaryProfile?.objectives?.[0],
    primaryProfile?.macro?.[0],
  ]);

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
  const parts = [primaryProfile?.summary, matchup?.detail, victoryClaim?.detail, defeatClaim?.detail, tempoClaim?.detail].filter(Boolean);
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
