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
const ROLE_LABELS = Object.fromEntries(ROLE_FILES.map(({ key, sheet }) => [key, sheet.replace(/^Tabla\s+/i, '')]));
const QUESTION_BLUEPRINTS = [
  { key: 'howWin', label: 'Cómo gano' },
  { key: 'whatDo', label: 'Qué hago ahora' },
  { key: 'whatAvoid', label: 'Qué evitar' },
  { key: 'whoKey', label: 'Pieza clave' },
  { key: 'behind', label: 'Si voy por detrás' },
];

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

function gradeFromScore(score) {
  if (score >= 95) return 'A+';
  if (score >= 88) return 'A';
  if (score >= 80) return 'B+';
  if (score >= 72) return 'B';
  if (score >= 64) return 'C+';
  if (score >= 56) return 'C';
  return 'D';
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
      return normalizeSelectedChampion(champion ? { role, ...champion } : null);
    })
    .filter(Boolean);
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
  const plan = asArray(analysis?.gamePlan).slice(0, 3).map((step) => asText(step));
  const phases = asArray(analysis?.tempoDetail?.phases).slice(0, 3).map((phase) => asText(phase));
  const tempo = analysis?.tempoDetail?.label || analysis?.tempo || 'tu ventana natural de poder';
  const coach = analysis?.coach || analysis?.assistant || {};
  const advisor = analysis?.advisor || analysis?.assistant || {};
  const engager = findChampionByTags(selectedChampions, ['engage', 'iniciación', 'iniciacion', 'frontline', 'start']);
  const carry = findChampionByTags(selectedChampions, ['adc', 'carry', 'hypercarry', 'escalado']);
  const protector = findChampionByTags(selectedChampions, ['peel', 'protect', 'shield']);
  const frontline = findChampionByTags(selectedChampions, ['frontline', 'tanque', 'front', 'defensa']);
  const keyPiece = carry || engager || protector || frontline || selectedChampions[0] || null;

  const coherence = Number.isFinite(Number(analysis?.coherence?.score))
    ? Number(analysis.coherence.score)
    : Number.isFinite(Number(analysis?.confidence))
      ? Number(analysis.confidence)
      : 0;
  const roleCoverage = Math.round((new Set(asArray(selectedChampions).map((champion) => champion.role).filter(Boolean)).size / ROLE_FILES.length) * 100);
  const score = Math.max(0, Math.min(100, Math.round((coherence * 0.65) + (roleCoverage * 0.2) + (Math.max(40, 100 - weaknesses.length * 14) * 0.15))));
  const grade = gradeFromScore(score);
  const difficulty = score >= 86 ? 'Baja' : score >= 72 ? 'Media' : 'Alta';

  const objectivePriority = uniqueValues(asArray(advisor.objectivePriority).slice(0, 3).map((item) => asText(item))).filter(Boolean);
  const loseConditions = uniqueValues(asArray(advisor.loseConditions).slice(0, 3).map((item) => asText(item))).filter(Boolean);

  const priorities = [
    {
      label: objectivePriority[0] || plan[0] || 'Ganar tempo y visión',
      detail: objectivePriority[1] || 'Convierte tu identidad en un objetivo o una pelea favorable.',
    },
    {
      label: objectivePriority[1] || plan[1] || 'Agruparte en tu ventana de poder',
      detail: objectivePriority[2] || `Tu mejor momento suele aparecer en ${tempo}.`,
    },
    {
      label: keyPiece ? `Cuidar a ${keyPiece.champion}` : 'Proteger tu pieza clave',
      detail: keyPiece ? `${keyPiece.champion} es la pieza que más condiciona el resultado.` : 'La composición todavía no muestra una pieza clara.',
    },
  ];

  const avoid = uniqueValues([
    loseConditions[0] || weaknesses[0]?.label || 'Iniciar sin visión',
    loseConditions[1] || weaknesses[1]?.label || 'Dividir el equipo sin motivo',
    loseConditions[2] || 'Forzar peleas antes del pico de poder',
  ].filter(Boolean)).slice(0, 3);

  const summaryText = analysis?.summaryText || 'La composición se entiende como una historia visual: qué es, cómo gana, qué debe evitar y cuál es su plan de partida.';
  const whyItems = [
    analysis?.primaryIdentity || 'Identidad no definida',
    analysis?.winCondition?.label || 'Win condition no definida',
    analysis?.coherence?.label || 'Coherencia no definida',
  ].filter(Boolean);

  return {
    score,
    grade,
    difficulty,
    identity: analysis?.primaryIdentity || 'Sin identidad clara',
    summaryText,
    win: analysis?.winCondition?.detail || analysis?.winCondition?.label || 'Escala y gana la pelea correcta en tu ventana de poder.',
    tempo,
    phases,
    priorities,
    avoid,
    keyPiece,
    strengths,
    weaknesses,
    coach,
    advisor,
    whyItems,
    topMetric: uniqueValues((analysis?.metrics || []).map((metric) => asText(metric?.label)).filter(Boolean)).slice(0, 4),
    quickCoach: asText(coach.headline || coach.summary || 'Juega alrededor de tu identidad.'),
  };
}

