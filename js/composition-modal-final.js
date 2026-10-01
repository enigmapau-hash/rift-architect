import { analyzeComposition } from './analyzer.js';
import { getSectionToneLabel } from './modal-helpers.js';

const DATA_MANIFEST_URL = './data/index.json';
const WORKBOOK_URL = './Draft%20Pool.xlsx';
const ROLE_FILES = [
  { key: 'top', file: './data/top.json', sheet: 'Tabla Top' },
  { key: 'jungle', file: './data/jungle.json', sheet: 'Tabla Jungla' },
  { key: 'mid', file: './data/mid.json', sheet: 'Tabla Mid' },
  { key: 'botline', file: './data/bot.json', sheet: 'Tabla Botline' },
  { key: 'support', file: './data/support.json', sheet: 'Tabla Support' },
];

const SECTIONS = [
  { key: 'composition', title: 'Tu composición', kicker: 'Identidad' },
  { key: 'victory', title: 'Plan de victoria', kicker: 'Cómo gana' },
  { key: 'priorities', title: 'Prioridades', kicker: 'Qué hacer ahora' },
  { key: 'risks', title: 'Riesgos', kicker: 'Qué evitar' },
  { key: 'draft', title: 'Draft', kicker: 'Picks y bans' },
  { key: 'advanced', title: 'Análisis avanzado', kicker: 'Por qué' },
];

const state = {
  data: new Map(),
  loaded: false,
  currentAnalysis: null,
  currentModel: null,
};

const els = {
  root: null,
};

init().catch((error) => console.error(error));

globalThis.renderAnalysisStory = renderStory;
globalThis.openAnalysisModal = () => {};
globalThis.closeAnalysisModal = () => {};

async function init() {
  els.root = document.getElementById('storyView');
  if (!els.root) return;

  await loadRoleData();
  window.addEventListener('rift-architect:composition-changed', renderStory);
  renderStory();
}

async function loadRoleData() {
  if (state.loaded) return;
  state.loaded = true;

  const loaded = (await loadJsonDataset()) || (await loadWorkbookDataset());
  if (loaded) {
    Object.entries(loaded).forEach(([key, rows]) => state.data.set(key, Array.isArray(rows) ? rows : []));
    return;
  }

  ROLE_FILES.forEach(({ key }) => state.data.set(key, []));
}

async function loadJsonDataset() {
  try {
    const manifestResponse = await fetch(DATA_MANIFEST_URL, { cache: 'reload' });
    if (!manifestResponse.ok) return null;

    const manifest = await manifestResponse.json();
    if (!Array.isArray(manifest?.files) || !manifest.files.length) return null;

    const loaded = await Promise.all(
      ROLE_FILES.map(async ({ key, file }) => {
        const response = await fetch(file, { cache: 'reload' });
        if (!response.ok) throw new Error(`No se pudo leer ${file}`);
        return [key, await response.json()];
      })
    );

    return Object.fromEntries(loaded);
  } catch {
    return null;
  }
}

async function loadWorkbookDataset() {
  if (!window.XLSX) return null;

  try {
    const response = await fetch(WORKBOOK_URL, { cache: 'reload' });
    if (!response.ok) return null;

    const workbook = window.XLSX.read(await response.arrayBuffer(), { type: 'array' });
    const dataset = {};
    ROLE_FILES.forEach(({ key, sheet }) => {
      dataset[key] = worksheetToRows(workbook.Sheets[sheet]);
    });
    return dataset;
  } catch {
    return null;
  }
}

function worksheetToRows(worksheet) {
  if (!worksheet) return [];

  const rows = window.XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    blankrows: false,
    defval: '',
  });

  return rows
    .slice(1)
    .filter((row) => row[0])
    .map((row) => ({
      champion: String(row[0]).trim(),
      identity: String(row[1] || '').trim(),
      function: String(row[2] || '').trim(),
      tempo: String(row[3] || '').trim(),
      strengths: splitTags(row[4]),
      weaknesses: splitTags(row[5]),
    }));
}

function splitTags(value) {
  if (!value) return [];
  return String(value).split('·').map((part) => part.trim()).filter(Boolean);
}

function renderStory() {
  if (!els.root) return;

  const selectedChampions = collectSelectedChampions();
  if (selectedChampions.length < 5) {
    state.currentAnalysis = null;
    state.currentModel = null;
    els.root.innerHTML = `
      <section class="composition-story composition-story--empty">
        <h3>Selecciona cinco campeones para ver el análisis</h3>
        <p>Primero verás un resumen corto. La historia completa aparecerá cuando la composición esté completa.</p>
      </section>
    `;
    return;
  }

  const analysis = analyzeComposition(selectedChampions);
  const model = buildStoryModel(analysis, selectedChampions);
  state.currentAnalysis = analysis;
  state.currentModel = model;

  els.root.innerHTML = `
    <section class="composition-story composition-story--cards">
      ${SECTIONS.map((section) => renderFixedCard(section, model)).join('')}
    </section>
  `;
}

