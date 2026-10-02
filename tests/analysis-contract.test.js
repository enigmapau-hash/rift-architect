import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runAnalysis } from '../js/analysis/analysis-engine.js';
import { buildAnalysisStory } from '../js/analysis/story-engine.js';
import {
  ANALYSIS_CONTRACT_SPECS,
  buildAnalysisReportContract,
} from '../js/analysis/report-contract.js';

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = resolve(TEST_DIR, 'compositions');

function loadFixtureFile(fileName) {
  const content = readFileSync(resolve(FIXTURE_DIR, fileName), 'utf8');
  return JSON.parse(content);
}

test('analysis contract exposes the expected module field lists', () => {
  assert.deepEqual(Object.keys(ANALYSIS_CONTRACT_SPECS), [
    'compositionProfile',
    'strategicEngine',
    'knowledgeLayer',
    'banEngine',
    'lastPick',
  ]);

  for (const [moduleName, fields] of Object.entries(ANALYSIS_CONTRACT_SPECS)) {
    assert.ok(Array.isArray(fields), `${moduleName} must expose a field list.`);
    assert.ok(fields.length > 0, `${moduleName} must expose at least one field.`);
  }
});

test('analysis contract includes source mapping and ordered dashboard sections', () => {
  const fixtures = readdirSync(FIXTURE_DIR).filter((name) => name.endsWith('.json') && name !== 'empty.json');
  const fixture = loadFixtureFile(fixtures[0]);
  const report = runAnalysis(Array.isArray(fixture.selectedChampions) ? fixture.selectedChampions : []);
  const story = buildAnalysisStory(report);
  const contract = buildAnalysisReportContract(story);

  assert.equal(contract.mode, 'analysis');
  assert.equal(contract.sourceMap.compositionProfile, 'Composition Profile');
  assert.equal(contract.sourceMap.strategicEngine, 'Strategic Engine');
  assert.equal(contract.sourceMap.knowledgeLayer, 'Knowledge Layer');
  assert.equal(contract.sourceMap.banEngine, 'Ban Engine');
  assert.equal(contract.sourceMap.lastPick, 'Last Pick Engine');

  assert.ok(Array.isArray(contract.sections), 'The contract must include section metadata.');
  assert.ok(contract.sections.length >= 7, 'The analysis contract must expose the main dashboard sections.');
  assert.deepEqual(contract.sections[0].fields, ['title', 'summaryText', 'scoreBadge', 'confidence', 'grade']);
  assert.ok(contract.sections.some((section) => section.id === 'identity'));
  assert.ok(contract.sections.some((section) => section.id === 'knowledge'));
  assert.ok(contract.sections.some((section) => section.id === 'bans'));
  assert.ok(contract.sections.some((section) => section.id === 'timeline'));
  assert.doesNotMatch(JSON.stringify(contract), /undefined|null|NaN/i);
});

test('last pick contract exposes the smaller dashboard surface', () => {
  const fixtures = readdirSync(FIXTURE_DIR).filter((name) => name.endsWith('.json') && name !== 'empty.json');
  const fixture = loadFixtureFile(fixtures.find((name) => name.includes('4')) || fixtures[0]);
  const report = runAnalysis(Array.isArray(fixture.selectedChampions) ? fixture.selectedChampions.slice(0, 4) : []);
  const story = buildAnalysisStory(report);
  const contract = buildAnalysisReportContract(story, 'last-pick');

  assert.equal(contract.mode, 'last-pick');
  assert.ok(contract.sections.some((section) => section.id === 'best-pick'));
  assert.ok(contract.sections.some((section) => section.id === 'strategy'));
  assert.equal(contract.sections[0].id, 'summary');
  assert.doesNotMatch(JSON.stringify(contract), /undefined|null|NaN/i);
});