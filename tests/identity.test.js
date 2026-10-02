import test from 'node:test';
import assert from 'node:assert/strict';

import { buildCompositionProfile } from '../js/analysis/composition-profile.js';
import { buildIdentityReport } from '../js/analysis/identity-engine.js';

const TEAM = [
  { role: 'top', champion: 'Aatrox', identity: 'Dive', function: 'Bruiser AD', tempo: 'Mid' },
  { role: 'jungle', champion: 'Amumu', identity: 'Engage', function: 'Tank', tempo: 'Early' },
  { role: 'mid', champion: 'Ahri', identity: 'Burst AP', function: 'Mage', tempo: 'Mid' },
  { role: 'botline', champion: 'Aphelios', identity: 'Front to Back', function: 'Marksman ADC', tempo: 'Late' },
  { role: 'support', champion: 'Annie', identity: 'Engage', function: 'Burst AP', tempo: 'Mid' },
];

test('buildIdentityReport keeps the main identity, win condition and tags aligned', () => {
  const composition = buildCompositionProfile(TEAM);
  const identity = buildIdentityReport(
    {
      primaryIdentity: 'Dive',
      winCondition: {
        label: 'Forzar peleas cortas',
        detail: 'Buscar picks y convertirlos en objetivos.',
      },
      executiveSummary: {
        title: 'Dive · Forzar peleas cortas',
        text: 'Juega en niebla y castiga ventanas cortas.',
      },
      tempo: 'Early',
      dominance: 'hybrid',
      coherence: { label: 'Muy coherente' },
      secondaryIdentities: ['Skirmish'],
      tags: ['Dive'],
    },
    composition
  );

  assert.equal(identity.primaryIdentity, 'Dive');
  assert.equal(identity.title, 'Dive · Forzar peleas cortas');
  assert.equal(identity.winConditions.length, 1);
  assert.equal(identity.winConditions[0].label, 'Forzar peleas cortas');
  assert.ok(identity.tags.includes('Dive'));
  assert.ok(identity.secondaryIdentities.length > 0);
  assert.equal(identity.focus, 'Muy coherente');
});
