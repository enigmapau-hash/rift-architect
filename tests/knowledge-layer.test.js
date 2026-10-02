import test from 'node:test';
import assert from 'node:assert/strict';

import {
  STRATEGIC_PROFILES_V2,
  findStrategicProfile,
  validateKnowledgeLayer,
} from '../knowledge/index.js';

test('knowledge layer v2 exposes strategic profiles and validates cleanly', () => {
  const report = validateKnowledgeLayer();

  assert.equal(report.valid, true);
  assert.ok(report.summary.strategicProfiles >= 10);
  assert.ok(Array.isArray(STRATEGIC_PROFILES_V2));
  assert.ok(STRATEGIC_PROFILES_V2.length >= 10);
});

test('findStrategicProfile resolves identity and pattern profiles', () => {
  const dive = findStrategicProfile('Dive');
  const splitPush = findStrategicProfile('Split Push');
  const splitPressure = findStrategicProfile('Split Pressure');

  assert.equal(dive?.key, 'dive');
  assert.match(dive?.summary || '', /backline es frágil/i);
  assert.equal(splitPush?.key, 'splitpush');
  assert.ok(Array.isArray(splitPush?.needs) && splitPush.needs.length > 0);
  assert.equal(splitPressure?.kind, 'pattern');
  assert.match(splitPressure?.condition || '', /5v5/i);
});
