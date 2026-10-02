import test from 'node:test';
import assert from 'node:assert/strict';

import { runAnalysis } from '../js/analysis/analysis-engine.js';

const TEAM = [
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
    tempo: 'Early',
    strengths: ['Pick'],
    weaknesses: ['Reset'],
  },
  {
    role: 'mid',
    champion: 'Ahri',
    identity: 'Burst AP',
    function: 'Mage',
    tempo: 'Mid',
    strengths: ['Pick'],
    weaknesses: ['Frontline'],
  },
  {
    role: 'botline',
    champion: 'Aphelios',
    identity: 'Front to Back',
    function: 'Marksman ADC',
    tempo: 'Late',
    strengths: ['Scaling'],
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

test('runAnalysis returns a complete report for five champions', () => {
  const report = runAnalysis(TEAM);

  assert.ok(report);
  assert.equal(report.composition.count, 5);
  assert.equal(report.composition.complete, true);
  assert.equal(report.composition.missingRoles.length, 0);
  assert.ok(report.executiveSummary.title.length > 0);
  assert.ok(report.executiveSummary.text.length > 0);
  assert.ok(Number.isFinite(report.score.value));
  assert.ok(report.score.value >= 0 && report.score.value <= 100);
  assert.ok(Array.isArray(report.winConditions));
  assert.ok(Array.isArray(report.tags));
  assert.ok(Array.isArray(report.timeline));
  assert.ok(report.timeline.length > 0);
  assert.ok(Array.isArray(report.threats));
  assert.ok(Array.isArray(report.strengths));
  assert.ok(Array.isArray(report.weaknesses));
  assert.ok(report.strategic);
  assert.ok(Array.isArray(report.strategic.claims));
  assert.ok(report.strategic.summary.length > 0);
});
