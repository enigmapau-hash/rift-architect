import test from 'node:test';
import assert from 'node:assert/strict';

import {
  STRATEGIC_PROFILES_V2,
  BAN_PROFILE_RULES,
  findStrategicProfile,
  findBanProfile,
  validateKnowledgeLayer,
  STYLE_KNOWLEDGE_V3,
  buildKnowledgeV3Context,
  findKnowledgeStyle,
  findKnowledgeMatchup,
} from '../knowledge/index.js';

test('knowledge layer validates cleanly and exposes the v3 layer', () => {
  const report = validateKnowledgeLayer();

  assert.equal(report.valid, true);
  assert.ok(report.summary.strategicProfiles >= 10);
  assert.ok(report.summary.knowledgeV3Styles >= 8);
  assert.ok(Array.isArray(STRATEGIC_PROFILES_V2));
  assert.ok(STRATEGIC_PROFILES_V2.length >= 10);
  assert.ok(Array.isArray(BAN_PROFILE_RULES));
  assert.ok(BAN_PROFILE_RULES.length >= 8);
  assert.ok(Array.isArray(STYLE_KNOWLEDGE_V3));
  assert.ok(STYLE_KNOWLEDGE_V3.length >= 8);
});

test('findStrategicProfile resolves identity and pattern profiles', () => {
  const dive = findStrategicProfile('Dive');
  const splitPush = findStrategicProfile('Split Push');
  const splitPressure = findStrategicProfile('Split Pressure');

  assert.equal(dive?.key, 'dive');
  assert.match(dive?.summary || '', /backline es fr[áa]gil/i);
  assert.equal(splitPush?.key, 'splitpush');
  assert.ok(Array.isArray(splitPush?.needs) && splitPush.needs.length > 0);
  assert.equal(splitPressure?.kind, 'pattern');
  assert.match(splitPressure?.condition || '', /5v5/i);
});

test('findBanProfile resolves the best ban package', () => {
  const dive = findBanProfile('Dive');
  const splitpush = findBanProfile('Splitpush');

  assert.equal(dive?.key, 'dive');
  assert.ok(Array.isArray(dive?.bans) && dive.bans.length >= 5);
  assert.equal(dive?.bans?.[0]?.champion, 'Poppy');
  assert.equal(splitpush?.key, 'splitpush');
  assert.equal(splitpush?.bans?.[0]?.champion, 'Twisted Fate');
});

test('Knowledge Layer v3 resolves style matchups and core guidance', () => {
  const report = buildKnowledgeV3Context(
    {
      primaryIdentity: 'Dive',
      rivalComposition: { identity: 'Disengage', label: 'Disengage' },
      tags: ['Dive', 'Pick'],
    },
    { tags: ['Dive'] },
    { labels: ['Dive', 'Disengage'], categories: ['engage', 'control'], signals: ['Dive', 'Disengage'] }
  );

  const style = findKnowledgeStyle('Dive');
  const matchup = findKnowledgeMatchup('Dive', 'Disengage');

  assert.equal(style?.key, 'dive');
  assert.equal(matchup?.label, 'Dive vs Disengage');
  assert.ok(report.primaryStyle);
  assert.equal(report.primaryStyle.key, 'dive');
  assert.ok(report.matchup);
  assert.equal(report.matchup?.label, 'Dive vs Disengage');
  assert.match(report.lead || '', /Dive/i);
  assert.ok(Array.isArray(report.rules) && report.rules.length >= 4);
  assert.ok(Array.isArray(report.claims) && report.claims.some((claim) => claim.kind === 'matchup'));
  assert.ok(Array.isArray(report.tags) && report.tags.includes('Dive'));
});
