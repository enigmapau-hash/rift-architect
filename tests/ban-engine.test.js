import test from 'node:test';
import assert from 'node:assert/strict';

import { buildBanRecommendations } from '../js/analysis/ban-engine.js';

const DIVE_REPORT = {
  primaryIdentity: 'Dive',
  tempo: 'Early',
  strategic: {
    focus: 'Cortar la entrada y negar la segunda ventana',
    summary: 'Tu engage depende de la primera entrada y de la visión previa.',
    claims: [
      {
        label: 'Dependencia de engage',
        detail: 'Tu engage depende exclusivamente de Sejuani. Si cae, te quedas sin entrada limpia.',
      },
    ],
    strategyProfile: {
      key: 'dive',
      label: 'Dive',
    },
  },
};

const SPLITPUSH_REPORT = {
  primaryIdentity: 'Splitpush',
  tempo: 'Mid',
  strategic: {
    focus: 'Cortar las respuestas globales y el colapso lateral',
    summary: 'La partida se abre por laterales y hay que evitar el colapso inmediato.',
    claims: [
      {
        label: 'Condiciones de victoria incompatibles',
        detail: 'Tu equipo tiene dos condiciones de victoria incompatibles: Splitpush y Teamfight.',
      },
    ],
    strategyProfile: {
      key: 'splitpush',
      label: 'Splitpush',
    },
  },
};

test('buildBanRecommendations returns the dive ban package', () => {
  const bans = buildBanRecommendations(DIVE_REPORT);

  assert.equal(bans.title, 'Bans inteligentes · Dive');
  assert.equal(bans.bans.length, 5);
  assert.equal(bans.bans[0].champion, 'Poppy');
  assert.ok(bans.bans.some((ban) => ban.champion === 'Janna'));
  assert.ok(bans.summary.length > 0);
  assert.ok(bans.focus.toLowerCase().includes('entrada'));
});

test('buildBanRecommendations returns the splitpush ban package', () => {
  const bans = buildBanRecommendations(SPLITPUSH_REPORT);

  assert.equal(bans.title, 'Bans inteligentes · Splitpush');
  assert.equal(bans.bans.length, 5);
  assert.equal(bans.bans[0].champion, 'Twisted Fate');
  assert.ok(bans.bans.some((ban) => ban.champion === 'Shen'));
  assert.ok(bans.focus.toLowerCase().includes('lateral'));
});
