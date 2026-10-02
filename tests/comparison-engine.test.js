import test from 'node:test';
import assert from 'node:assert/strict';

import { compareCompositions } from '../js/engine/comparisonEngine.js';

const COMPOSITION_A = [
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
    champion: 'Amumu',
    identity: 'Engage',
    function: 'Tank',
    tempo: 'Mid',
    strengths: ['Teamfight'],
    weaknesses: ['Disengage'],
  },
  {
    role: 'mid',
    champion: 'Ahri',
    identity: 'Pick',
    function: 'Burst AP',
    tempo: 'Mid',
    strengths: ['Pick'],
    weaknesses: ['Frontline'],
  },
  {
    role: 'botline',
    champion: 'Ashe',
    identity: 'Front to Back',
    function: 'Utility ADC',
    tempo: 'Mid/Late',
    strengths: ['Vision'],
    weaknesses: ['Dive'],
  },
  {
    role: 'support',
    champion: 'Annie',
    identity: 'Engage',
    function: 'Burst AP',
    tempo: 'Mid',
    strengths: ['Pick'],
    weaknesses: ['Poke'],
  },
];

const COMPOSITION_B = [
  {
    role: 'top',
    champion: 'Ornn',
    identity: 'Front to Back',
    function: 'Tank',
    tempo: 'Late',
    strengths: ['Frontline'],
    weaknesses: ['Poke'],
  },
  {
    role: 'jungle',
    champion: 'Sejuani',
    identity: 'Engage',
    function: 'Tank',
    tempo: 'Mid',
    strengths: ['Control'],
    weaknesses: ['Poke'],
  },
  {
    role: 'mid',
    champion: 'Orianna',
    identity: 'Front to Back',
    function: 'Control Mage',
    tempo: 'Mid/Late',
    strengths: ['Teamfight'],
    weaknesses: ['Dive'],
  },
  {
    role: 'botline',
    champion: 'Jinx',
    identity: 'Front to Back',
    function: 'Hypercarry',
    tempo: 'Late',
    strengths: ['Scaling'],
    weaknesses: ['Dive'],
  },
  {
    role: 'support',
    champion: 'Lulu',
    identity: 'Protect',
    function: 'Enchanter',
    tempo: 'Late',
    strengths: ['Peel'],
    weaknesses: ['Pick'],
  },
];

test('compareCompositions returns a structured comparison report', () => {
  const comparison = compareCompositions(COMPOSITION_A, COMPOSITION_B);

  assert.ok(comparison);
  assert.ok(comparison.summary);
  assert.ok(Array.isArray(comparison.changedFields));
  assert.ok(comparison.changedFields.length > 0);
  assert.ok(Array.isArray(comparison.highlights));
  assert.ok(comparison.highlights.length > 0);
  assert.equal(typeof comparison.impact.score, 'number');
});