function renderHero(model) {
  return `
    <section class="composition-story__hero">
      <div class="composition-story__score-card">
        <span class="composition-story__kicker">Story Score</span>
        <strong>${model.grade} · ${model.score}</strong>
        <span>${model.difficulty}</span>
      </div>

      <div class="composition-story__hero-copy">
        <p class="eyebrow">Composition Story</p>
        <h3>${escapeHtml(model.identity)}</h3>
        <p class="composition-story__lead">${escapeHtml(model.summaryText)}</p>
        <div class="composition-story__meta-row">
          <span class="story-pill story-pill--info">Cómo ganas: ${escapeHtml(model.win)}</span>
          <span class="story-pill story-pill--success">Pico: ${escapeHtml(model.tempo)}</span>
          <span class="story-pill story-pill--neutral">${escapeHtml(model.topMetric.join(' · ') || 'Sin métricas destacadas')}</span>
        </div>
      </div>
    </section>
  `;
}

function renderOverview(model) {
  return `
    <section class="composition-story__section">
      <div class="composition-story__section-head">
        <p class="eyebrow">Resumen visual</p>
        <h4>Identidad, plan y pieza clave</h4>
      </div>
      <div class="composition-story__overview-grid">
        <article class="composition-story__overview-card composition-story__overview-card--info">
          <span>Identidad</span>
          <strong>${escapeHtml(model.identity)}</strong>
          <p>${escapeHtml(model.summaryText)}</p>
        </article>
        <article class="composition-story__overview-card composition-story__overview-card--success">
          <span>Cómo gana</span>
          <strong>${escapeHtml(model.win)}</strong>
          <p>${escapeHtml(model.tempo)}</p>
        </article>
        <article class="composition-story__overview-card composition-story__overview-card--coach">
          <span>Pieza clave</span>
          <strong>${escapeHtml(model.keyPiece?.champion || 'Sin definir')}</strong>
          <p>${escapeHtml(model.keyPiece ? model.keyPiece.function || model.keyPiece.identity || 'La composición gira a su alrededor.' : 'Aún no hay una pieza clave clara.')}</p>
        </article>
      </div>
    </section>
  `;
}

function renderPlan(model) {
  return `
    <section class="composition-story__section">
      <div class="composition-story__section-head">
        <p class="eyebrow">Prioridades</p>
        <h4>Qué hacer primero</h4>
      </div>
      <div class="composition-story__card-grid composition-story__card-grid--three">
        ${model.priorities.map((item, index) => `
          <article class="composition-story__card composition-story__card--${index === 0 ? 'success' : index === 1 ? 'info' : 'coach'}">
            <span class="composition-story__index">0${index + 1}</span>
            <strong>${escapeHtml(item.label)}</strong>
            <p>${escapeHtml(item.detail)}</p>
          </article>
        `).join('')}
      </div>
      <div class="composition-story__avoid-row">
        ${model.avoid.map((item) => `<span class="story-pill story-pill--danger">${escapeHtml(item)}</span>`).join('')}
      </div>
    </section>
  `;
}