function renderFixedCard(section, model) {
  const summary = getSectionSummary(section.key, model);
  const meta = getSectionMeta(section.key, model);
  const lines = getSectionLines(section.key, model);
  const tone = getSectionTone(section.key);
  const score = getSectionScore(section.key, model);
  const bar = renderTextBar(score);

  return `
    <article class="composition-story__summary-card composition-story__summary-card--${tone}">
      <div class="composition-story__summary-head">
        <span class="composition-story__summary-kicker">${escapeHtml(section.kicker)}</span>
        <span class="composition-story__summary-cta">${escapeHtml(score)}%</span>
      </div>
      <div class="composition-story__summary-main">
        <strong class="composition-story__summary-title">${escapeHtml(section.title)}</strong>
        <p class="composition-story__summary-copy">${escapeHtml(summary)}</p>
      </div>
      <div class="composition-story__summary-meta">
        ${meta.map((item) => `<span class="story-pill story-pill--neutral">${escapeHtml(item)}</span>`).join('')}
      </div>
      <div class="composition-story__mini-bar" aria-hidden="true">${bar}</div>
      <div class="design-system-flow">
        ${lines.map((line, index) => renderLine(line, index)).join('')}
      </div>
    </article>
  `;
}

function renderLine(line, index) {
  const toneClass = index === 0 ? 'is-hero' : index === 1 ? 'is-primary' : 'is-warning';
  const label = `${line.icon || '•'} ${line.label || 'Sin dato'}`;
  const value = line.value || 'Sin datos';
  const meta = line.meta || '';
  const bar = renderTextBar(line.score);

  return `
    <article class="design-system-flow__item ${toneClass}">
      <span class="design-system-flow__label">${escapeHtml(label)}</span>
      <p class="design-system-flow__value">${escapeHtml(value)}</p>
      ${meta ? `<p class="design-system-flow__meta">${escapeHtml(meta)}</p>` : ''}
      <div class="composition-story__mini-bar composition-story__mini-bar--inline" aria-hidden="true">${bar}</div>
    </article>
  `;
}

function getSectionScore(section, model) {
  switch (section) {
    case 'composition':
      return model.score;
    case 'victory':
      return Math.max(45, Math.min(100, model.score + 4));
    case 'priorities':
      return Math.max(40, Math.min(100, model.score + 2));
    case 'risks':
      return Math.max(35, 100 - (model.avoid.length * 14));
    case 'draft':
      return Math.max(40, Math.min(100, 50 + model.compositionNeeds.length * 10));
    case 'advanced':
    default:
      return Math.max(45, Math.min(100, model.score + (model.metrics.length * 2)));
  }
}

function renderTextBar(score = 0) {
  const value = clampToRange(Math.round(Number(score) || 0), 0, 100);
  const filled = Math.round(value / 10);
  const empty = 10 - filled;
  return `${'█'.repeat(filled)}${'░'.repeat(empty)} ${value}%`;
}

function getSectionSummary(section, model) {
  switch (section) {
    case 'composition':
      return model.summaryText;
    case 'victory':
      return model.winCondition;
    case 'priorities':
      return model.priorities[0] || 'Ganar tempo y visión';
    case 'risks':
      return model.avoid[0] || 'Forzar peleas malas';
    case 'draft':
      return model.draftSummary;
    case 'advanced':
    default:
      return model.coherenceLabel;
  }
}

function getSectionMeta(section, model) {
  switch (section) {
    case 'composition':
      return [`${model.grade} · ${model.score}/100`, `Pico: ${model.tempo}`, `${model.selectedCount}/5 roles`];
    case 'victory':
      return [`Pico: ${model.tempo}`, `${model.phases.length} fases`, `${model.gamePlan.length} pasos`];
    case 'priorities':
      return [`${model.priorities.length} pasos`, `${model.checklist.length} checks`, 'Plan activo'];
    case 'risks':
      return [`${model.weaknesses.length} debilidades`, `${model.criticalErrors.length} errores`, `${model.avoid.length} riesgos`];
    case 'draft':
      return [`${model.compositionNeeds.length} necesidades`, `${model.pickRecommendations.length} picks`, `${model.banRecommendations.length} bans`];
    case 'advanced':
    default:
      return [`${model.metrics.length} métricas`, `${model.insights.length} insights`, `${model.executionProfile.length} señales`];
  }