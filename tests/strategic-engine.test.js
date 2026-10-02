import test from 'node:test';
import assert from 'node:assert/strict';

import { buildStrategicReasoning } from '../js/analysis/strategic-engine.js';

const ENGAGE_REPORT = {
  composition: {
    selectedChampions: [
      { role: 'jungle', champion: 'Sejuani', identity: 'Engage', function: 'Tank', tempo: 'Early' },
      { role: 'mid', champion: 'Orianna', identity: 'Control', function: 'Mage', tempo: 'Mid' },
      { role: 'top', champion: 'Aatrox', identity: 'Bruiser AD', function: 'Bruiser AD', tempo: 'Mid' },
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

const REDUNDANT_POKE_REPORT = {
  composition: {
    selectedChampions: [
      { role: 'top', champion: 'Ziggs', identity: 'Poke', function: 'Mage', tempo: 'Mid/Late' },
      { role: 'jungle', champion: 'Brand', identity: 'Poke', function: 'Mage', tempo: 'Mid' },
      { role: 'mid', champion: 'Xerath', identity: 'Poke', function: 'Mage', tempo: 'Mid/Late' },
      { role: 'botline', champion: 'Jhin', identity: 'Poke', function: 'Marksman ADC', tempo: 'Mid' },
      { role: 'support', champion: 'Karma', identity: 'Protect', function: 'Enchanter', tempo: 'Mid' },
    ],
  },
  primaryIdentity: 'Poke',
  tempo: 'Mid',
  winConditions: [
    {
      label: 'Desgastar antes de entrar',
      detail: 'La composición quiere ganar espacio a distancia y convertirlo en torre o objetivo.',
    },
  ],
  tags: ['Poke', 'Control'],
};

const RIVAL_REPORT = {
  composition: {
    selectedChampions: [
      { role: 'top', champion: 'Malphite', identity: 'Frontline', function: 'Tank', tempo: 'Mid/Late' },
      { role: 'jungle', champion: 'Vi', identity: 'Engage', function: 'Fighter', tempo: 'Early/Mid' },
      { role: 'mid', champion: 'Orianna', identity: 'Control', function: 'Mage', tempo: 'Mid' },
      { role: 'botline', champion: 'Jinx', identity: 'Protect', function: 'Marksman ADC', tempo: 'Late' },
      { role: 'support', champion: 'Lulu', identity: 'Protect', function: 'Enchanter', tempo: 'Late' },
    ],
  },
  primaryIdentity: 'Protect',
  tempo: 'Late',
  rivalComposition: {
    label: 'Rival Engage',
    identity: 'Engage',
    tags: ['Engage', 'Disengage', 'Dive'],
  },
};

test('buildStrategicReasoning identifies critical engage dependency and vision pressure', () => {
  const reasoning = buildStrategicReasoning(ENGAGE_REPORT);

  assert.ok(Array.isArray(reasoning.claims));
  assert.match(reasoning.claims[0].detail, /Sejuani/i);
  assert.equal(reasoning.claims.some((claim) => /Nashor/i.test(claim.detail)), true);
  assert.ok(reasoning.dependencies.some((claim) => /engage/i.test(claim.label)));
  assert.ok(reasoning.cascades.some((claim) => /cascada/i.test(claim.label)));
  assert.ok(reasoning.risks.some((claim) => /riesgo de ejecuci[ií]n/i.test(claim.label)));
  assert.ok(reasoning.robustness.some((claim) => /robustez/i.test(claim.label)));
  assert.ok(reasoning.contingencies.some((claim) => /contingencia/i.test(claim.label)));
  assert.ok(reasoning.metrics.executionRisk >= 0);
  assert.ok(reasoning.metrics.resilience >= 0);
  assert.ok(reasoning.anchors.engage.includes('Sejuani'));
});

test('buildStrategicReasoning detects incompatible victory conditions and cascade failure', () => {
  const reasoning = buildStrategicReasoning(CONFLICT_REPORT);

  assert.ok(reasoning.claims.some((claim) => /incompatibles/i.test(claim.detail)));
  assert.ok(reasoning.claims.some((claim) => /Splitpush/i.test(claim.detail)));
  assert.ok(reasoning.claims.some((claim) => /Teamfight/i.test(claim.detail)));
  assert.ok(reasoning.cascades.length > 0);
  assert.ok(reasoning.flexibility.length >= 1);
});

test('buildStrategicReasoning detects redundancy, power spike and rival adaptation', () => {
  const pokeReasoning = buildStrategicReasoning(REDUNDANT_POKE_REPORT);
  const rivalReasoning = buildStrategicReasoning(RIVAL_REPORT);

  assert.ok(pokeReasoning.redundancies.some((claim) => /poke/i.test(claim.label)));
  assert.ok(pokeReasoning.powerSpikes.some((claim) => /pico real/i.test(claim.label)));
  assert.ok(pokeReasoning.claims.some((claim) => claim.kind === 'power-spike'));
  assert.ok(pokeReasoning.claims.some((claim) => /mid/i.test(claim.detail) || /late/i.test(claim.detail)));
  assert.ok(rivalReasoning.adaptations.some((claim) => /adaptaci[oó]n/i.test(claim.label)));
  assert.ok(rivalReasoning.claims.some((claim) => /rival/i.test(claim.detail) || /disengage/i.test(claim.detail) || /engage/i.test(claim.detail)));
});