function renderPieces(model) {
  const piece = model.keyPiece;
  return `
    <section class="composition-story__two-col">
      <article class="composition-story__panel composition-story__panel--good">
        <div class="composition-story__section-head">
          <p class="eyebrow">Fortalezas</p>
          <h4>Lo que mejor hace tu composición</h4>
        </div>
        <div class="composition-story__stack-list">
          ${model.strengths.length ? model.strengths.map((item) => `
            <div class="composition-story__stack-item composition-story__stack-item--good">
              <div class="composition-story__stack-head">
                <strong>${escapeHtml(item.label)}</strong>
                ${item.score !== null ? `<span>${item.score}/10</span>` : ''}
              </div>
              ${item.detail ? `<p>${escapeHtml(item.detail)}</p>` : ''}
            </div>
          `).join('') : '<p class="composition-story__empty">Sin fortalezas claras.</p>'}
        </div>
      </article>

      <article class="composition-story__panel composition-story__panel--danger">
        <div class="composition-story__section-head">
          <p class="eyebrow">Riesgos</p>
          <h4>Qué debes compensar</h4>
        </div>
        <div class="composition-story__stack-list">
          ${model.weaknesses.length ? model.weaknesses.map((item) => `
            <div class="composition-story__stack-item composition-story__stack-item--danger">
              <div class="composition-story__stack-head">
                <strong>${escapeHtml(item.label)}</strong>
                ${item.score !== null ? `<span>${item.score}/10</span>` : ''}
              </div>
              ${item.detail ? `<p>${escapeHtml(item.detail)}</p>` : ''}
            </div>
          `).join('') : '<p class="composition-story__empty">Sin riesgos claros.</p>'}
        </div>
      </article>

      <article class="composition-story__panel composition-story__panel--coach composition-story__panel--wide">
        <div class="composition-story__section-head">
          <p class="eyebrow">Pieza clave</p>
          <h4>${escapeHtml(piece?.champion || 'No definida')}</h4>
        </div>
        <p class="composition-story__lead">${escapeHtml(piece ? piece.function || piece.identity || 'La composición gira alrededor de esta pieza.' : 'Todavía no hay una pieza clave clara.')}</p>
        <div class="composition-story__chip-list">
          ${piece?.role ? `<span class="story-pill">${escapeHtml(ROLE_LABELS[piece.role] || piece.role)}</span>` : ''}
          ${piece?.tempo ? `<span class="story-pill">${escapeHtml(asText(piece.tempo))}</span>` : ''}
          ${piece?.identity ? `<span class="story-pill">${escapeHtml(asText(piece.identity))}</span>` : ''}
        </div>
      </article>
    </section>
  `;
}

function renderTimeline(model) {
  const timeline = [
    { label: 'Early', title: model.phases[0] || 'Farm y visión', detail: 'Evita peleas largas y prepara el mapa.' },
    { label: 'Mid', title: model.phases[1] || 'Objetivos y rotaciones', detail: 'Convierte prioridad en dragones, torres o visión.' },
    { label: 'Late', title: model.phases[2] || '5v5 y cierre', detail: 'Protege la pieza clave y cierra la partida.' },
  ];

  return `
    <section class="composition-story__section">
      <div class="composition-story__section-head">
        <p class="eyebrow">Plan de partida</p>
        <h4>Cuándo presionar</h4>
      </div>
      <div class="composition-story__card-grid composition-story__card-grid--three">
        ${timeline.map((item, index) => `
          <article class="composition-story__card composition-story__card--info">
            <span class="composition-story__index">0${index + 1}</span>
            <strong>${escapeHtml(item.label)} · ${escapeHtml(item.title)}</strong>
            <p>${escapeHtml(item.detail)}</p>
          </article>
        `).join('')}
      </div>
    </section>
  `;
}

