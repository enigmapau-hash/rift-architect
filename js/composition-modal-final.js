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
}

function getSectionLines(section, model) {
  switch (section) {
    case 'composition':
      return [
        { icon: '✓', label: 'Identidad', value: model.identity, meta: `Confianza ${model.grade} · ${model.score}/100`, score: model.score },
        { icon: '★', label: 'Win condition', value: model.winCondition, meta: model.quickCoach, score: Math.max(55, model.score - 4) },
        { icon: '⚔', label: 'Pieza clave', value: model.keyPiece?.champion || 'Sin pieza clave', meta: [model.keyPiece?.function, model.keyPiece?.identity, model.keyPiece?.tempo].filter(Boolean).join(' · ') || 'Sin definición clara', score: model.keyPiece ? 84 : 52 },
        { icon: '⚠', label: 'Hueco principal', value: model.weaknesses[0]?.label || 'Sin hueco crítico', meta: model.weaknesses[0]?.detail || 'La composición está bastante cerrada.', score: model.weaknesses.length ? 62 : 80 },
      ];

    case 'victory':
      return [
        { icon: '▶', label: 'Tempo', value: model.tempo, meta: model.quickCoach, score: 78 },
        { icon: '◔', label: 'Early', value: model.phases[0] || 'Presión temprana', meta: model.gamePlan[0] || 'Busca prioridad y visión', score: 72 },
        { icon: '◑', label: 'Mid', value: model.phases[1] || 'Encadenar picks', meta: model.gamePlan[1] || 'Convierte ventaja en objetivo', score: 82 },
        { icon: '◕', label: 'Late', value: model.phases[2] || 'Cerrar limpio', meta: model.gamePlan[2] || 'No alargues la pelea', score: 68 },
      ];

    case 'priorities':
      return [
        { icon: '1', label: 'Prioridad 1', value: model.priorities[0] || 'Ganar la ventana', meta: model.checklist[0]?.label || 'Sigue el plan principal', score: 88 },
        { icon: '2', label: 'Prioridad 2', value: model.priorities[1] || 'Preparar el objetivo', meta: model.checklist[1]?.label || 'Cierra la siguiente acción', score: 76 },
        { icon: '3', label: 'Prioridad 3', value: model.priorities[2] || 'No dispersarse', meta: model.checklist[2]?.label || 'Evita desviarte del plan', score: 64 },
      ];

    case 'risks':
      return [
        { icon: '✖', label: 'Riesgo 1', value: model.avoid[0] || 'Forzar peleas malas', meta: model.weaknesses[0]?.label || 'El hueco más castigado', score: 28 },
        { icon: '✖', label: 'Riesgo 2', value: model.avoid[1] || 'Quedarte sin control', meta: model.criticalErrors[0]?.label || 'Evita el error crítico', score: 34 },
        { icon: '✖', label: 'Riesgo 3', value: model.avoid[2] || 'Alargar de más', meta: model.criticalErrors[1]?.label || 'No regales tiempo', score: 40 },
      ];

    case 'draft':
      return [
        { icon: '🛡', label: 'Necesidad', value: model.compositionNeeds[0]?.label || 'Cerrar frontline', meta: model.compositionNeeds[0]?.detail || 'El draft debe cubrir este hueco.', score: 68 },
        { icon: '⚡', label: 'Pick', value: model.pickRecommendations[0]?.label || 'Añadir una pieza', meta: model.pickRecommendations[0]?.detail || 'Mejora el plan', score: 76 },
        { icon: '⛔', label: 'Ban', value: model.banRecommendations[0]?.label || 'Bloquear amenaza', meta: model.banRecommendations[0]?.detail || 'Protege tu plan', score: 58 },
      ];

    case 'advanced':
    default:
      return [
        { icon: '◎', label: 'Coherencia', value: model.coherenceLabel, meta: model.coherenceDetail, score: model.score },
        { icon: '▤', label: 'Métricas', value: model.metrics[0]?.label || 'Lectura estable', meta: model.metrics[0]?.detail || `${model.metrics.length} métricas activas`, score: 72 },
        { icon: '🧠', label: 'Insights', value: model.insights[0] || 'Juega alrededor del plan', meta: model.insights[1] || 'La IA compacta la explicación', score: 70 },
        { icon: 'ℹ', label: 'Señales', value: model.executionProfile[0]?.label || 'Perfil de ejecución', meta: model.executionProfile[0]?.detail || 'Lo que pide la partida', score: 66 },
      ];
  }
}

