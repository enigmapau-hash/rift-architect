import test from 'node:test';
import assert from 'node:assert/strict';

import { findPickProfile } from '../knowledge/index.js';
import { buildLastPickRecommendations } from '../js/analysis/last-pick-engine.js';

const FOUR_CHAMP_TEAM = [
  {
    role: 'top',
    champion: 'Aatrox',
    identity: 'Dive',
    function: 'Bruiser AD',
    tempo: 'Mid',
    strengths: ['Skirmish'],
    weaknesses: ['Poke'],
  },
  {
    role: 'jungle',
    champion: 'Evelynn',
    identity: 'Pick',
    function: 'Assassin',
    tempo: 'Mid',
    strengths: ['Pick'],
    weaknesses: ['Frontline'],
  },
  {
    role: 'mid',
    champion: 'Ahri',
    identity: 'Pick',
    function: 'Mage',
    tempo: 'Mid',
    strengths: ['Pick'],
    weaknesses: ['Frontline'],
  },
  {
    role: 'botline',
    champion: 'Jinx',
    identity: 'Front to Back',
    function: 'Marksman ADC',
    tempo: 'Late',
    strengths: ['Scaling'],
    weaknesses: ['Dive'],
  },
];

const ROLE_POOLS = {
  support: [
    {
      role: 'support',
      champion: 'Braum',
      identity: 'Protect',
      function: 'Support',
      tempo: 'Late',
      strengths: ['Frontline', 'Peel', 'Control'],
      weaknesses: ['Poke'],
    },
    {
      role: 'support',
      champion: 'Lulu',
      identity: 'Protect',
      function: 'Support',
      tempo: 'Late',
      strengths: ['Peel'],
      weaknesses: ['Dive'],
    },
    {
      role: 'support',
      champion: 'Zyra',
      identity: 'Poke',
      function: 'Mage',
      tempo: 'Mid',
      strengths: ['Poke'],
      weaknesses: ['Dive'],
    },
  ],
};

test('findPickProfile resolves the dive recommendation profile', () => {
  const profile = findPickProfile('Dive');

  assert.equal(profile?.key, 'dive');
  assert.ok(Array.isArray(profile?.needs) && profile.needs.includes('engage'));
});

test('buildLastPickRecommendations returns the best last pick and alternatives', () => {
  const recommendation = buildLastPickRecommendations(
    {
      selectedChampions: FOUR_CHAMP_TEAM,
      primaryIdentity: 'Dive',
      tempo: 'Early',
      weaknesses: ['Frontline', 'Peel'],
      risks: ['Poke'],
      strategic: {
        focus: 'Cortar la entrada y negar la segunda ventana',
        summary: 'El draft necesita cerrar la entrada y ganar una ventana de ejecución limpia.',
        strategyProfile: {
          key: 'dive',
          label: 'Dive',
          focus: 'Cerrar la entrada',
          summary: 'Tu plan necesita una última pieza que complete el all-in.',
          timings: ['Early', 'Mid'],
        },
      },
    },
    ROLE_POOLS
  );

  assert.ok(recommendation);
  assert.equal(recommendation.targetRole, 'support');
  assert.equal(recommendation.bestPick?.champion, 'Braum');
  assert.ok(recommendation.alternatives.length >= 2);
  assert.match(recommendation.bestPick.reason.toLowerCase(), /frontline|peel|frontal/i);
  assert.match(recommendation.bestPick.problem.toLowerCase(), /frontal|peel/i);
  assert.ok(recommendation.tags.includes('support'));
});
