export const HUMAN_DRAFT_GUIDES = [
  {
    slug: 'single-shen',
    label: 'Frontline mínimo',
    aliases: ['Single Shen', 'Frontline'],
    expected: {
      primaryIdentityFragments: ['Frontline'],
      winConditionFragments: ['identidad', 'frontline', 'jugar alrededor de la identidad'],
      tempoFragments: ['Late'],
      coherenceFragments: ['Muy coherente'],
      reasonFragments: ['frontline', 'peel', 'identidad'],
      confidenceMin: 20,
    },
    humanVerdict: 'Jugar alrededor de la identidad',
    adjustments: [
      'En drafts mínimos, la narrativa debe priorizar la identidad base antes que el lenguaje genérico de escalado.',
    ],
  },
  {
    slug: 'front-to-back',
    label: 'Front to Back',
    aliases: ['Front to Back', 'Protect'],
    expected: {
      primaryIdentityFragments: ['Front to Back', 'Protect'],
      winConditionFragments: ['Escalar y ganar 5v5', 'front-to-back', '5v5'],
      tempoFragments: ['Late'],
      coherenceFragments: ['Muy coherente'],
      reasonFragments: ['carry protegido', 'frontline', 'peel'],
      confidenceMin: 70,
    },
    humanVerdict: 'Escalar y ganar 5v5',
    adjustments: [
      'Cuando la frontline y el carry están claros, la salida humana debe sonar a 5v5 ordenado, no a simple escalado.',
    ],
  },
  {
    slug: 'pick',
    label: 'Pick',
    aliases: ['Pick', 'Catch'],
    expected: {
      primaryIdentityFragments: ['Pick'],
      winConditionFragments: ['picks', 'objetivos', 'cazar'],
      tempoFragments: ['Early', 'Mid'],
      coherenceFragments: ['Coherente'],
      reasonFragments: ['niebla', 'pick', 'ventana corta'],
      confidenceMin: 55,
    },
    humanVerdict: 'Castigar errores cortos',
    adjustments: [
      'Si el draft caza aislados, la lectura debe sonar a ventanas cortas y conversión inmediata.',
    ],
  },
  {
    slug: 'poke',
    label: 'Poke',
    aliases: ['Poke', 'Siege'],
    expected: {
      primaryIdentityFragments: ['Poke'],
      winConditionFragments: ['desgastar', 'asedio', 'espacio'],
      tempoFragments: ['Mid', 'Late'],
      coherenceFragments: ['Coherente'],
      reasonFragments: ['desgaste', 'asimetria', 'espacio'],
      confidenceMin: 55,
    },
    humanVerdict: 'Desgastar antes de entrar',
    adjustments: [
      'Cuando el plan vive en rango y asedio, el texto debe insistir en desgaste previo y no en all-in.',
    ],
  },
  {
    slug: 'dive',
    label: 'Dive',
    aliases: ['Dive', 'Skirmish'],
    expected: {
      primaryIdentityFragments: ['Dive'],
      winConditionFragments: ['ventaja temprana', 'peleas cortas', 'convertir picks'],
      tempoFragments: ['Early', 'Mid'],
      coherenceFragments: ['Coherente'],
      reasonFragments: ['visión', 'follow-up', 'backline', 'entrada'],
      confidenceMin: 65,
    },
    humanVerdict: 'Crear ventaja temprana',
    adjustments: [
      'Si el motor suena demasiado a pelea corta y poco a tempo, la regla humana debe empujar el wording hacia ventaja temprana.',
    ],
  },
  {
    slug: 'splitpush',
    label: 'Splitpush',
    aliases: ['Splitpush', 'Side lane'],
    expected: {
      primaryIdentityFragments: ['Splitpush'],
      winConditionFragments: ['laterales', 'split', 'presión lateral'],
      tempoFragments: ['Mid', 'Late'],
      coherenceFragments: ['Coherente'],
      reasonFragments: ['laterales', 'presión', 'visión'],
      confidenceMin: 55,
    },
    humanVerdict: 'Abrir laterales',
    adjustments: [
      'Cuando la condición real es de mapa abierto, la guía humana debe evitar que el motor la reduzca a un simple 5v5.',
    ],
  },
  {
    slug: 'protect-carry',
    label: 'Protect Carry',
    aliases: ['Protect', 'Front to Back'],
    expected: {
      primaryIdentityFragments: ['Protect', 'Front to Back'],
      winConditionFragments: ['Escalar y ganar 5v5', 'carry protegido', 'front to back'],
      tempoFragments: ['Late'],
      coherenceFragments: ['Muy coherente'],
      reasonFragments: ['peel', 'carry', 'frontline'],
      confidenceMin: 70,
    },
    humanVerdict: 'Escalar y ganar 5v5',
    adjustments: [
      'La narrativa humana debe priorizar protección y orden, no solo escalado genérico.',
    ],
  },
  {
    slug: 'hybrid-front-pick',
    label: 'Hybrid Front Pick',
    aliases: ['Front to Back', 'Pick'],
    expected: {
      primaryIdentityFragments: ['Front to Back', 'Protect'],
      winConditionFragments: ['Escalar y ganar 5v5', 'pick de confirmacion', '5v5'],
      tempoFragments: ['Mid', 'Late'],
      coherenceFragments: ['Coherente'],
      reasonFragments: ['pick', 'frontline', 'confirmacion'],
      confidenceMin: 65,
    },
    humanVerdict: 'Escalar y ganar 5v5 con pick de confirmacion',
    adjustments: [
      'Cuando hay frontline y pick a la vez, el motor debe mostrar la doble vía sin confundirla con incoherencia.',
    ],
  },
  {
    slug: 'incoherent',
    label: 'Incoherent',
    aliases: ['Poke', 'Splitpush', 'Dive'],
    expected: {
      primaryIdentityFragments: ['Poke'],
      winConditionFragments: ['desgastar antes de entrar', 'unificar', 'simplificar'],
      tempoFragments: ['Mid', 'Late'],
      coherenceFragments: ['Mixta'],
      reasonFragments: ['tension', 'plan', 'desgastar'],
      confidenceMin: 40,
    },
    humanVerdict: 'Unificar la condicion de victoria',
    adjustments: [
      'Si aparecen planes incompatibles, la salida humana debe bajar la confianza y pedir una sola condición dominante.',
    ],
  },
  {
    slug: 'wombo-combo',
    label: 'Wombo Combo',
    aliases: ['Wombo Combo', 'Teamfight'],
    expected: {
      primaryIdentityFragments: ['Front to Back', 'Teamfight', 'Control'],
      winConditionFragments: ['wombo', 'combo', 'choke', 'encadenar'],
      tempoFragments: ['Mid', 'Late'],
      coherenceFragments: ['Coherente'],
      reasonFragments: ['pelea cerrada', 'ultimates', 'zona'],
      confidenceMin: 60,
    },
    humanVerdict: 'Forzar pelea en choke',
    adjustments: [
      'La explicación humana debe hablar de zona cerrada y combo encadenado antes que de escalado abstracto.',
    ],
  },
  {
    slug: 'siege',
    label: 'Siege',
    aliases: ['Siege', 'Zone Control'],
    expected: {
      primaryIdentityFragments: ['Poke', 'Control'],
      winConditionFragments: ['asedio', 'torres', 'zona'],
      tempoFragments: ['Mid', 'Late'],
      coherenceFragments: ['Coherente'],
      reasonFragments: ['asedio', 'presion', 'zona'],
      confidenceMin: 55,
    },
    humanVerdict: 'Asediar y convertir presion en torres',
    adjustments: [
      'Cuando el draft es de asedio, la validación humana debe enfatizar estructura y conversión de presión en torres.',
    ],
  },
  {
    slug: 'triple-carry',
    label: 'Triple Carry',
    aliases: ['Triple Carry', 'Protect Hypercarry'],
    expected: {
      primaryIdentityFragments: ['Protect', 'Scaling'],
      winConditionFragments: ['una sola ventana de dano', 'proteger', 'hypercarry'],
      tempoFragments: ['Late'],
      coherenceFragments: ['Coherente'],
      reasonFragments: ['proteccion', 'dano', 'ventana'],
      confidenceMin: 60,
    },
    humanVerdict: 'Proteger una sola ventana de dano',
    adjustments: [
      'Si hay tres fuentes de daño, la lectura humana debe recordar que solo una ventana debe cerrar la pelea.',
    ],
  },
  {
    slug: 'global-pressure',
    label: 'Global Pressure',
    aliases: ['Global Pressure', 'Pick'],
    expected: {
      primaryIdentityFragments: ['Pick', 'Control'],
      winConditionFragments: ['presion global', 'objetivos aislados', 'pick'],
      tempoFragments: ['Mid'],
      reasonFragments: ['global', 'pick', 'objetivos'],
      confidenceMin: 50,
    },
    humanVerdict: 'Presion global y pick',
    adjustments: [
      'La validacion humana debe remarcar la caza y la presion global, no solo el control general del mapa.',
    ],
  },
];

