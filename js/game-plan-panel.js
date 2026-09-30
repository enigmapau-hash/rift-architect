import { analyzeComposition } from './analyzer.js';

const WORKBOOK_URL = './Draft%20Pool.xlsx';
const DATA_MANIFEST_URL = './data/index.json';
const ROLE_FILES = [
  { key: 'top', label: 'Top', file: './data/top.json', sheet: 'Tabla Top' },
  { key: 'jungle', label: 'Jungla', file: './data/jungle.json', sheet: 'Tabla Jungla' },
  { key: 'mid', label: 'Mid', file: './data/mid.json', sheet: 'Tabla Mid' },
  { key: 'botline', label: 'Botline', file: './data/bot.json', sheet: 'Tabla Botline' },
  { key: 'support', label: 'Support', file: './data/support.json', sheet: 'Tabla Support' },
];

const ROLE_ORDER = ROLE_FILES.map(({ key }) => key);
const ROLE_LABELS = Object.fromEntries(ROLE_FILES.map(({ key, label }) => [key, label]));
const QUESTION_BLUEPRINTS = [
  { key: 'early', label: 'Early' },
  { key: 'mid', label: 'Mid' },
  { key: 'late', label: 'Late' },
  { key: 'behind', label: 'Si voy por detrás' },
  { key: 'coach', label: 'Consejo IA' },
];

const state = {
  data: new Map(),
  dataLoaded: false,
  patchScheduled: false,
  activeQuestion: 'early',
};

const els = {};

init().catch((error) => console.error(error));

async function init() {
  els.root = document.getElementById('gamePlanView');
  await loadRoleData();
  observeComposition();
  renderSummary();
  window.setInterval(renderSummary, 1400);
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
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || fallback;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    const joined = value.map((item) => asText(item, '')).filter(Boolean).join(' · ');
    return joined || fallback;
  }
  if (typeof value === 'object') {
    return asText(value.label ?? value.name ?? value.title ?? value.text ?? value.value ?? value.detail ?? value.summary ?? value.reason ?? value.description ?? value.champion ?? value.item ?? '', fallback);
  }
  return String(value) || fallback;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueValues(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function normalizeText(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function normalizeEntry(item) {
  const label = asText(item?.label ?? item?.name ?? item?.title ?? item?.text ?? item?.value ?? item?.champion ?? item, 'Sin definir');
  const detail = asText(item?.detail ?? item?.summary ?? item?.description ?? item?.reason ?? item?.note ?? item?.explanation ?? item?.message ?? '', '');
  const champions = asArray(item?.champions).map((entry) => asText(entry)).filter(Boolean);
  const missing = asArray(item?.missing).map((entry) => asText(entry)).filter(Boolean);
  const score = Number.isFinite(Number(item?.score)) ? Math.round(Number(item.score)) : null;
  return { label, detail, champions, missing, score };
}

function normalizeSelectedChampion(champion) {
  if (!champion) return null;
  return {
    role: champion.role,
    champion: champion.champion,
    identity: champion.identity,
    function: champion.function,
    tempo: champion.tempo,
    strengths: asArray(champion.strengths),
    weaknesses: asArray(champion.weaknesses),
  };
}

function toChips(values = [], limit = 4) {
  return uniqueValues(values.map((value) => asText(value)).filter((value) => value && value !== 'Sin definir')).slice(0, limit);
}

function matchesAny(value, keywords = []) {
  const normalizedValue = normalizeText(asText(value));
  return keywords.some((keyword) => normalizedValue.includes(normalizeText(keyword)));
}

async function loadRoleData() {
  if (state.dataLoaded) return;
  state.dataLoaded = true;

  const loaded = await loadJsonDataset() || await loadWorkbookDataset();
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
      return normalizeSelectedChampion(champion ? { role, ...champion } : null);
    })
    .filter(Boolean);
}

function findChampionByTags(selectedChampions, tags = []) {
  return selectedChampions.find((champion) => {
    const values = [champion.champion, champion.identity, champion.function, champion.tempo, ...asArray(champion.strengths), ...asArray(champion.weaknesses)];
    return values.some((value) => matchesAny(value, tags));
  });
}

