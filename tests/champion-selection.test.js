import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createDraftState,
  getSelectedChampions,
  restoreDraftFromState,
} from '../js/core/draft-state.js';
import { buildCompositionProfile } from '../js/analysis/composition-profile.js';

const TEAM = [
  { role: 'mid', champion: 'Ahri', identity: 'Burst AP', function: 'Mage', tempo: 'Mid' },
  { role: 'support', champion: 'Annie', identity: 'Engage', function: 'Burst AP', tempo: 'Mid' },
  { role: 'top', champion: 'Aatrox', identity: 'Dive', function: 'Bruiser AD', tempo: 'Mid' },
  { role: 'botline', champion: 'Aphelios', identity: 'Front to Back', function: 'Marksman ADC', tempo: 'Late' },
  { role: 'jungle', champion: 'Amumu', identity: 'Engage', function: 'Tank', tempo: 'Early' },
];

test('buildCompositionProfile normalizes role order and completes the draft', () => {
  const profile = buildCompositionProfile(TEAM);

  assert.deepEqual(profile.roles, ['top', 'jungle', 'mid', 'botline', 'support']);
  assert.equal(profile.count, 5);
  assert.equal(profile.complete, true);
  assert.deepEqual(profile.missingRoles, []);
  assert.equal(profile.primaryChampion.role, 'top');
  assert.equal(profile.primaryChampion.champion, 'Aatrox');
});

test('restoreDraftFromState leaves the draft empty and resets the active role', () => {
  const state = createDraftState();
  state.data = {
    top: [{ champion: 'Aatrox', identity: 'Dive', function: 'Bruiser AD', tempo: 'Mid' }],
    jungle: [{ champion: 'Amumu', identity: 'Engage', function: 'Tank', tempo: 'Early' }],
    mid: [],
    botline: [],
    support: [],
  };
  state.activeRole = 'jungle';
  state.selected.top = state.data.top[0];
  state.selected.jungle = state.data.jungle[0];
  state.savedDraft = {
    activeRole: 'jungle',
    selected: {
      top: 'Aatrox',
      jungle: 'Amumu',
    },
  };

  restoreDraftFromState(state);

  const selected = getSelectedChampions(state);
  assert.equal(state.activeRole, 'top');
  assert.equal(state.selected.top, null);
  assert.equal(state.selected.jungle, null);
  assert.equal(selected.length, 0);
});
