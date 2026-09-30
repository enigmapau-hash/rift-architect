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

const ROLE_ORDER = ROLE_FILES.map(({ key }) => key);
const ROLE_LABELS = Object.fromEntries(ROLE_FILES.map(({ key, label }) => [key, label || key]));

const state = {
  data: new Map(),
  loaded: false,
  activeQuestion: 'howWin',
  patchScheduled: false,
};

const els = { root: null };

init().catch((error) => console.error(error));

async function init() {
  els.root = document.getElementById('storyView');
  if (!els.root) return;

  await loadRoleData();
  observeComposition();
  renderStory();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
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

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeText(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function uniqueValues(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function normalizeEntry(item) {
  const label = asText(item?.label ?? item?.name ?? item?.title ?? item?.text ?? item?.value ?? item?.champion ?? item, 'Sin definir');
  const detail = asText(item?.detail ?? item?.summary ?? item?.description ?? item?.reason ?? item?.note ?? item?.explanation ?? item?.message ?? '', '');
  return { label, detail };
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
  return String(value)
    .split('·')
    .map((part) => part.trim())
    .filter(Boolean);
}

function findChampion(roleKey, championName) {
  const normalizedName = String(championName || '').trim().toLowerCase();
  const rows = state.data.get(roleKey) || [];
  return rows.find((item) => String(item?.champion || '').trim().toLowerCase() === normalizedName) || null;
}

function collectSelectedChampions() {
  return [...document.querySelectorAll('#compositionGrid .slot.is-filled')]
    .map((slot) => {
      const role = String(slot.dataset.role || 'top');
      const name = slot.querySelector('.slot__name')?.textContent?.trim() || '';
      const champion = findChampion(role, name);
      return champion ? { role, ...champion } : null;
    })
    .filter(Boolean)
    .map((champion) => ({
      role: champion.role,
      champion: champion.champion,
      identity: champion.identity,
      function: champion.function,
      tempo: champion.tempo,
      strengths: asArray(champion.strengths),
      weaknesses: asArray(champion.weaknesses),
    }));
}

function findChampionByTags(selectedChampions, tags = []) {
  return selectedChampions.find((champion) => {
    const values = [champion.champion, champion.identity, champion.function, champion.tempo, ...asArray(champion.strengths), ...asArray(champion.weaknesses)];
    return values.some((value) => tags.some((tag) => normalizeText(asText(value)).includes(normalizeText(tag))));
  });
}

function buildStoryModel(analysis, selectedChampions) {
  const strengths = asArray(analysis?.strengths).slice(0, 2).map(normalizeEntry);
  const weaknesses = asArray(analysis?.weaknesses).slice(0, 2).map(normalizeEntry);
  const gamePlan = asArray(analysis?.gamePlan).slice(0, 4).map((item) => asText(item));
  const tempo = analysis?.tempoDetail?.label || analysis?.tempo || 'tu ventana natural de poder';
  const phases = asArray(analysis?.tempoDetail?.phases).slice(0, 3).map((phase) => asText(phase));
  const engager = findChampionByTags(selectedChampions, ['engage', 'iniciación', 'iniciacion', 'frontline', 'start']);
  const carry = findChampionByTags(selectedChampions, ['adc', 'carry', 'hypercarry', 'escalado']);
  const protector = findChampionByTags(selectedChampions, ['peel', 'protect', 'shield']);
  const frontline = findChampionByTags(selectedChampions, ['frontline', 'tanque', 'front', 'defensa']);
  const keyPiece = carry || engager || protector || frontline || selectedChampions[0] || null;
  const objective = analysis?.advisor?.primaryObjective || analysis?.winCondition?.label || 'Juega alrededor de tu identidad';
  const winText = analysis?.winCondition?.detail || analysis?.winCondition?.label || 'Escala, agrúpate y protege al carry para ganar las peleas clave.';
  const risk = weaknesses[0];
  const strength = strengths[0];
  const coherence = Number.isFinite(Number(analysis?.coherence?.score))
    ? Math.round(Number(analysis.coherence.score))
    : Number.isFinite(Number(analysis?.confidence))
      ? Math.round(Number(analysis.confidence))
      : 0;

  const steps = [
    { label: 'Cómo ganas', detail: winText, chip: analysis?.primaryIdentity || 'Sin identidad clara' },
    { label: 'Qué haces primero', detail: gamePlan[0] || 'Gana tempo y no fuerces peleas malas.', chip: phases[0] || tempo },
    { label: 'Qué debes evitar', detail: risk ? risk.label : 'Evita pelear sin visión ni prioridad.', chip: risk?.detail || 'No fuerces la pelea' },
    { label: 'Quién sostiene el plan', detail: keyPiece ? `${keyPiece.champion} es la pieza que más condiciona el resultado.` : 'No hay una pieza clave definida.', chip: keyPiece?.function || keyPiece?.identity || 'Sin definir' },
  ];

  return {
    score: coherence,
    grade: gradeFromScore(coherence),
    identity: analysis?.primaryIdentity || 'Sin identidad clara',
    objective,
    tempo,
    phases,
    keyPiece,
    strength,
    risk,
    steps,
    summaryText: analysis?.summaryText || 'La composición se explica como una historia visual: qué es, cómo gana y qué debe evitar.',
    topMetric: uniqueValues((analysis?.metrics || []).map((metric) => metric?.label).filter(Boolean)).slice(0, 3),
  };
}

function renderHero(model) {
  return `
    <section class="composition-story__hero">
      <div class="composition-story__score">
        <span>Story Score</span>
        <strong>${model.grade} · ${model.score}</strong>
      </div>

      <div class="composition-story__copy">
        <p class="eyebrow">Composition Story</p>
        <h3>${escapeHtml(model.identity)}</h3>
        <p>${escapeHtml(model.summaryText)}</p>
        <div class="analysis-chip-list analysis-chip-list--compact">
          <span class="analysis-chip">${escapeHtml(model.objective)}</span>
          <span class="analysis-chip">${escapeHtml(model.tempo)}</span>
          ${model.topMetric.map((item) => `<span class="analysis-chip">${escapeHtml(item)}</span>`).join('')}
        </div>
      </div>
    </section>
  `;
}

function renderFlow(model) {
  return `
    <section class="composition-story__flow">
      <div class="composition-story__section-head">
        <p class="eyebrow">Resumen rápido</p>
        <h4>Cuatro ideas para jugar la composición</h4>
      </div>
      <div class="composition-story__flow-grid">
        ${model.steps.map((step, index) => `
          <article class="composition-story__card composition-story__card--${index === 0 ? 'success' : index === 2 ? 'danger' : index === 3 ? 'coach' : 'info'}">
            <span class="composition-story__step-index">0${index + 1}</span>
            <strong>${escapeHtml(step.label)}</strong>
            <p>${escapeHtml(step.detail)}</p>
            <span class="composition-story__chip">${escapeHtml(step.chip)}</span>
          </article>
        `).join('')}
      </div>
    </section>
  `;
}

function renderKeyPiece(model) {
  const piece = model.keyPiece;
  return `
    <section class="composition-story__split">
      <article class="composition-story__panel composition-story__panel--good">
        <div class="composition-story__section-head">
          <p class="eyebrow">Fortaleza principal</p>
          <h4>${escapeHtml(model.strength?.label || 'Lo mejor de la composición')}</h4>
        </div>
        ${model.strength?.detail ? `<p>${escapeHtml(model.strength.detail)}</p>` : '<p>La composición gana valor cuando juega su identidad natural.</p>'}
      </article>

      <article class="composition-story__panel composition-story__panel--danger">
        <div class="composition-story__section-head">
          <p class="eyebrow">Riesgo principal</p>
          <h4>${escapeHtml(model.risk?.label || 'Lo que puede salir mal')}</h4>
        </div>
        ${model.risk?.detail ? `<p>${escapeHtml(model.risk.detail)}</p>` : '<p>El mayor riesgo está en pelear sin visión o sin el pico de poder.</p>'}
      </article>

      <article class="composition-story__panel composition-story__panel--coach composition-story__panel--wide">
        <div class="composition-story__section-head">
          <p class="eyebrow">Pieza clave</p>
          <h4>${escapeHtml(piece?.champion || 'No definida')}</h4>
        </div>
        <p>${escapeHtml(piece ? piece.function || piece.identity || 'La composición gira alrededor de esta pieza.' : 'No hay una pieza clave definida todavía.')}</p>
        <div class="analysis-chip-list analysis-chip-list--compact">
          ${piece?.role ? `<span class="analysis-chip">${escapeHtml(ROLE_LABELS[piece.role] || piece.role)}</span>` : ''}
          ${piece?.tempo ? `<span class="analysis-chip">${escapeHtml(asText(piece.tempo))}</span>` : ''}
          ${piece?.identity ? `<span class="analysis-chip">${escapeHtml(asText(piece.identity))}</span>` : ''}
        </div>
      </article>
    </section>
  `;
}

function renderTimeline(model) {
  const timeline = [
    { phase: 'Early', text: model.phases[0] || 'Farm y visión' },
    { phase: 'Mid', text: model.phases[1] || 'Objetivos y rotaciones' },
    { phase: 'Late', text: model.phases[2] || '5v5 y cierre' },
  ];

  return `
    <section class="composition-story__timeline">
      <div class="composition-story__section-head">
        <p class="eyebrow">Timeline</p>
        <h4>Cuándo presionar</h4>
      </div>
      <div class="composition-story__timeline-grid">
        ${timeline.map((item, index) => `
          <article class="composition-story__timeline-card">
            <span>${index + 1}</span>
            <strong>${escapeHtml(item.phase)}</strong>
            <p>${escapeHtml(item.text)}</p>
          </article>
        `).join('')}
      </div>
    </section>
  `;
}

function renderQuestions() {
  return `
    <section class="composition-story__questions">
      <div class="composition-story__section-head">
        <p class="eyebrow">Pregunta a Rift</p>
        <h4>La composición en una frase</h4>
      </div>
      <div class="analysis-chip-list analysis-chip-list--compact">
        <span class="analysis-chip">¿Cómo gano?</span>
        <span class="analysis-chip">¿Quién inicia?</span>
        <span class="analysis-chip">¿Qué debo evitar?</span>
        <span class="analysis-chip">¿Cuándo soy fuerte?</span>
      </div>
    </section>
  `;
}

function renderEmptyState() {
  return `
    <section class="composition-story composition-story--empty">
      <p class="eyebrow">Composition Story</p>
      <h3>Selecciona cinco campeones para ver la historia de tu composición</h3>
      <p>La vista resumirá tu plan: cómo ganas, qué pieza manda, qué evitar y cuándo presionar.</p>
      <div class="composition-story__empty-grid">
        <span>Identidad</span>
        <span>Cómo gana</span>
        <span>Pieza clave</span>
        <span>Timeline</span>
      </div>
    </section>
  `;
}

function renderStory() {
  if (!els.root) return;
  const selectedChampions = collectSelectedChampions();

  if (selectedChampions.length < 5) {
    els.root.innerHTML = renderEmptyState();
    return;
  }

  const analysis = analyzeComposition(selectedChampions);
  const model = buildStoryModel(analysis, selectedChampions);

  els.root.innerHTML = `
    <section class="composition-story">
      ${renderHero(model)}
      ${renderFlow(model)}
      ${renderKeyPiece(model)}
      ${renderTimeline(model)}
      ${renderQuestions()}
    </section>
  `;
}

function observeComposition() {
  const node = document.getElementById('compositionGrid');
  if (!node) {
    window.requestAnimationFrame(observeComposition);
    return;
  }

  const observer = new MutationObserver(schedulePatch);
  observer.observe(node, { childList: true, subtree: true, characterData: true });
}

function schedulePatch() {
  if (state.patchScheduled) return;
  state.patchScheduled = true;
  window.requestAnimationFrame(() => {
    state.patchScheduled = false;
    renderStory();
  });
}
