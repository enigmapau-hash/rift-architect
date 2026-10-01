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

const state = {
  data: new Map(),
  loaded: false,
  scheduled: false,
  applying: false,
};

init().catch((error) => console.error(error));

async function init() {
  await loadRoleData();
  observeComposition();
  renderMotorTrace();
}

function observeComposition() {
  const node = document.getElementById('compositionGrid');
  if (!node) {
    window.requestAnimationFrame(observeComposition);
    return;
  }

  const observer = new MutationObserver(scheduleRender);
  observer.observe(node, { childList: true, subtree: true, characterData: true });
  scheduleRender();
}

function scheduleRender() {
  if (state.applying || state.scheduled) return;
  state.scheduled = true;
  window.requestAnimationFrame(() => {
    state.scheduled = false;
    renderMotorTrace();
  });
}

function renderMotorTrace() {
  const storyView = document.getElementById('storyView');
  if (!storyView) return;

  const selectedChampions = collectSelectedChampions();
  if (selectedChampions.length < 5) {
    clearMotorTrace();
    return;
  }

  const analysis = analyzeComposition(selectedChampions);
  const executive = analysis.executiveSummary || {};
  const advisor = analysis.advisor || {};
  const coach = analysis.coach || {};
  const draftAssistant = analysis.draftAssistant || {};
  const executionProfile = Array.isArray(executive.executionProfile) ? executive.executionProfile : [];
  const criticalErrors = Array.isArray(executive.criticalErrors) ? executive.criticalErrors : [];
  const checklist = Array.isArray(executive.checklist) ? executive.checklist : [];
  const execPriorities = Array.isArray(executive.priorities) ? executive.priorities : [];
  const objectivePriority = Array.isArray(advisor.objectivePriority) ? advisor.objectivePriority : [];
  const gameWindows = advisor.gameWindows || {};
  const compositionNeeds = Array.isArray(draftAssistant.compositionNeeds) ? draftAssistant.compositionNeeds : [];
  const pickRecommendations = Array.isArray(draftAssistant.pickRecommendations) ? draftAssistant.pickRecommendations : [];
  const banRecommendations = Array.isArray(draftAssistant.banRecommendations) ? draftAssistant.banRecommendations : [];
  const metrics = Array.isArray(analysis.metrics) ? analysis.metrics : [];
  const topRisk = Array.isArray(advisor.loseConditions) ? advisor.loseConditions[0] : null;

  state.applying = true;
  try {
    upsertMotorTrace('composition', storyView, [
      makeTraceItem('Resumen ejecutivo', executive.title || analysis.primaryIdentity || 'Sin definir', executive.text || analysis.summaryText || 'La lectura se apoya en el motor y en la composición.'),
      makeTraceItem('Fuente principal', 'Executive Summary + Coach', uniqueItems([
        analysis.primaryIdentity,
        analysis.winCondition?.label,
        analysis.tempoDetail?.label,
      ]).join(' · ') || 'Identidad + condición de victoria + tempo'),
      makeTraceItem('Confianza', `${gradeLabel(executive.score)} · ${analysis.confidence || 0}/100`, uniqueItems(executive.tags || []).join(' · ') || 'Sin etiquetas adicionales'),
    ]);

    upsertMotorTrace('victory', storyView, [
      makeTraceItem('Objetivo principal', advisor.primaryObjective || analysis.winCondition?.label || 'Jugar alrededor de la identidad', advisor.summary?.reason || analysis.winCondition?.detail || 'La victoria sale de la lectura del draft.'),
      makeTraceItem('Ventanas', phaseSummary(gameWindows), uniqueItems([
        objectivePriority[0]?.label,
        objectivePriority[1]?.label,
        analysis.tempoDetail?.label,
      ]).join(' · ') || 'Ventana natural de poder'),
      makeTraceItem('Pico de poder', analysis.tempoDetail?.label || analysis.tempo || 'Mid Game', analysis.winCondition?.detail || 'Ganarás cuando tu ventana se active.'),
    ]);

    upsertMotorTrace('priorities', storyView, [
      makeTraceItem('Checklist', checklist.slice(0, 3).map((item) => item?.label || item).filter(Boolean).join(' · ') || 'Sin checklist', checklist.slice(0, 3).map((item) => item?.detail || item).filter(Boolean).join(' · ') || 'Pasos del coach y la IA'),
      makeTraceItem('Prioridades IA', execPriorities.slice(0, 3).map((item) => item?.label || item).filter(Boolean).join(' · ') || 'Sin prioridades', execPriorities.slice(0, 3).map((item) => item?.detail || item).filter(Boolean).join(' · ') || 'Lo más importante ahora'),
      makeTraceItem('Coach', coach.headline || coach.summary || 'Juega alrededor de tu identidad.', coach.briefing || coach.summary || 'El motor ordena la ejecución desde la identidad.'),
    ]);

    upsertMotorTrace('risks', storyView, [
      makeTraceItem('Errores críticos', criticalErrors.slice(0, 3).map((item) => item?.label || item).filter(Boolean).join(' · ') || 'Sin errores críticos', criticalErrors.slice(0, 3).map((item) => item?.detail || item).filter(Boolean).join(' · ') || 'Lo que más castiga el plan'),
      makeTraceItem('Riesgo mayor', topRisk?.label || 'Sin riesgo claro', topRisk?.detail || 'El análisis todavía no detecta un castigo dominante.'),
      makeTraceItem('Debilidades', uniqueItems(analysis.weaknesses || []).slice(0, 3).join(' · ') || 'Sin debilidades visibles', 'Se conectan al perfil del draft y al plan de juego.'),
    ]);

    upsertMotorTrace('draft', storyView, [
      makeTraceItem('Necesidades', compositionNeeds.slice(0, 3).map((item) => item?.label || item).filter(Boolean).join(' · ') || 'Sin necesidades', compositionNeeds.slice(0, 3).map((item) => item?.detail || item).filter(Boolean).join(' · ') || 'Huecos que el draft debe cubrir'),
      makeTraceItem('Picks', pickRecommendations.slice(0, 3).map((item) => item?.label || item).filter(Boolean).join(' · ') || 'Sin picks', pickRecommendations.slice(0, 3).map((item) => item?.detail || item).filter(Boolean).join(' · ') || 'Opciones que completan el plan'),
      makeTraceItem('Bans', banRecommendations.slice(0, 3).map((item) => item?.label || item).filter(Boolean).join(' · ') || 'Sin bans', banRecommendations.slice(0, 3).map((item) => item?.detail || item).filter(Boolean).join(' · ') || 'Amenazas que frenan el plan'),
    ]);

    upsertMotorTrace('advanced', storyView, [
      makeTraceItem('Ejecución', executionProfile.slice(0, 3).map((item) => item?.label || item).filter(Boolean).join(' · ') || 'Perfil de ejecución', executionProfile.slice(0, 3).map((item) => `${item?.badge || ''} ${item?.detail || ''}`.trim()).filter(Boolean).join(' · ') || 'Coordinación, macro, micro y visión'),
      makeTraceItem('Métricas', metrics.slice(0, 4).map((item) => item?.label || item).filter(Boolean).join(' · ') || 'Sin métricas', metrics.slice(0, 4).map((item) => `${item?.score ?? ''}/10`.replace(/^\//, '')).join(' · ') || 'Señales cuantitativas del motor'),
      makeTraceItem('Razón', analysis.coherence?.label || 'Coherencia', analysis.coherence?.detail || 'La consistencia del plan se apoya en el motor y la composición.'),
    ]);
  } finally {
    state.applying = false;
  }
}

function upsertMotorTrace(cardKey, storyView, rows) {
  const body = storyView.querySelector(`details[data-accordion-card="${cardKey}"] .design-system-card__body`);
  if (!body) return;

  const existing = body.querySelector(`.motor-trace[data-motor-trace="${cardKey}"]`);
  const html = `
    <article class="design-system-card design-system-card--detail motor-trace" data-motor-trace="${cardKey}">
      <span class="design-system-badge design-system-badge--muted">Motor</span>
      <div class="design-system-flow">
        ${rows.map((row, index) => renderTraceRow(row, index)).join('')}
      </div>
    </article>
  `;

  if (existing && existing.outerHTML === html) return;
  if (existing) existing.remove();
  body.insertAdjacentHTML('beforeend', html);
}

function renderTraceRow(row, index) {
  const tone = index === 0 ? 'is-hero' : index === 1 ? 'is-primary' : 'is-warning';
  return `
    <article class="design-system-flow__item ${tone}">
      <span class="design-system-flow__label">${escapeHtml(row.label)}</span>
      <p class="design-system-flow__value">${escapeHtml(row.value)}</p>
      ${row.detail ? `<p class="design-system-flow__meta">${escapeHtml(row.detail)}</p>` : ''}
    </article>
  `;
}

function makeTraceItem(label, value, detail = '') {
  return { label: asText(label, 'Sin definir'), value: asText(value, 'Sin definir'), detail: asText(detail, '') };
}

function phaseSummary(gameWindows) {
  return uniqueItems([
    gameWindows?.early?.label ? `Early: ${gameWindows.early.label}` : null,
    gameWindows?.mid?.label ? `Mid: ${gameWindows.mid.label}` : null,
    gameWindows?.late?.label ? `Late: ${gameWindows.late.label}` : null,
  ]).join(' · ') || 'Early · Mid · Late';
}

function clearMotorTrace() {
  document.querySelectorAll('.motor-trace[data-motor-trace]').forEach((node) => node.remove());
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
      }),
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
      return normalizeChampion(champion ? { role, ...champion } : null);
    })
    .filter(Boolean);
}

function normalizeChampion(champion) {
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

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asText(value, fallback = 'Sin definir') {
  if (value == null) return fallback;
  if (typeof value === 'string') return value.trim() || fallback;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map((item) => asText(item, '')).filter(Boolean).join(' · ') || fallback;
  if (typeof value === 'object') {
    return asText(value.label ?? value.name ?? value.title ?? value.text ?? value.value ?? value.detail ?? value.summary ?? value.reason ?? value.description ?? value.champion ?? value.item ?? '', fallback);
  }
  return String(value) || fallback;
}

function uniqueItems(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function gradeLabel(score) {
  if (score >= 90) return 'S';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  return 'D';
}