function buildPlan(analysis, selectedChampions) {
  const phases = asArray(analysis?.tempoDetail?.phases).slice(0, 3).map((phase) => asText(phase));
  const gamePlan = asArray(analysis?.gamePlan).slice(0, 3).map((step) => asText(step));
  const strengths = asArray(analysis?.strengths).slice(0, 2).map(normalizeEntry);
  const weaknesses = asArray(analysis?.weaknesses).slice(0, 2).map(normalizeEntry);
  const coach = analysis?.coach || analysis?.assistant || {};
  const advisor = analysis?.advisor || analysis?.assistant || {};
  const engager = findChampionByTags(selectedChampions, ['engage', 'iniciación', 'iniciacion', 'frontline', 'start']);
  const carry = findChampionByTags(selectedChampions, ['carry', 'adc', 'hypercarry', 'escalado']);
  const frontline = findChampionByTags(selectedChampions, ['frontline', 'tanque', 'peel', 'protect']);
  const risk = weaknesses[0];

  return {
    identity: analysis?.primaryIdentity || 'Sin definir',
    grade: (analysis?.coherence?.score || 0) >= 80 ? 'A' : (analysis?.coherence?.score || 0) >= 65 ? 'B' : 'C',
    score: Number.isFinite(Number(analysis?.coherence?.score)) ? Math.round(Number(analysis.coherence.score)) : 0,
    mission: analysis?.winCondition?.detail || analysis?.winCondition?.label || 'Juega alrededor de tu identidad y prepara la pelea correcta.',
    early: gamePlan[0] || phases[0] || 'Prioriza farm seguro y visión.',
    mid: gamePlan[1] || phases[1] || 'Busca dragones, herald y prioridad de mapa.',
    late: gamePlan[2] || phases[2] || 'Agrúpate y resuelve la partida en 5v5.',
    behind: asArray(advisor.loseConditions).slice(0, 2).map((item) => asText(item)).filter(Boolean),
    coach: coach.headline || 'Juega alrededor de tu identidad.',
    engager: engager?.champion || 'No hay iniciador claro',
    carry: carry?.champion || 'Tu carry principal',
    frontline: frontline?.champion || 'Tu frontline',
    risk: risk?.label || 'Sin riesgo claro',
    riskDetail: risk?.detail || 'La IA te avisará de tu punto débil más importante.',
    strengths: strengths.length ? strengths : [{ label: 'Sin fortaleza clara', detail: 'La composición aún no tiene una fortaleza dominante.', score: null }],
  };
}

