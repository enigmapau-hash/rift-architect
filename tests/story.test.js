import test from 'node:test';
import assert from 'node:assert/strict';

import { buildAnalysisStory } from '../js/analysis/story-engine.js';

const REPORT = {
  identity: {
    primaryIdentity: 'Dive',
    title: 'Dive · Forzar peleas cortas',
    summaryText: 'Juega en niebla y castiga ventanas cortas.',
    tempo: 'Early',
    dominance: 'hybrid',
    secondaryIdentities: ['Skirmish'],
  },
  score: {
    value: 92,
    badge: 'Excelente',
    grade: 'S',
  },
  winConditions: [
    {
      label: 'Forzar peleas cortas',
      detail: 'Buscar picks y convertirlos en objetivos.',
    },
  ],
  strengths: ['Pick', 'Tempo', 'Teamfight'],
  weaknesses: ['Early lento', 'DPS bajo'],
  synergies: ['Cadena de picks', 'Presión lateral'],
  threats: ['Desorden'],
  timeline: [
    {
      phase: 'EARLY (0–10)',
      title: 'Busca ventanas cortas',
      detail: 'Juega alrededor de niebla.',
      actions: ['Visión', 'Objetivos'],
    },
    {
      phase: 'MID (10–20)',
      title: 'Convierte la caza en objetivo',
      detail: 'La visión ya debe producir picks.',
      actions: ['Picks'],
    },
    {
      phase: 'LATE (20+)',
      title: 'Cierra antes de que se reagrupe',
      detail: 'No necesitas pelea larga.',
      actions: ['Objetivos'],
    },
  ],
  tags: ['Dive', 'Skirmish'],
};

test('buildAnalysisStory creates a narrative report from the analysis model', () => {
  const story = buildAnalysisStory(REPORT);

  assert.match(story.title, /Dive/i);
  assert.ok(story.summaryText.length > 20);
  assert.match(story.summaryText, /(visión|entra|espacio|mapa)/i);
  assert.equal(story.confidence, 92);
  assert.equal(story.grade, 'S');
  assert.equal(story.scoreBadge, 'Excelente');
  assert.equal(story.primaryIdentity, 'Dive');
  assert.ok(story.tags.includes('Dive'));
  assert.ok(story.tags.length <= 8);
  assert.equal(story.strengths.length, 3);
  assert.equal(story.weaknesses.length, 2);
  assert.equal(story.phases.length, 3);
  assert.equal(story.phases[0].phase, 'EARLY (0–10)');
});