function getSectionTone(section) {
  switch (section) {
    case 'composition':
      return 'info';
    case 'victory':
      return 'success';
    case 'priorities':
      return 'success';
    case 'risks':
      return 'danger';
    case 'draft':
      return 'neutral';
    default:
      return 'info';
  }
}

function buildStoryModel(analysis, selectedChampions) {
  const executive = analysis?.executiveSummary || {};
  const coach = analysis?.coach || {};
  const advisor = analysis?.advisor || {};
  const draftAssistant = analysis?.draftAssistant || {};

  const strengths = asArray(analysis?.strengths).slice(0, 4).map(normalizeEntry);
  const weaknesses = asArray(analysis?.weaknesses).slice(0, 4).map(normalizeEntry);
  const phases = asArray(analysis?.tempoDetail?.phases).slice(0, 3).map((phase) => asText(phase)).filter(Boolean);
  const gamePlan = asArray(analysis?.gamePlan).slice(0, 3).map((step) => asText(step)).filter(Boolean);
  const tempo = asText(analysis?.tempoDetail?.label || analysis?.tempo || 'Mid Game');
  const identity = asText(analysis?.primaryIdentity || executive.title || 'Sin identidad clara');
  const score = clampToRange(Number(analysis?.confidence) || Number(executive.score) || 0, 0, 100);
  const grade = gradeFromScore(score);
  const keyPiece = findKeyPiece(selectedChampions);
  const objectivePriority = asArray(advisor.objectivePriority).slice(0, 3).map(normalizeEntry);
  const loseConditions = asArray(advisor.loseConditions).slice(0, 3).map((item) => normalizeEntry({ label: item?.label ?? item, detail: item?.detail ?? item?.reason ?? item?.description ?? '' }));

  const priorities = uniqueValues([
    ...objectivePriority.map((item) => item.label),
    asText(analysis?.winCondition?.label || executive.priorities?.[0]?.label || ''),
    keyPiece ? `Cuidar a ${keyPiece.champion}` : 'Proteger tu pieza clave',
  ]).slice(0, 3);

  const avoid = uniqueValues([
    ...loseConditions.map((item) => item.label),
    ...weaknesses.map((item) => item.label),
    'Forzar peleas antes del pico de poder',
  ]).slice(0, 3);

  const checklist = asArray(executive.checklist).slice(0, 4).map(normalizeEntry);
  const criticalErrors = asArray(executive.criticalErrors).slice(0, 4).map(normalizeEntry);
  const execPriorities = asArray(executive.priorities).slice(0, 4).map(normalizeEntry);
  const executionProfile = asArray(executive.executionProfile).slice(0, 4).map(normalizeEntry);
  const compositionNeeds = asArray(draftAssistant.compositionNeeds).slice(0, 4).map(normalizeEntry);
  const pickRecommendations = asArray(draftAssistant.pickRecommendations).slice(0, 4).map(normalizeEntry);
  const banRecommendations = asArray(draftAssistant.banRecommendations).slice(0, 4).map(normalizeEntry);
  const metrics = asArray(analysis?.metrics).slice(0, 4).map(normalizeEntry);
  const insights = uniqueValues(asArray(coach.insights).map((item) => asText(item?.label ?? item)).filter(Boolean)).slice(0, 4);
  const alerts = uniqueValues(asArray(coach.alerts).map((item) => asText(item?.label ?? item)).filter(Boolean)).slice(0, 4);

  return {
    analysis,
    selectedCount: selectedChampions.length,
    score,
    grade,
    identity,
    summaryText: asText(analysis?.summaryText || `Tu composición gira alrededor de ${identity} y necesita una lectura simple para convertir esa idea en decisiones.`),
    winCondition: asText(analysis?.winCondition?.detail || analysis?.winCondition?.label || 'Escala y gana la pelea correcta en tu ventana de poder.'),
    tempo,
    phases,
    gamePlan,
    keyPiece,
    strengths,
    weaknesses,
    priorities,
    avoid,
    checklist,
    criticalErrors,
    execPriorities,
    executionProfile,
    objectivePriority,
    compositionNeeds,
    pickRecommendations,
    banRecommendations,
    metrics,
    insights,
    alerts,
    quickCoach: asText(coach.headline || coach.summary || 'Juega alrededor de tu identidad.'),
    draftSummary: asText(draftAssistant.summary || draftAssistant.profileSummary || 'La composición todavía pide completar huecos concretos con picks y bans que protejan el plan.'),
    coherenceLabel: asText(analysis?.coherence?.label || 'Coherencia'),
    coherenceDetail: asText(analysis?.coherence?.detail || 'La consistencia del plan se apoya en el motor y en la composición seleccionada.'),
  };
}