function renderQuestions(analysis, model) {
  const answers = {
    howWin: {
      title: 'Cómo ganas',
      text: model.win,
      chips: uniqueValues([model.identity, model.tempo, ...model.topMetric].filter(Boolean)).slice(0, 4),
    },
    whatDo: {
      title: 'Qué haces ahora',
      text: model.priorities[0]?.detail || 'Gana tempo y visión, luego convierte la ventaja en objetivo.',
      chips: [model.priorities[0]?.label, model.priorities[1]?.label].filter(Boolean),
    },
    whatAvoid: {
      title: 'Qué evitar',
      text: model.avoid.join(' · ') || 'Evita pelear sin visión ni prioridad.',
      chips: model.avoid,
    },
    whoKey: {
      title: 'Pieza clave',
      text: model.keyPiece ? `${model.keyPiece.champion} es la pieza que más condiciona el resultado.` : 'No hay una pieza clave clara todavía.',
      chips: uniqueValues([model.keyPiece?.champion, model.keyPiece?.identity, model.keyPiece?.function].filter(Boolean)).slice(0, 4),
    },
    behind: {
      title: 'Si vas por detrás',
      text: 'Baja el ritmo: visión, oleadas seguras y peleas cortas.',
      chips: ['visión', 'oleadas seguras', 'peleas cortas'],
    },
  };
  const active = answers[state.activeQuestion] || answers.howWin;

  return `
    <section class="composition-story__section">
      <div class="composition-story__section-head">
        <p class="eyebrow">Pregunta a Rift</p>
        <h4>Respuestas rápidas</h4>
      </div>
      <div class="composition-story__question-row">
        ${QUESTION_BLUEPRINTS.map((question) => `
          <button class="composition-story__question ${state.activeQuestion === question.key ? 'is-active' : ''}" type="button" data-question="${escapeHtml(question.key)}">
            ${escapeHtml(question.label)}
          </button>
        `).join('')}
      </div>
      <div class="composition-story__answer-card">
        <span class="composition-story__answer-kicker">${escapeHtml(active.title)}</span>
        <strong>${escapeHtml(active.text)}</strong>
        <div class="composition-story__chip-list">
          ${active.chips.map((chip) => `<span class="story-pill">${escapeHtml(chip)}</span>`).join('')}
        </div>
      </div>
      <details class="composition-story__details">
        <summary>Ver razonamiento completo</summary>
        <div class="composition-story__details-body">
          <p>${escapeHtml(asText(analysis?.summaryText || model.summaryText))}</p>
          <div class="composition-story__chip-list">
            ${model.whyItems.map((item) => `<span class="story-pill story-pill--neutral">${escapeHtml(item)}</span>`).join('')}
          </div>
          <p class="composition-story__muted">${escapeHtml(model.quickCoach)}</p>
        </div>
      </details>
    </section>
  `;
}

function renderStory() {
  if (!els.root) return;

  const selectedChampions = collectSelectedChampions();
  if (selectedChampions.length < 5) {
    els.root.innerHTML = `
      <section class="composition-story composition-story--empty">
        <p class="eyebrow">Composition Story</p>
        <h3>Selecciona cinco campeones para ver el análisis visual</h3>
        <p>La vista te mostrará identidad, cómo ganas, prioridades, riesgos, plan y una IA explicativa más clara.</p>
        <div class="composition-story__empty-grid">
          <span>Identidad</span>
          <span>Cómo gana</span>
          <span>Pieza clave</span>
          <span>Plan</span>
        </div>
      </section>
    `;
    return;
  }

  const analysis = analyzeComposition(selectedChampions);
  const model = buildStoryModel(analysis, selectedChampions);

  els.root.innerHTML = `
    <section class="composition-story">
      ${renderHero(model)}
      ${renderOverview(model)}
      ${renderPlan(model)}
      ${renderPieces(model)}
      ${renderTimeline(model)}
      ${renderQuestions(analysis, model)}
    </section>
  `;

  bindQuestionActions();
}

function bindQuestionActions() {
  if (!els.root) return;
  els.root.querySelectorAll('[data-question]').forEach((button) => {
    button.addEventListener('click', () => {
      state.activeQuestion = button.dataset.question || 'howWin';
      renderStory();
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
    renderStory();
  });
}
