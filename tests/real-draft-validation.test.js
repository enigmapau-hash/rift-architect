import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { analyzeComposition } from '../js/analyzer.js';
import { buildAnalysisStory } from '../js/analysis/story-engine.js';
import {
  findHumanDraftGuide,
  matchesHumanExpectation,
  summarizeHumanDraftGuide,
  HUMAN_DRAFT_GUIDES,
} from './human-draft-guides.js';

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = resolve(TEST_DIR, 'compositions');

function loadFixture(slug) {
  const content = readFileSync(resolve(FIXTURE_DIR, `${slug}.json`), 'utf8');
  return JSON.parse(content);
}

function normalizeText(value = '') {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function assertFragmentsMatch(actual, fragments, label, context) {
  if (!Array.isArray(fragments) || !fragments.length) return;

  const matched = matchesHumanExpectation(actual, fragments);
  assert.ok(
    matched,
    `${context} · ${label} no coincide.\nEsperado: ${fragments.join(' · ')}\nObtenido: ${String(actual || 'Sin definir')}`
  );
}

for (const guide of HUMAN_DRAFT_GUIDES) {
  test(`human validation aligns with ${guide.slug}`, () => {
    const fixture = loadFixture(guide.slug);
    const draftGuide = findHumanDraftGuide(fixture.slug);
    assert.ok(draftGuide, `No se encontró guía humana para ${fixture.slug}`);

    const analysis = analyzeComposition(fixture.selectedChampions || []);
    const story = buildAnalysisStory(analysis);

    const context = `${fixture.slug} · ${summarizeHumanDraftGuide(draftGuide)}`;
    const expected = guide.expected || {};

    assertFragmentsMatch(analysis.primaryIdentity, expected.primaryIdentityFragments, 'Identidad principal', context);
    assertFragmentsMatch(
      analysis.coherence?.label || analysis.coherence?.description || story.contextual?.summary || '',
      expected.coherenceFragments,
      'Coherencia',
      context
    );
    assertFragmentsMatch(
      analysis.winCondition?.label || analysis.winCondition?.detail || story.contextual?.winCondition?.label || story.summaryText || '',
      expected.winConditionFragments,
      'Condición de victoria',
      context
    );
    assertFragmentsMatch(analysis.tempoDetail?.label || analysis.tempo || story.tempo || '', expected.tempoFragments, 'Tempo', context);
    assertFragmentsMatch(story.summaryText || analysis.summaryText || '', expected.reasonFragments, 'Narrativa', context);
    assertFragmentsMatch(
      [
        analysis.risks,
        analysis.threats,
        story.risks,
        story.contextual?.lead,
        story.contextual?.summary,
      ]
        .flat()
        .filter(Boolean)
        .join(' · '),
      expected.riskFragments,
      'Riesgo principal',
      context
    );

    if (Number.isFinite(Number(expected.confidenceMin))) {
      const actualConfidence = Number(analysis.confidence ?? story.confidence ?? 0);
      assert.ok(
        actualConfidence >= Number(expected.confidenceMin),
        `${context} · Confianza insuficiente.\nEsperado: >= ${expected.confidenceMin}\nObtenido: ${actualConfidence}`
      );
    }
  });
}

 test('human validation bank covers the canonical draft set', () => {
  const slugs = HUMAN_DRAFT_GUIDES.map((guide) => guide.slug);
  assert.ok(slugs.includes('dive'));
  assert.ok(slugs.includes('front-to-back'));
  assert.ok(slugs.includes('global-pressure'));
  assert.ok(slugs.includes('incoherent'));
  assert.equal(new Set(slugs).size, slugs.length);
});