function normalizeText(value = '') {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function includesFragment(text = '', fragment = '') {
  const normalizedText = normalizeText(text);
  const normalizedFragment = normalizeText(fragment);
  if (!normalizedFragment) return false;
  return normalizedText.includes(normalizedFragment);
}

export function findHumanDraftGuide(input = '') {
  const key = normalizeText(typeof input === 'string' ? input : input?.slug || input?.primaryIdentity || input?.identity?.primaryIdentity || '');
  if (!key) return null;

  return HUMAN_DRAFT_GUIDES.find((guide) => {
    if (normalizeText(guide.slug) === key) return true;
    if (guide.aliases?.some((alias) => {
      const normalizedAlias = normalizeText(alias);
      return normalizedAlias === key || normalizedAlias.includes(key) || key.includes(normalizedAlias);
    })) {
      return true;
    }
    return false;
  }) || null;
}

export function summarizeHumanDraftGuide(guide) {
  if (!guide) return 'Sin guía humana';
  const verdict = guide.humanVerdict || guide.label || guide.slug;
  const note = Array.isArray(guide.adjustments) && guide.adjustments.length ? guide.adjustments[0] : '';
  return [verdict, note].filter(Boolean).join(' · ');
}

export function matchesHumanExpectation(actual = '', fragments = []) {
  return Array.isArray(fragments) && fragments.some((fragment) => includesFragment(actual, fragment));
}
