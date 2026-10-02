import test from 'node:test';
import assert from 'node:assert/strict';

import { buildContextualNarrative } from '../js/analysis/contextual-engine.js';
import { buildAnalysisStory } from '../js/analysis/story-engine.js';

const DIVE_REPORT = {
  primaryIdentity: 'Dive',
  tempo: 'Early',
  confidence: 68,
  winConditions: [
    {
      label: 'Forzar peleas cortas',
      detail: 'Buscar picks y convertirlos en objetivos.',
    },
  ],
  composition: {
    identities: ['Dive', 'Pick'],
    functions: ['Bruiser AD', 'Mage'],
    tempos: ['Early', 'Mid'],
    tags: ['Dive', 'Pick', 'Engage', 'Mobility'],
  },
  strengths: ['Pick'],
  weaknesses: ['Poke'],
  risks: ['Desorden'],
  synergies: ['Cadena de picks'],
  timeline: [
    {
      phase: 'EARLY (0–10)',
      title: 'Busca ventanas cortas',
      detail: 'Juega alrededor de la niebla.',
      actions: ['Visión', 'Objetivos'],
    },
  ],
};

const PROTECT_REPORT = {
  primaryIdentity: 'Protect',
  tempo: 'Late',
  confidence: 84,
  winConditions: [
    {
      label: 'Escalar y ganar 5v5',
      detail: 'La composición quiere llegar ordenada al cierre y pelear con front line y carry protegido.',
    },
  ],
  composition: {
    identities: ['Protect', 'Front to Back'],
    functions: ['Frontline', 'Peel'],
    tempos: ['Late'],
    tags: ['Protect', 'Front to Back', 'Control'],
  },
  weaknesses: ['All-in temprano'],
  risks: ['Peel insuficiente'],
};

test('buildContextualNarrative adapts a Dive plan to engage pressure', () => {
  const narrative = buildContextualNarrative(DIVE_REPORT);

  assert.match(narrative.headline, /Dive/i);
  assert.match(narrative.lead, /backline es frágil/i);
  assert.match(narrative.lead, /más engage/i);
  assert.ok(narrative.rules.length >= 3);
  assert.equal(narrative.winCondition.label, 'Forzar peleas cortas');
});

test('buildContextualNarrative slows down late Protect drafts', () => {
  const narrative = buildContextualNarrative(PROTECT_REPORT);

  assert.match(narrative.headline, /Protect/i);
  assert.match(narrative.lead, /ralentizar el early/i);
  assert.match(narrative.lead, /pico de poder/i);
  assert.ok(narrative.rules.some((rule) => rule.kind === 'tempo'));
});

test('buildAnalysisStory exposes contextual narrative inside the analysis story', () => {
  const story = buildAnalysisStory(DIVE_REPORT);

  assert.ok(story.contextual);
  assert.match(story.summaryText, /backline es frágil/i);
  assert.ok(story.tags.includes('Dive'));
});
