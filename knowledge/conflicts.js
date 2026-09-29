export const CONFLICT_RULES = [
  {
    key: 'splitpush-teamfight',
    labels: ['Splitpush', 'Teamfight'],
    detail: 'La composición mezcla presión lateral con una pelea agrupada muy distinta.',
    penalty: 18,
  },
  {
    key: 'poke-dive',
    labels: ['Poke', 'Dive'],
    detail: 'El plan de desgaste no encaja bien con la entrada agresiva a corta distancia.',
    penalty: 16,
  },
  {
    key: 'protect-dive',
    labels: ['Protect', 'Dive'],
    detail: 'Proteger al carry y lanzarlo al frente suelen pedir timings distintos.',
    penalty: 14,
  },
  {
    key: 'frontline-splitpush',
    labels: ['Front to Back', 'Splitpush'],
    detail: 'La estructura frontal compite con la presión lateral como condición principal.',
    penalty: 12,
  },
  {
    key: 'poke-teamfight',
    labels: ['Poke', 'Teamfight'],
    detail: 'Desgastar y cerrar 5v5 no son necesariamente incompatibles, pero requieren orden.',
    penalty: 8,
  },
];