function findKeyPiece(selectedChampions) {
  return (
    findChampionByTags(selectedChampions, ['adc', 'carry', 'hypercarry', 'escalado']) ||
    findChampionByTags(selectedChampions, ['engage', 'iniciación', 'iniciacion', 'frontline', 'start']) ||
    findChampionByTags(selectedChampions, ['peel', 'protect', 'shield']) ||
    findChampionByTags(selectedChampions, ['frontline', 'tanque', 'front', 'defensa']) ||
    selectedChampions[0] ||
    null
  );
}

function findChampionByTags(selectedChampions, tags = []) {
  const normalizedTags = tags.map((tag) => normalizeText(tag));
  return selectedChampions.find((champion) => {
    const values = [champion.champion, champion.identity, champion.function, champion.tempo, ...asArray(champion.strengths), ...asArray(champion.weaknesses)];
    return values.some((value) => normalizedTags.some((tag) => normalizeText(asText(value)).includes(tag)));
  });
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

function normalizeSelectedChampion(champion) {
  if (!champion) return null;
  return {
    role: asText(champion.role, 'top'),
    champion: asText(champion.champion, 'Sin definir'),
    identity: asText(champion.identity, ''),
    function: asText(champion.function, ''),
    tempo: asText(champion.tempo, ''),
    strengths: asArray(champion.strengths).map((item) => asText(item)).filter(Boolean),
    weaknesses: asArray(champion.weaknesses).map((item) => asText(item)).filter(Boolean),
  };
}

function findChampion(roleKey, championName) {
  const normalizedName = String(championName || '').trim().toLowerCase();
  const rows = state.data.get(roleKey) || [];
  return rows.find((item) => String(item?.champion || '').trim().toLowerCase() === normalizedName) || null;
}

function normalizeEntry(item) {
  return {
    label: asText(item?.label ?? item?.name ?? item?.title ?? item?.text ?? item?.value ?? item?.champion ?? item, 'Sin definir'),
    detail: asText(item?.detail ?? item?.summary ?? item?.description ?? item?.reason ?? item?.note ?? item?.explanation ?? item?.message ?? '', ''),
    score: Number.isFinite(Number(item?.score)) ? Math.round(Number(item.score)) : null,
  };
}

function joinTexts(values = []) {
  return uniqueValues(values.map((value) => asText(value)).filter(Boolean)).join(' · ') || 'Sin datos';
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

function clampToRange(value, min, max) {
  return Math.min(max, Math.max(min, value));
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

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
