import { analyzeComposition } from './analyzer.js';

const DATA_MANIFEST_URL = './data/index.json';
const ROLE_FILES = [
  { key: 'top', label: 'Top', file: './data/top.json' },
  { key: 'jungle', label: 'Jungla', file: './data/jungle.json' },
  { key: 'mid', label: 'Mid', file: './data/mid.json' },
  { key: 'botline', label: 'Botline', file: './data/bot.json' },
  { key: 'support', label: 'Support', file: './data/support.json' },
];

const ROLE_ORDER = ROLE_FILES.map(({ key }) => key);
const ROLE_LABELS = Object.fromEntries(ROLE_FILES.map(({ key, label }) => [key, label]));
const QUESTION_BLUEPRINTS = [
  { key: 'howWin', label: 'Cómo gano' },
  { key: 'whoStarts', label: 'Quién inicia' },
  { key: 'whatAvoid', label: 'Qué evitar' },
  { key: 'behind', label: 'Si voy por detrás' },
  { key: 'powerSpike', label: 'Mi pico' },
];

const state = {
  data: new Map(),
  dataLoaded: false,
  patchScheduled: false,
  interactionBound: false,
  activeQuestion: 'howWin',
};

init().catch((error) => console.error(error));

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

function stars(score = 0) {
  const numeric = Math.max(0, Math.min(5, Number(score) || 0));
  return '★★★★★'.slice(0, numeric) + '☆☆☆☆☆'.slice(0, 5 - numeric);
}

async function loadRoleData() {
  if (state.dataLoaded) return;
  state.dataLoaded = true;

  try {
    const manifestResponse = await fetch(DATA_MANIFEST_URL, { cache: 'reload' });
    if (!manifestResponse.ok) return;

    const manifest = await manifestResponse.json();
    if (!Array.isArray(manifest?.files) || !manifest.files.length) return;

    const loaded = await Promise.all(
      ROLE_FILES.map(async ({ key, file }) => {
        const response = await fetch(file, { cache: 'reload' });
        if (!response.ok) throw new Error(`No se pudo leer ${file}`);
        return [key, await response.json()];
      })
    );

    loaded.forEach(([key, rows]) => state.data.set(key, Array.isArray(rows) ? rows : []));
  } catch {
    ROLE_FILES.forEach(({ key }) => state.data.set(key, []));
  }
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
    const values = [
      champion.champion,
      champion.identity,
      champion.function,
      champion.tempo,
      ...asArray(champion.strengths),
      ...asArray(champion.weaknesses),
    ];
    return values.some((value) => tags.some((tag) => normalizeText(asText(value)).includes(normalizeText(tag))));
  });
}

