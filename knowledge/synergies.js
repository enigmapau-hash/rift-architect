export const DIRECT_SYNERGY_RULES = [
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

export const MACRO_SYNERGY_RULES = [
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
