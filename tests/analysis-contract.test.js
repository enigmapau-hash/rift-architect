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
const REFERENCE_BANK_PATH = resolve(TEST_DIR, 'composition-reference-bank.json');

function loadFixtureFile(fileName) {
  const content = readFileSync(resolve(FIXTURE_DIR, fileName), 'utf8');
  return JSON.parse(content);
}

function normalize(text = '') {
  return String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
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
  assert.ok(contract.scoreBadge, 'The contract must expose a readable score badge.');

  assert.ok(Array.isArray(contract.sections), 'The contract must include section metadata.');
  assert.ok(contract.sections.length >= 7, 'The analysis contract must expose the main dashboard sections.');
  assert.deepEqual(contract.sections[0].fields, ['title', 'summaryText', 'scoreBadge', 'confidence', 'grade']);
  assert.ok(contract.sections.some((section) => section.id === 'identity'));
  assert.ok(contract.sections.some((section) => section.id === 'knowledge'));
  assert.ok(contract.sections.some((section) => section.id === 'bans'));
  assert.ok(contract.sections.some((section) => section.id === 'timeline'));
  assert.doesNotMatch(JSON.stringify(contract), /undefined|null|NaN/i);
});

test('reference-bank compositions keep the expected analysis signals visible', () => {
  const bank = JSON.parse(readFileSync(REFERENCE_BANK_PATH, 'utf8'));
  assert.ok(Array.isArray(bank), 'The reference bank must be an array.');
  assert.ok(bank.length >= 12, 'The reference bank must cover the main archetypes.');

  for (const entry of bank) {
    assert.ok(entry.name, 'Each reference composition must have a name.');
    assert.ok(Array.isArray(entry.expectedSignals) && entry.expectedSignals.length > 0, 'Each reference composition must declare expected signals.');
    assert.ok(Array.isArray(entry.selectedChampions) && entry.selectedChampions.length === 5, `${entry.name} must include exactly five champions.`);

    const report = runAnalysis(entry.selectedChampions);
    const story = buildAnalysisStory(report);
    const contract = buildAnalysisReportContract(story);
    const transcript = normalize(JSON.stringify({
      title: contract.title,
      summaryText: contract.summaryText,
      primaryIdentity: contract.primaryIdentity,
      identityCopy: contract.identityCopy,
      strengths: contract.strengths,
      weaknesses: contract.weaknesses,
      risks: contract.risks,
      phases: contract.phases,
      strategicTokens: contract.strategicTokens,
      knowledgeTokens: contract.knowledgeTokens,
      dependencyClaims: contract.dependencyClaims,
      riskClaims: contract.riskClaims,
      signalTokens: contract.signalTokens,
      bans: contract.bans,
      bestPick: contract.bestPick,
    }));

    for (const signal of entry.expectedSignals) {
      const needle = normalize(signal);
      assert.ok(
        transcript.includes(needle),
        `${entry.name} should expose signal "${signal}" in the analysis contract or dashboard transcript.`
      );
    }

    assert.ok(contract.sections.some((section) => section.id === 'summary'));
    assert.ok(contract.sections.some((section) => section.id === 'identity'));
    assert.ok(contract.sections.some((section) => section.id === 'plan'));
    assert.ok(contract.sections.some((section) => section.id === 'knowledge'));
    assert.ok(contract.sections.some((section) => section.id === 'bans'));
    assert.ok(contract.sections.some((section) => section.id === 'timeline'));
    assert.doesNotMatch(JSON.stringify(contract), /undefined|null|NaN/i);
  }
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
