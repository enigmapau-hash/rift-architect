export const IDENTITY_RELATIONS = [
  { key: 'fronttoback', label: 'Front to Back', categories: ['frontline', 'teamfight', 'control', 'objective'], tempoBias: ['Mid', 'Late'] },
  { key: 'teamfight', label: 'Teamfight', categories: ['teamfight', 'objective', 'control'], tempoBias: ['Mid', 'Late'] },
  { key: 'engage', label: 'Engage', categories: ['engage', 'pick', 'mobility'], tempoBias: ['Early', 'Mid'] },
  { key: 'pick', label: 'Pick', categories: ['pick', 'engage', 'mobility'], tempoBias: ['Early', 'Mid'] },
  { key: 'poke', label: 'Poke', categories: ['poke', 'control', 'objective'], tempoBias: ['Mid', 'Late'] },
  { key: 'splitpush', label: 'Splitpush', categories: ['splitpush', 'mobility', 'damage'], tempoBias: ['Mid', 'Late'] },
  { key: 'dive', label: 'Dive', categories: ['engage', 'pick', 'mobility', 'damage'], tempoBias: ['Early', 'Mid'] },
  { key: 'protect', label: 'Protect', categories: ['frontline', 'control', 'teamfight'], tempoBias: ['Late', 'Mid'] },
  { key: 'control', label: 'Control', categories: ['control', 'teamfight', 'objective'], tempoBias: ['Mid', 'Late'] },
  { key: 'skirmish', label: 'Skirmish', categories: ['engage', 'damage', 'mobility', 'pick'], tempoBias: ['Early', 'Mid'] },
];
