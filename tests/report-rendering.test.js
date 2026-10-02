import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runAnalysis } from '../js/analysis/analysis-engine.js';
import {
  renderAnalysisEmptyState,
  renderAnalysisStory,
  renderLastPickEmptyState,
} from '../js/analysis/renderer-report.js';
import { buildAnalysisStory } from '../js/analysis/story-engine.js';

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = resolve(TEST_DIR, 'compositions');

function loadFixtureFile(fileName) {
  const content = readFileSync(resolve(FIXTURE_DIR, fileName), 'utf8');
  return JSON.parse(content);
}

function makeRoot() {
  return { hidden: true, innerHTML: '' };
}

test('every full fixture renders a complete executive report', () => {
  const fixtures = readdirSync(FIXTURE_DIR).filter((name) => name.endsWith('.json') && name !== 'empty.json');

  assert.ok(fixtures.length >= 10, 'La batería de fixtures debe cubrir varias composiciones reales.');

  for (const fileName of fixtures) {
    const fixture = loadFixtureFile(fileName);
    const selectedChampions = Array.isArray(fixture.selectedChampions) ? fixture.selectedChampions : [];
    const report = runAnalysis(selectedChampions);
    const story = buildAnalysisStory(report);
    const root = makeRoot();

    renderAnalysisStory(root, story);

    assert.equal(report.composition.count, selectedChampions.length, `${fileName} · la composición no cuadra.`);
    assert.ok(root.hidden === false, `${fileName} · el informe no se mostró.`);
    assert.match(root.innerHTML, /Identidad/i, `${fileName} · falta la sección de identidad.`);
    assert.match(root.innerHTML, /Plan de partida/i, `${fileName} · falta la sección de plan.`);
    assert.match(root.innerHTML, /Fortalezas/i, `${fileName} · falta la sección de fortalezas.`);
    assert.match(root.innerHTML, /Debilidades/i, `${fileName} · falta la sección de debilidades.`);
    assert.match(root.innerHTML, /Bans inteligentes/i, `${fileName} · falta la sección de bans.`);
    assert.match(root.innerHTML, /Lectura estratégica/i, `${fileName} · falta la lectura estratégica.`);
    assert.ok(String(root.innerHTML).length > 0, `${fileName} · el HTML del informe quedó vacío.`);
    assert.doesNotMatch(root.innerHTML, /undefined|null|NaN/i, `${fileName} · el HTML del informe contiene valores rotos.`);
  }
});

test('empty analysis renders the placeholder states', () => {
  const analysisRoot = makeRoot();
  const lastPickRoot = makeRoot();

  renderAnalysisEmptyState(analysisRoot);
  renderLastPickEmptyState(lastPickRoot, {});

  assert.equal(analysisRoot.hidden, false);
  assert.equal(lastPickRoot.hidden, false);
  assert.match(analysisRoot.innerHTML, /Selecciona cinco campeones/i);
  assert.match(lastPickRoot.innerHTML, /No hay una recomendación clara todavía/i);
});
