import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeWorkbookDataset } from '../js/core/dataset-normalizer.js';

const RAW_ROWS = {
  top: [
    {
      champion: 'Aatrox',
      identity: 'Dive',
      function: 'Bruiser AD',
      tempo: 'Mid',
      strengths: ['Skirmish', 'All-in'],
      weaknesses: ['Poke'],
    },
  ],
  jungle: [
    {
      champion: 'Jarvan IV',
      identity: 'Engage',
      function: 'Bruiser AD',
      tempo: 'Early',
      strengths: ['Skirmish'],
      weaknesses: ['Poke'],
    },
  ],
  mid: [
    {
      champion: 'Ahri',
      identity: 'Burst AP',
      function: 'Mage',
      tempo: 'Mid',
      strengths: ['Pick'],
      weaknesses: ['Poke'],
    },
  ],
  botline: [],
  support: [],
};

test('normalizeWorkbookDataset deduplicates repeated labels into a shared taxonomy', () => {
  const normalized = normalizeWorkbookDataset(RAW_ROWS);

  assert.equal(normalized.data.top[0].functionId, normalized.data.jungle[0].functionId);
  assert.equal(normalized.data.top[0].weaknessIds[0], normalized.data.jungle[0].weaknessIds[0]);
  assert.equal(normalized.taxonomy.functions.length, 2);
  assert.equal(normalized.taxonomy.weaknesses.length, 1);
  assert.equal(normalized.taxonomy.identities.length, 3);
  assert.ok(normalized.stats.totalRepeated > 0);
  assert.ok(normalized.stats.compressionRatio > 0);
});