function getMetricScore(analysis, label, aliases = []) {
  const metrics = asArray(analysis?.metrics);
  const found = metrics.find((metric) => {
    const metricLabel = normalizeText(asText(metric?.label ?? metric?.name ?? metric?.key));
    return metricLabel.includes(normalizeText(label)) || aliases.some((alias) => metricLabel.includes(normalizeText(alias)));
  });
  return Number.isFinite(Number(found?.score)) ? Math.round(Number(found.score)) : 0;
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
  const score = getMetricScore(analysis, 'Escalado', ['scale', 'scaling']) || getMetricScore(analysis, 'Engage') || 0;

  return {
    identity: analysis?.primaryIdentity || 'Sin definir',
    grade: score >= 80 ? 'A' : score >= 65 ? 'B' : 'C',
    score: Number.isFinite(Number(analysis?.coherence?.score)) ? Math.round(Number(analysis.coherence.score)) : Math.round(score),
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

function buildQuestionAnswers(analysis, selectedChampions) {
  const winCondition = analysis?.winCondition?.detail || analysis?.winCondition?.label || 'Juega alrededor de tu identidad.';
  const tempo = analysis?.tempoDetail?.label || analysis?.tempo || 'tu ventana natural de poder';
  const phases = asArray(analysis?.tempoDetail?.phases).slice(0, 3).map((phase) => asText(phase));
  const gamePlan = asArray(analysis?.gamePlan).slice(0, 3).map((step) => asText(step));
  const risks = asArray(analysis?.weaknesses).slice(0, 2).map(normalizeEntry);
  const coach = analysis?.coach || analysis?.assistant || {};
  const advisor = analysis?.advisor || analysis?.assistant || {};
  const engager = findChampionByTags(selectedChampions, ['engage', 'iniciación', 'iniciacion', 'frontline', 'start']);
  const firstRisk = risks[0];
  const loseConditions = asArray(advisor.loseConditions).slice(0, 2).map((item) => asText(item));

  return {
    howWin: {
      title: 'Cómo gano',
      text: `Tu plan principal es ${winCondition}. La IA te resume la partida para que sepas qué hacer sin leer datos técnicos.`,
      chips: uniqueValues([analysis?.winCondition?.label, analysis?.tempoDetail?.label || analysis?.tempo, analysis?.coherence?.label, ...gamePlan].filter(Boolean)).slice(0, 4),
    },
    whoStarts: {
      title: 'Quién inicia',
      text: engager ? `${engager.champion} debería marcar el arranque de la pelea.` : 'No hay un iniciador clarísimo. La IA te recomienda jugar a contraengage y no forzar la entrada.',
      chips: uniqueValues([engager?.identity, engager?.function, 'contraengage'].filter(Boolean)).slice(0, 3),
    },
    whatAvoid: {
      title: 'Qué debes evitar',
      text: firstRisk ? `${firstRisk.label}${firstRisk.detail ? `: ${firstRisk.detail}` : ''}` : 'Evita forzar peleas sin visión ni prioridad.',
      chips: uniqueValues([firstRisk?.label, ...loseConditions].filter(Boolean)).slice(0, 3),
    },
    behind: {
      title: 'Si vas por detrás',
      text: 'Baja el ritmo: visión, oleadas seguras y peleas cortas. No fuerces objetivos sin prioridad.',
      chips: ['visión', 'oleadas seguras', 'peleas cortas'],
    },
    powerSpike: {
      title: 'Tu pico de poder',
      text: `Tu composición se siente mejor en ${tempo}. Ahí es donde tu plan empieza a funcionar de verdad.`,
      chips: uniqueValues([...phases, analysis?.tempoDetail?.label || analysis?.tempo].filter(Boolean)).slice(0, 4),
    },
    coach: {
      title: 'Consejo IA',
      text: coach.headline || 'Juega alrededor de tu identidad y evita peleas sin ventaja.',
      chips: uniqueValues([
        ...asArray(coach.priorities).slice(0, 2).map(asText),
        ...asArray(advisor.objectivePriority).slice(0, 1).map(asText),
      ].filter(Boolean)).slice(0, 3),
    },
  };
}

function renderQuestionButtons(activeQuestion) {
  return QUESTION_BLUEPRINTS.map((question) => `
    <button class="game-plan__question ${question.key === activeQuestion ? 'is-active' : ''}" type="button" data-question="${escapeHtml(question.key)}">
      ${escapeHtml(question.label)}
    </button>
  `).join('');
}

function renderPlanCard(label, title, detail, chips = [], tone = 'neutral') {
  return `
    <article class="game-plan__phase game-plan__phase--${tone}">
      <span class="game-plan__phase-label">${escapeHtml(label)}</span>
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(detail)}</p>
      ${chips.length ? `<div class="analysis-chip-list analysis-chip-list--compact">${chips.map((chip) => `<span class="analysis-chip">${escapeHtml(chip)}</span>`).join('')}</div>` : ''}
    </article>
  `;
}

function renderGamePlan(analysis, selectedChampions) {
  const plan = buildPlan(analysis, selectedChampions);
  const answers = buildQuestionAnswers(analysis, selectedChampions);
  const active = answers[state.activeQuestion] || answers.howWin;

  return `
    <section class="game-plan">
      <div class="game-plan__header">
        <div>
          <p class="eyebrow">Game Plan Engine</p>
          <h3>Qué hacer con tu composición</h3>
          <p class="analysis-note">La IA resume el análisis en acciones simples para jugar la partida sin leer jerga técnica.</p>
        </div>
        <div class="game-plan__badge">
          <span>Score</span>
          <strong>${escapeHtml(plan.grade)}</strong>
          <em>${plan.score}</em>
        </div>
      </div>

      <div class="game-plan__mission">
        <span>Tu misión</span>
        <strong>${escapeHtml(plan.mission)}</strong>
      </div>

      <div class="game-plan__grid">
        ${renderPlanCard('EARLY', plan.early, 'Farm seguro, visión y no regalar peleas largas.', ['Farm', 'Visión', 'No pelear por pelear'], 'info')}
        ${renderPlanCard('MID', plan.mid, 'Convierte prioridad en dragones, herald y mapa.', ['Dragón', 'Herald', 'Prioridad'], 'success')}
        ${renderPlanCard('LATE', plan.late, 'Agrúpate, protege al carry y resuelve en 5v5.', ['Protege', 'Agrúpate', '5v5'], 'coach')}
      </div>

      <div class="game-plan__secondary">
        <article class="game-plan__panel game-plan__panel--danger">
          <p class="eyebrow">Si vas por detrás</p>
          <h4>No fuerces la partida</h4>
          <ul class="game-plan__list">
            ${(plan.behind.length ? plan.behind : ['Busca picks', 'Juega a visión', 'Evita teamfights abiertas']).slice(0, 3).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
          </ul>
        </article>

        <article class="game-plan__panel game-plan__panel--coach">
          <p class="eyebrow">Rift opina</p>
          <h4>${escapeHtml(plan.coach)}</h4>
          <div class="game-plan__coach-grid">
            <div>
              <span>Iniciador</span>
              <strong>${escapeHtml(plan.engager)}</strong>
            </div>
            <div>
              <span>Carry</span>
              <strong>${escapeHtml(plan.carry)}</strong>
            </div>
            <div>
              <span>Frontline</span>
              <strong>${escapeHtml(plan.frontline)}</strong>
            </div>
            <div>
              <span>Riesgo</span>
              <strong>${escapeHtml(plan.risk)}</strong>
            </div>
          </div>
          <p class="game-plan__coach-note">${escapeHtml(plan.riskDetail)}</p>
        </article>
      </div>

      <article class="game-plan__question-panel">
        <div class="game-plan__question-head">
          <div>
            <p class="eyebrow">Preguntar a Rift</p>
            <h4>Respuestas cortas y útiles</h4>
          </div>
          <div class="game-plan__question-buttons">
            ${renderQuestionButtons(state.activeQuestion)}
          </div>
        </div>

        <div class="game-plan__answer-card">
          <span class="game-plan__answer-kicker">${escapeHtml(active.title)}</span>
          <strong>${escapeHtml(active.text)}</strong>
          ${active.chips.length ? `<div class="analysis-chip-list analysis-chip-list--compact">${active.chips.map((chip) => `<span class="analysis-chip analysis-chip--question">${escapeHtml(chip)}</span>`).join('')}</div>` : ''}
        </div>
      </article>
    </section>
  `;
}

function renderEmptyState() {
  return `
    <section class="game-plan game-plan--empty">
      <p class="eyebrow">Game Plan Engine</p>
      <h3>Selecciona cinco campeones para ver el plan de partida</h3>
      <p class="analysis-note">Aquí aparecerá qué hacer en early, mid y late, más una respuesta simple a tus preguntas rápidas.</p>
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
  const root = document.getElementById('gamePlanView');
  if (!root) return;

  const selectedChampions = collectSelectedChampions();
  if (!selectedChampions.length) {
    root.innerHTML = renderEmptyState();
    return;
  }

  const analysis = analyzeComposition(selectedChampions);
  root.innerHTML = renderGamePlan(analysis, selectedChampions);
  bindInteractions();
}

function bindInteractions() {
  if (state.interactionBound) return;
  const root = document.getElementById('gamePlanView');
  if (!root) return;

  root.addEventListener('click', (event) => {
    const button = event.target instanceof Element ? event.target.closest('[data-question]') : null;
    if (!button) return;
    const question = button.getAttribute('data-question');
    if (!question || question === state.activeQuestion) return;
    state.activeQuestion = question;
    renderSummary();
  });

  state.interactionBound = true;
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

async function init() {
  await loadRoleData();
  observeComposition();
  renderSummary();
  window.setInterval(renderSummary, 1500);
}
