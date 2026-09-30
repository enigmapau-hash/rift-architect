import { analyzeComposition } from './analyzer.js';

const WORKBOOK_URL = './Draft%20Pool.xlsx';
const DATA_MANIFEST_URL = './data/index.json';
const ROLE_FILES = [
  { key: 'top', file: './data/top.json', sheet: 'Tabla Top' },
  { key: 'jungle', file: './data/jungle.json', sheet: 'Tabla Jungla' },
  { key: 'mid', file: './data/mid.json', sheet: 'Tabla Mid' },
  { key: 'botline', file: './data/bot.json', sheet: 'Tabla Botline' },
  { key: 'support', file: './data/support.json', sheet: 'Tabla Support' },
];

const ROOT_ID = 'qualityView';
const SELECTOR = '#compositionGrid .slot.is-filled';

const state = {
  root: null,
  observer: null,
  scheduled: false,
  loaded: false,
  data: new Map(),
};

init().catch((error) => console.error(error));

async function init() {
  const storyView = document.getElementById('storyView');
  const compositionGrid = document.getElementById('compositionGrid');
  if (!storyView || !compositionGrid) return;

  mountRoot(storyView);
  await loadRoleData();
  observeComposition(compositionGrid);
  renderQuality();
}

function mountRoot(storyView) {
  const existing = document.getElementById(ROOT_ID);
  if (existing) {
    state.root = existing;
    return;
  }

  const root = document.createElement('section');
  root.id = ROOT_ID;
  root.className = 'composition-quality';
  root.setAttribute('aria-live', 'polite');
  const healthView = document.getElementById('healthView');
  if (healthView) {
    healthView.insertAdjacentElement('afterend', root);
  } else {
    storyView.insertAdjacentElement('afterend', root);
  }
  state.root = root;
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

  const rows = window.XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false, defval: '' });
  return rows.slice(1).filter((row) => row[0]).map((row) => ({
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

function observeComposition(node) {
  if (state.observer) return;
  state.observer = new MutationObserver(scheduleRender);
  state.observer.observe(node, { childList: true, subtree: true, characterData: true });
}

function scheduleRender() {
  if (state.scheduled) return;
  state.scheduled = true;

  window.requestAnimationFrame(() => {
    state.scheduled = false;
    renderQuality();
  });
}

function renderQuality() {
  if (!state.root) return;

  const selectedChampions = collectSelectedChampions();
  if (selectedChampions.length < 5) {
    state.root.innerHTML = `
      <article class="composition-quality__empty">
        <p class="eyebrow">Sprint 12 · Quality</p>
        <h4>Completa los cinco campeones para ver la calidad del análisis</h4>
        <p>Este bloque mide cuánto de clara, coherente y útil es la lectura del motor sobre tu composición.</p>
      </article>
    `;
    return;
  }

  const analysis = analyzeComposition(selectedChampions);
  const model = buildQualityModel(analysis);

  state.root.innerHTML = `
    <section class="composition-quality__shell">
      <div class="composition-quality__header">
        <div class="composition-quality__header-copy">
          <p class="eyebrow">Sprint 12 · Quality</p>
          <h4>Calidad del análisis</h4>
          <p>${escapeHtml(model.summary)}</p>
        </div>
        <div class="composition-quality__score-card ${scoreTone(model.overall)}">
          <span class="composition-quality__score-kicker">Quality score</span>
          <strong>${model.grade} · ${model.overall}</strong>
          <span>${escapeHtml(model.badge)}</span>
        </div>
      </div>

      <div class="composition-quality__grid">
        <article class="composition-quality__card composition-quality__card--signals">
          <span class="composition-quality__card-kicker">Señales fuertes</span>
          <div class="composition-quality__chip-list">
            ${model.signals.map((signal) => `<span class="story-pill story-pill--info">${escapeHtml(signal)}</span>`).join('')}
          </div>
          <p>${escapeHtml(model.signalText)}</p>
        </article>

        <article class="composition-quality__card composition-quality__card--improve">
          <span class="composition-quality__card-kicker">Qué reforzar</span>
          <div class="composition-quality__list">
            ${model.improvements.map((item) => `
              <div class="composition-quality__item ${item.tone}">
                <strong>${escapeHtml(item.label)}</strong>
                <p>${escapeHtml(item.detail)}</p>
              </div>
            `).join('')}
          </div>
        </article>

        <article class="composition-quality__card composition-quality__card--coverage">
          <span class="composition-quality__card-kicker">Cobertura del motor</span>
          <div class="composition-quality__coverage-grid">
            ${model.coverage.map((item) => `
              <div class="composition-quality__coverage-item ${item.tone}">
                <strong>${escapeHtml(item.label)}</strong>
                <span>${item.score}/10</span>
                <p>${escapeHtml(item.detail)}</p>
              </div>
            `).join('')}
          </div>
        </article>
      </div>
    </section>
  `;
}

function collectSelectedChampions() {
  return [...document.querySelectorAll(SELECTOR)]
    .map((slot) => {
      const role = String(slot.dataset.role || 'top');
      const name = slot.querySelector('.slot__name')?.textContent?.trim() || '';
      const champion = findChampion(role, name);
      return champion ? { role, ...champion } : null;
    })
    .filter(Boolean);
}

function findChampion(roleKey, championName) {
  const normalizedName = String(championName || '').trim().toLowerCase();
  const rows = state.data.get(roleKey) || [];
  return rows.find((item) => String(item?.champion || '').trim().toLowerCase() === normalizedName) || null;
}

function buildQualityModel(analysis) {
  const confidence = clamp(Math.round(Number(analysis?.confidence) || 0), 0, 100);
  const coherence = clamp(Math.round(Number(analysis?.coherence?.score) || 0), 0, 100);
  const synergies = Array.isArray(analysis?.synergies) ? analysis.synergies : [];
  const priorities = Array.isArray(analysis?.advisor?.objectivePriority) ? analysis.advisor.objectivePriority : [];
  const winCondition = analysis?.winCondition?.label ? 1 : 0;
  const summaryText = analysis?.summaryText || 'El análisis está listo para ser leído en segundos.';

  const signalCoverage = clamp(
    Math.round(
      [analysis?.primaryIdentity, analysis?.tempoDetail?.label, analysis?.winCondition?.label, synergies[0]?.label, priorities[0]].filter(Boolean).length * 20
    ),
    0,
    100
  );

  const overall = clamp(Math.round((confidence * 0.35) + (coherence * 0.35) + (signalCoverage * 0.2) + (winCondition * 10)), 0, 100);
  const grade = gradeFromScore(overall);
  const badge = overall >= 85 ? 'Lectura muy fiable' : overall >= 70 ? 'Lectura sólida' : 'Lectura mejorable';

  const signals = uniqueValues([
    analysis?.primaryIdentity,
    analysis?.tempoDetail?.label,
    analysis?.winCondition?.label,
    synergies[0]?.label,
    analysis?.advisor?.summary?.priority,
  ]).slice(0, 4);

  const weakMetrics = Array.isArray(analysis?.metrics)
    ? [...analysis.metrics]
        .map((metric) => ({
          label: asText(metric?.label || metric?.key || 'Métrica'),
          score: clamp(Math.round(Number(metric?.score) || 0), 0, 10),
        }))
        .sort((a, b) => a.score - b.score || a.label.localeCompare(b.label, 'es'))
        .slice(0, 3)
    : [];

  const improvements = weakMetrics.length
    ? weakMetrics.map((metric) => ({
        label: `Refinar ${metric.label.toLowerCase()}`,
        detail: improvementDetail(metric.label, analysis),
        tone: scoreTone(metric.score),
      }))
    : [{ label: 'Revisar la lectura del draft', detail: 'Todavía no hay métricas suficientes para detectar mejoras concretas.', tone: 'is-mid' }];

  const coverage = [
    {
      label: 'Identidad',
      score: confidence >= 85 ? 10 : confidence >= 70 ? 8 : 6,
      detail: analysis?.primaryIdentity || 'Sin identidad clara',
      tone: scoreTone(confidence >= 85 ? 9 : confidence >= 70 ? 7 : 4),
    },
    {
      label: 'Coherencia',
      score: coherence >= 85 ? 10 : coherence >= 70 ? 8 : 5,
      detail: analysis?.coherence?.label || 'Coherencia no definida',
      tone: scoreTone(coherence >= 85 ? 9 : coherence >= 70 ? 7 : 4),
    },
    {
      label: 'Win condition',
      score: winCondition ? 9 : 5,
      detail: analysis?.winCondition?.detail || 'Sin condición explícita',
      tone: scoreTone(winCondition ? 9 : 4),
    },
    {
      label: 'Sinergias',
      score: synergies.length >= 2 ? 9 : synergies.length === 1 ? 7 : 4,
      detail: synergies[0]?.label || 'Sin sinergias destacadas',
      tone: scoreTone(synergies.length >= 2 ? 9 : synergies.length === 1 ? 7 : 4),
    },
  ];

  return {
    overall,
    grade,
    badge,
    summary: summaryText,
    signals,
    signalText: analysis?.advisor?.summary?.reason || 'Las señales fuertes muestran qué parte del análisis está mejor resuelta.',
    improvements,
    coverage,
  };
}

function improvementDetail(label, analysis) {
  const key = normalizeText(label);
  if (key.includes('frontline')) return 'La frontline condiciona cuánto tiempo puede pegar tu carry en peleas largas.';
  if (key.includes('engage')) return 'Una iniciación más clara mejora la capacidad de forzar peleas en tus términos.';
  if (key.includes('scal')) return 'El escalado define si la composición domina el juego medio o tardío.';
  if (key.includes('mov')) return 'La movilidad ayuda a llegar antes y a rotar mejor por el mapa.';
  if (key.includes('control')) return 'El control fija objetivos y evita que el rival reaccione a tiempo.';
  if (key.includes('damage')) return 'Un balance de daño más sano hace menos vulnerable el draft a armadura o resistencia mágica.';
  return analysis?.summaryText || 'Aún queda margen para afinar esta lectura.';
}

function uniqueValues(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function scoreTone(score) {
  if (score >= 8) return 'is-good';
  if (score >= 5) return 'is-mid';
  return 'is-low';
}

function gradeFromScore(score) {
  if (score >= 95) return 'A+';
  if (score >= 88) return 'A';
  if (score >= 80) return 'B+';
  if (score >= 72) return 'B';
  if (score >= 64) return 'C+';
  if (score >= 56) return 'C';
  return 'D';
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeText(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function asText(value, fallback = 'Sin definir') {
  if (value == null) return fallback;
  if (typeof value === 'string') return value.trim() || fallback;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map((item) => asText(item, '')).filter(Boolean).join(' · ') || fallback;
  if (typeof value === 'object') {
    return asText(
      value.label ?? value.name ?? value.title ?? value.text ?? value.value ?? value.detail ?? value.summary ?? value.reason ?? value.description ?? value.champion ?? value.item ?? '',
      fallback
    );
  }
  return String(value) || fallback;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