function renderGamePlan(analysis, selectedChampions) {
  const plan = buildPlan(analysis, selectedChampions);
  const answers = {
    early: { title: 'Early', text: plan.early, chips: toChips([plan.identity, plan.engager, plan.frontline]) },
    mid: { title: 'Mid', text: plan.mid, chips: toChips([plan.mission, plan.carry, plan.coach]) },
    late: { title: 'Late', text: plan.late, chips: toChips([plan.carry, plan.frontline, plan.identity]) },
    behind: { title: 'Si vas por detrás', text: plan.behind.length ? plan.behind.join(' · ') : 'No fuerces objetivos. Busca picks y controla visión.', chips: ['visión', 'picks', 'no forzar'] },
    coach: { title: 'Consejo IA', text: plan.coach, chips: toChips(plan.strengths.map((item) => item.label), 3) },
  };
  const active = answers[state.activeQuestion] || answers.early;

  return `
    <section class="game-plan ${selectedChampions.length ? '' : 'game-plan--empty'}">
      <div class="game-plan__header">
        <div class="game-plan__title">
          <p class="eyebrow">Game Plan Engine</p>
          <h3>${selectedChampions.length ? 'Tu plan de partida' : 'Selecciona cinco campeones para ver el plan de partida'}</h3>
          <p class="game-plan__detail">${selectedChampions.length ? plan.mission : 'Aquí aparecerá qué hacer en early, mid y late, más una respuesta simple a tus preguntas rápidas.'}</p>
        </div>
        ${selectedChampions.length ? `
          <div class="game-plan__badge">
            <strong>${escapeHtml(plan.grade)}</strong>
            <span>${plan.score}/100</span>
            <em>Plan</em>
          </div>
        ` : ''}
      </div>

      ${selectedChampions.length ? `
        <div class="game-plan__grid">
          <article class="game-plan__phase game-plan__phase--info">
            <span class="game-plan__phase-label">Early</span>
            <strong>${escapeHtml(plan.early)}</strong>
            <p>Prioriza farm, visión y no regalar peleas largas.</p>
          </article>
          <article class="game-plan__phase game-plan__phase--success">
            <span class="game-plan__phase-label">Mid</span>
            <strong>${escapeHtml(plan.mid)}</strong>
            <p>Convierte prioridad en dragones, herald y control del mapa.</p>
          </article>
          <article class="game-plan__phase game-plan__phase--coach">
            <span class="game-plan__phase-label">Late</span>
            <strong>${escapeHtml(plan.late)}</strong>
            <p>Juega alrededor del carry y ciérralo en peleas agrupadas.</p>
          </article>
        </div>

        <div class="game-plan__secondary">
          <article class="game-plan__panel game-plan__panel--danger">
            <div class="game-plan__section-head">
              <p class="eyebrow">Si vas por detrás</p>
              <h4>No fuerces tu plan principal</h4>
            </div>
            <ul class="game-plan__list">
              ${(plan.behind.length ? plan.behind : ['Mantén el oro', 'Evita 5v5 abiertos', 'Busca picks']).slice(0, 3).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
            </ul>
          </article>
          <article class="game-plan__panel game-plan__panel--coach">
            <div class="game-plan__section-head">
              <p class="eyebrow">Consejo IA</p>
              <h4>${escapeHtml(plan.coach)}</h4>
            </div>
            <div class="game-plan__coach-grid">
              <div><span>Pieza clave</span><strong>${escapeHtml(plan.carry)}</strong></div>
              <div><span>Inicia</span><strong>${escapeHtml(plan.engager)}</strong></div>
              <div><span>Frontline</span><strong>${escapeHtml(plan.frontline)}</strong></div>
              <div><span>Riesgo</span><strong>${escapeHtml(plan.risk)}</strong></div>
            </div>
            <p class="game-plan__coach-note">${escapeHtml(plan.riskDetail)}</p>
          </article>
        </div>

        <div class="game-plan__question-panel">
          <div class="game-plan__question-head">
            <div>
              <p class="eyebrow">Preguntas rápidas</p>
              <h4>Qué hacer ahora</h4>
            </div>
            <div class="game-plan__question-buttons">
              ${QUESTION_BLUEPRINTS.map((q) => `<button type="button" class="game-plan__question ${state.activeQuestion === q.key ? 'is-active' : ''}" data-question="${q.key}">${escapeHtml(q.label)}</button>`).join('')}
            </div>
          </div>
          <div class="game-plan__answer-card">
            <span class="game-plan__answer-kicker">${escapeHtml(active.title)}</span>
            <strong>${escapeHtml(active.text)}</strong>
            <div class="analysis-chip-list analysis-chip-list--compact">
              ${active.chips.map((chip) => `<span class="analysis-chip">${escapeHtml(chip)}</span>`).join('')}
            </div>
          </div>
        </div>
      ` : `
        <p class="game-plan__note">Aquí aparecerá qué hacer en early, mid y late, más una respuesta simple a tus preguntas rápidas.</p>
        <div class="game-plan__empty-grid">
          <div class="game-plan__empty-chip">Early</div>
          <div class="game-plan__empty-chip">Mid</div>
          <div class="game-plan__empty-chip">Late</div>
          <div class="game-plan__empty-chip">IA</div>
        </div>
      `}
    </section>
  `;
}

function renderEmptyState() {
  return `
    <section class="game-plan game-plan--empty">
      <div class="game-plan__header">
        <div>
          <p class="eyebrow">Game Plan Engine</p>
          <h3>Selecciona cinco campeones para ver el plan de partida</h3>
          <p class="game-plan__detail">Aquí aparecerá qué hacer en early, mid y late, más una respuesta simple a tus preguntas rápidas.</p>
        </div>
      </div>
      <div class="game-plan__empty-grid">
        <div class="game-plan__empty-chip">Early</div>
        <div class="game-plan__empty-chip">Mid</div>
        <div class="game-plan__empty-chip">Late</div>
        <div class="game-plan__empty-chip">IA</div>
      </div>
    </section>
  `;
}

function renderSummary() {
  if (!els.root) return;
  const selectedChampions = collectSelectedChampions();
  if (!selectedChampions.length) {
    els.root.innerHTML = renderEmptyState();
    return;
  }

  const analysis = analyzeComposition(selectedChampions);
  els.root.innerHTML = renderGamePlan(analysis, selectedChampions);
  bindQuestionActions();
}

function bindQuestionActions() {
  if (!els.root) return;
  els.root.querySelectorAll('[data-question]').forEach((button) => {
    button.addEventListener('click', () => {
      state.activeQuestion = button.dataset.question || 'early';
      renderSummary();
    });
  });
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
    renderSummary();
  });
}
