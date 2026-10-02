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
const EXECUTIVE_SECTIONS = [
  'Identidad',
  'Plan de partida',
  'Fortalezas',
  'Debilidades',
  'Bans prioritarios',
  'Lectura estratégica',
];

function loadFixtureFile(fileName) {
  const content = readFileSync(resolve(FIXTURE_DIR, fileName), 'utf8');
  return JSON.parse(content);
}

function makeRoot() {
  return { hidden: true, innerHTML: '' };
}

function assertSectionOrder(html, fileName) {
  let lastIndex = -1;

  for (const label of EXECUTIVE_SECTIONS) {
    const index = html.indexOf(label);
    assert.ok(index >= 0, `${fileName} · falta la sección ${label}.`);
    assert.ok(index > lastIndex, `${fileName} · la sección ${label} aparece fuera de orden.`);
    lastIndex = index;
  }
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
    assert.equal(root.hidden, false, `${fileName} · el informe no se mostró.`);
    assert.match(root.innerHTML, /analysis-dashboard/i, `${fileName} · falta la estructura de dashboard.`);
    assert.match(root.innerHTML, /Informe ejecutivo/i, `${fileName} · falta la cabecera ejecutiva.`);
    assertSectionOrder(root.innerHTML, fileName);
    assert.ok(String(root.innerHTML).length > 0, `${fileName} · el HTML del informe quedó vacío.`);
    assert.doesNotMatch(root.innerHTML, /undefined|null|NaN/i, `${fileName} · el HTML del informe contiene valores rotos.`);
    assert.doesNotMatch(root.innerHTML, /Sin definir/i, `${fileName} · el informe sigue mostrando un fallback visible.`);
  }
});

test('empty analysis renders the placeholder states', () => {
  const analysisRoot = makeRoot();
  const lastPickRoot = makeRoot();

  renderAnalysisEmptyState(analysisRoot);
  renderLastPickEmptyState(lastPickRoot, {});

  assert.equal(analysisRoot.hidden, false);
  assert.equal(lastPickRoot.hidden, false);
  assert.match(analysisRoot.innerHTML, /analysis-dashboard__empty/i);
  assert.match(analysisRoot.innerHTML, /Selecciona cinco campeones/i);
  assert.match(lastPickRoot.innerHTML, /No hay una recomendación clara todavía/i);
});
