import test from 'node:test';
import assert from 'node:assert/strict';

import { buildStrategicReasoning } from '../js/analysis/strategic-engine.js';

const ENGAGE_REPORT = {
  composition: {
    selectedChampions: [
      { role: 'jungle', champion: 'Sejuani', identity: 'Engage', function: 'Tank', tempo: 'Early' },
      { role: 'mid', champion: 'Ahri', identity: 'Pick', function: 'Mage', tempo: 'Mid' },
      { role: 'top', champion: 'Aatrox', identity: 'Dive', function: 'Bruiser AD', tempo: 'Mid' },
      { role: 'botline', champion: 'Jinx', identity: 'Front to Back', function: 'Marksman ADC', tempo: 'Late' },
      { role: 'support', champion: 'Taric', identity: 'Protect', function: 'Support', tempo: 'Late' },
    ],
  },
  primaryIdentity: 'Engage',
  tempo: 'Early',
  winConditions: [
    {
      label: 'Forzar peleas cortas',
      detail: 'Buscar picks y convertirlos en objetivos.',
    },
  ],
  tags: ['Engage', 'Objective'],
};

const CONFLICT_REPORT = {
  composition: {
    selectedChampions: [
      { role: 'top', champion: 'Shen', identity: 'Splitpush', function: 'Bruiser AD', tempo: 'Mid' },
      { role: 'jungle', champion: 'Amumu', identity: 'Engage', function: 'Tank', tempo: 'Early' },
      { role: 'mid', champion: 'Orianna', identity: 'Teamfight', function: 'Mage', tempo: 'Mid' },
      { role: 'botline', champion: 'Jinx', identity: 'Front to Back', function: 'Marksman ADC', tempo: 'Late' },
      { role: 'support', champion: 'Taric', identity: 'Protect', function: 'Support', tempo: 'Late' },
    ],
  },
  primaryIdentity: 'Splitpush',
  tempo: 'Mid',
  winConditions: [
    {
      label: 'Abrir mapa',
      detail: 'La composición quiere ensanchar la partida y ganar por presión lateral.',
    },
  ],
  tags: ['Splitpush', 'Teamfight'],
};

test('buildStrategicReasoning identifies critical engage dependency and vision pressure', () => {
  const reasoning = buildStrategicReasoning(ENGAGE_REPORT);

  assert.ok(Array.isArray(reasoning.claims));
  assert.match(reasoning.claims[0].detail, /Sejuani/i);
  assert.match(reasoning.claims.some((claim) => /Nashor/i.test(claim.detail)), /true/i);
  assert.ok(reasoning.anchors.engage.includes('Sejuani'));
});

test('buildStrategicReasoning detects incompatible victory conditions', () => {
  const reasoning = buildStrategicReasoning(CONFLICT_REPORT);

  assert.ok(reasoning.claims.some((claim) => /incompatibles/i.test(claim.detail)));
  assert.ok(reasoning.claims.some((claim) => /Splitpush/i.test(claim.detail)));
  assert.ok(reasoning.claims.some((claim) => /Teamfight/i.test(claim.detail)));
});
