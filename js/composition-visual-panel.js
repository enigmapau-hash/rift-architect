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
const METRIC_BLUEPRINTS = [
  { label: 'Engage', icon: '⚔', detail: 'Iniciar peleas de forma segura.', aliases: ['engage', 'initiation', 'start'] },
  { label: 'Frontline', icon: '🛡', detail: 'Absorber daño y dar espacio.', aliases: ['frontline', 'front line', 'front'] },
  { label: 'Peel', icon: '🧲', detail: 'Proteger al carry principal.', aliases: ['peel', 'protect', 'shield'] },
  { label: 'Escalado', icon: '🐢', detail: 'Ganancia de valor con el tiempo.', aliases: ['escalado', 'scale', 'scaling'] },
  { label: 'Poke', icon: '🏹', detail: 'Desgastar antes de iniciar.', aliases: ['poke', 'siege', 'harass'] },
  { label: 'Movilidad', icon: '⚡', detail: 'Rotar y reposicionarse mejor.', aliases: ['movilidad', 'mobility', 'rotation'] },
];

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

function percent(score, max = 100) {
  const numeric = Number.isFinite(Number(score)) ? Number(score) : 0;
  return Math.max(0, Math.min(100, Math.round((numeric / max) * 100)));
}

function stars(score = 0) {
  const numeric = Math.max(0, Math.min(5, Number(score) || 0));
  return '★★★★★'.slice(0, numeric) + '☆☆☆☆☆'.slice(0, 5 - numeric);
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
    return values.some((value) => matchesAny(value, tags));
  });
}

function getMetricScore(analysis, blueprint) {
  const metrics = asArray(analysis?.metrics);
  const found = metrics.find((metric) => {
    const label = normalizeText(asText(metric?.label ?? metric?.name ?? metric?.key));
    return label.includes(normalizeText(blueprint.label)) || blueprint.aliases.some((alias) => label.includes(normalizeText(alias)));
  });
  return Number.isFinite(Number(found?.score)) ? Math.round(Number(found.score)) : 0;
}

function compositionScore(analysis, selectedChampions) {
  const coherence = Number.isFinite(Number(analysis?.coherence?.score))
    ? Number(analysis.coherence.score)
    : Number.isFinite(Number(analysis?.confidence))
      ? Number(analysis.confidence)
      : 0;
  const metricScores = METRIC_BLUEPRINTS.map((blueprint) => getMetricScore(analysis, blueprint));
  const metricAverage = metricScores.length ? metricScores.reduce((sum, score) => sum + score, 0) / metricScores.length : 0;
  const uniqueRoles = new Set(asArray(selectedChampions).map((champion) => champion.role).filter(Boolean));
  const roleCoverage = Math.round((uniqueRoles.size / ROLE_ORDER.length) * 100);
  const planClarity = asArray(analysis?.gamePlan).length >= 3 ? 92 : asArray(analysis?.gamePlan).length === 2 ? 84 : 68;
  const strengthsCount = asArray(analysis?.strengths).length;
  const weaknessesCount = asArray(analysis?.weaknesses).length;
  const stability = Math.max(40, 100 - weaknessesCount * 12);
  const synergy = Math.min(100, Math.max(45, 58 + strengthsCount * 6 - weaknessesCount * 4));
  const parts = [
    { label: 'Coherencia', score: Math.round(coherence), detail: 'Alineación entre identidad y plan.' },
    { label: 'Sinergia', score: Math.round(synergy), detail: 'Cómo encajan los campeones entre sí.' },
    { label: 'Cobertura', score: roleCoverage, detail: 'Roles y herramientas disponibles.' },
    { label: 'Plan', score: planClarity, detail: 'Claridad de ejecución.' },
    { label: 'Estabilidad', score: stability, detail: 'Cuánto castigan los huecos.' },
  ];
  const score = Math.max(0, Math.min(100, Math.round((parts[0].score * 0.3) + (parts[1].score * 0.25) + (parts[2].score * 0.2) + (parts[3].score * 0.15) + (parts[4].score * 0.1))));

  return {
    score,
    grade: gradeFromScore(score),
    label: score >= 88 ? 'Excelente' : score >= 72 ? 'Sólida' : score >= 60 ? 'Funcional' : 'Frágil',
    parts,
    dominantMetric: METRIC_BLUEPRINTS.map((blueprint) => ({ blueprint, score: getMetricScore(analysis, blueprint) }))
      .sort((a, b) => b.score - a.score || normalizeText(a.blueprint.label).localeCompare(normalizeText(b.blueprint.label)))[0] || null,
  };
}

function buildSimpleBrief(analysis) {
  const strengths = asArray(analysis?.strengths).slice(0, 2).map(normalizeEntry);
  const weaknesses = asArray(analysis?.weaknesses).slice(0, 2).map(normalizeEntry);
  const coach = analysis?.coach || analysis?.assistant || {};

  return {
    identity: analysis?.primaryIdentity || 'Sin definir',
    win: analysis?.winCondition?.detail || analysis?.winCondition?.label || 'Sin win condition clara.',
    strength: strengths[0]?.detail || strengths[0]?.label || 'Sin fortaleza destacada.',
    risk: weaknesses[0]?.detail || weaknesses[0]?.label || 'Sin riesgo claro.',
    coach: coach.headline || 'Juega alrededor de tu identidad.',
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
      title: 'Cómo ganas',
      text: `Tu plan principal es ${winCondition}.`,
      chips: [...toChips([analysis?.winCondition?.label, analysis?.tempoDetail?.label || analysis?.tempo, analysis?.coherence?.label]), ...toChips(gamePlan, 2)],
    },
    whoStarts: {
      title: 'Quién inicia',
      text: engager ? `${engager.champion} debería marcar el arranque de la pelea.` : 'No hay un iniciador clarísimo. La IA te recomienda jugar a contraengage.',
      chips: toChips([engager?.identity, engager?.function, 'contraengage']),
    },
    whatAvoid: {
      title: 'Qué debes evitar',
      text: firstRisk ? `${firstRisk.label}${firstRisk.detail ? `: ${firstRisk.detail}` : ''}` : 'Evita forzar peleas sin visión ni prioridad.',
      chips: toChips([firstRisk?.label, ...toChips(loseConditions, 2)]),
    },
    behind: {
      title: 'Si vas por detrás',
      text: 'Baja el ritmo: visión, oleadas seguras y peleas cortas.',
      chips: ['visión', 'oleadas seguras', 'peleas cortas'],
    },
    powerSpike: {
      title: 'Tu pico de poder',
      text: `Tu composición se siente mejor en ${tempo}.`,
      chips: [...toChips(phases, 3), ...toChips([analysis?.tempoDetail?.label || analysis?.tempo], 1)],
    },
    coach: {
      title: 'Consejo IA',
      text: coach.headline || 'Juega alrededor de tu identidad y evita peleas sin ventaja.',
      chips: toChips([...asArray(coach.priorities).slice(0, 2), ...asArray(advisor.objectivePriority).slice(0, 1)], 3),
    },
  };
}

function renderHero(score, analysis) {
  return `
    <section class="composition-visual__hero">
      <div class="composition-visual__score-card">
        <div class="composition-visual__score-ring" style="--score-angle: ${score.score * 3.6}deg;">
          <div class="composition-visual__score-ring-inner">
            <span class="composition-visual__score-grade">${escapeHtml(score.grade)}</span>
            <strong>${score.score}</strong>
            <span>Composition Score</span>
          </div>
        </div>
        <span class="composition-visual__score-label">${escapeHtml(score.label)}</span>
      </div>

      <div class="composition-visual__hero-copy">
        <p class="eyebrow">Composition View</p>
        <h3>${escapeHtml(analysis?.primaryIdentity || 'Sin identidad clara')}</h3>
        <p class="analysis-note">${escapeHtml(analysis?.summaryText || 'La composición se resume de forma visual: qué es, cómo gana, qué evita y qué te recomienda la IA.')}</p>
        <div class="composition-visual__hero-stats">
          <span class="composition-visual__stat-pill">${escapeHtml(analysis?.winCondition?.label || 'Sin win condition')}</span>
          <span class="composition-visual__stat-pill">${escapeHtml(analysis?.tempoDetail?.label || analysis?.tempo || 'Sin tempo')}</span>
          <span class="composition-visual__stat-pill">${escapeHtml(analysis?.coherence?.label || 'Sin coherencia')}</span>
          <span class="composition-visual__stat-pill">Dominante: ${escapeHtml(score.dominantMetric?.blueprint?.label || 'Sin definir')}</span>
        </div>
      </div>
    </section>
  `;
}

function renderPlan(analysis) {
  const plan = asArray(analysis?.gamePlan).slice(0, 3).map((item) => asText(item));
  const fallback = ['Escalar con calma', 'Controlar visión', 'Buscar el 5v5'];
  const steps = plan.length ? plan : fallback;
  return `
    <section class="composition-visual__panel composition-visual__panel--wide">
      <div class="composition-visual__section-head">
        <p class="eyebrow">Qué debo hacer</p>
        <h4>Plan de partida</h4>
      </div>
      <div class="composition-visual__plan-grid">
        ${steps.map((step, index) => `
          <article class="composition-visual__plan-card">
            <span class="composition-visual__plan-step">${index + 1}</span>
            <strong>${escapeHtml(step)}</strong>
          </article>
        `).join('')}
      </div>
    </section>
  `;
}

function renderStrengthsRisks(analysis) {
  const strengths = asArray(analysis?.strengths).slice(0, 3).map(normalizeEntry);
  const risks = asArray(analysis?.weaknesses).slice(0, 3).map(normalizeEntry);
  return `
    <div class="composition-visual__two-col">
      <article class="composition-visual__panel">
        <div class="composition-visual__section-head">
          <p class="eyebrow">Fortalezas</p>
          <h4>Lo que mejor hace tu equipo</h4>
        </div>
        ${strengths.length ? `<div class="composition-visual__stack-list">${strengths.map((item) => `
          <div class="composition-visual__stack-item composition-visual__stack-item--good">
            <div class="composition-visual__stack-head">
              <strong>${escapeHtml(item.label)}</strong>
              ${item.score !== null ? `<span>${stars(item.score)}</span>` : ''}
            </div>
            ${item.detail ? `<p>${escapeHtml(item.detail)}</p>` : ''}
            ${item.champions.length ? `<div class="analysis-chip-list analysis-chip-list--compact">${item.champions.map((champion) => `<span class="analysis-chip">${escapeHtml(champion)}</span>`).join('')}</div>` : ''}
          </div>
        `).join('')}</div>` : '<p class="analysis-empty">Sin fortalezas claras.</p>'}
      </article>

      <article class="composition-visual__panel">
        <div class="composition-visual__section-head">
          <p class="eyebrow">Riesgos</p>
          <h4>Qué debes compensar</h4>
        </div>
        ${risks.length ? `<div class="composition-visual__stack-list">${risks.map((item) => `
          <div class="composition-visual__stack-item composition-visual__stack-item--danger">
            <div class="composition-visual__stack-head">
              <strong>${escapeHtml(item.label)}</strong>
              ${item.score !== null ? `<span>${stars(item.score)}</span>` : ''}
            </div>
            ${item.detail ? `<p>${escapeHtml(item.detail)}</p>` : ''}
            ${item.missing.length ? `<div class="analysis-chip-list analysis-chip-list--compact">${item.missing.map((missing) => `<span class="analysis-chip analysis-chip--danger">Falta: ${escapeHtml(missing)}</span>`).join('')}</div>` : ''}
          </div>
        `).join('')}</div>` : '<p class="analysis-empty">Sin riesgos claros.</p>'}
      </article>
    </div>
  `;
}

function renderMetrics(analysis) {
  return `
    <section class="composition-visual__panel composition-visual__panel--wide">
      <div class="composition-visual__section-head">
        <p class="eyebrow">Métricas visuales</p>
        <h4>Perfil funcional de la composición</h4>
      </div>
      <div class="composition-visual__metrics-grid">
        ${METRIC_BLUEPRINTS.map((blueprint) => {
          const value = getMetricScore(analysis, blueprint);
          const tone = value >= 80 ? 'good' : value >= 60 ? 'warn' : 'danger';
          return `
            <article class="composition-visual__metric-card composition-visual__metric-card--${tone}">
              <div class="composition-visual__metric-head">
                <span class="composition-visual__metric-icon">${escapeHtml(blueprint.icon)}</span>
                <strong>${escapeHtml(blueprint.label)}</strong>
                <span>${value}/10</span>
              </div>
              <div class="composition-visual__meter" aria-hidden="true">
                <span class="composition-visual__meter-fill" style="width:${percent(value, 10)}%"></span>
              </div>
              <p class="composition-visual__metric-detail">${escapeHtml(blueprint.detail)}</p>
            </article>
          `;
        }).join('')}
      </div>
    </section>
  `;
}

function renderExplainability(analysis, selectedChampions) {
  const rootIdentity = analysis?.primaryIdentity || 'Sin definir';
  const branches = selectedChampions.map((champion) => ({
    role: champion.role,
    champion: champion.champion,
    contribution: champion.function || champion.identity || 'Aporta a la identidad',
    tempo: champion.tempo,
  }));
  const summary = asArray(analysis?.explanation?.summary).slice(0, 3).map(normalizeEntry);

  return `
    <section class="composition-visual__panel composition-visual__panel--wide">
      <div class="composition-visual__section-head">
        <p class="eyebrow">¿Por qué?</p>
        <h4>Cómo se entiende tu composición</h4>
      </div>

      <div class="composition-visual__tree">
        <div class="composition-visual__tree-root">
          <span>${escapeHtml(rootIdentity)}</span>
          <strong>Identidad dominante</strong>
          <p>${escapeHtml(asText(analysis?.summaryText || 'La composición se analiza como una unidad visual y funcional.'))}</p>
        </div>

        <div class="composition-visual__tree-branches">
          ${branches.map((branch) => `
            <article class="composition-visual__tree-node">
              <span class="composition-visual__tree-role">${escapeHtml(ROLE_LABELS[branch.role] || branch.role)}</span>
              <strong>${escapeHtml(branch.champion)}</strong>
              <p>${escapeHtml(branch.contribution)}</p>
              ${branch.tempo ? `<span class="analysis-chip">${escapeHtml(asText(branch.tempo))}</span>` : ''}
            </article>
          `).join('')}
        </div>
      </div>

      ${summary.length ? `<div class="composition-visual__summary-list">${summary.map((item) => `
        <div class="composition-visual__summary-item">
          <strong>${escapeHtml(item.label)}</strong>
          ${item.detail ? `<p>${escapeHtml(item.detail)}</p>` : ''}
        </div>
      `).join('')}</div>` : ''}
    </section>
  `;
}

function renderQuestions(analysis, selectedChampions) {
  const answers = buildQuestionAnswers(analysis, selectedChampions);
  const active = answers[state.activeQuestion] || answers.howWin;

  return `
    <section class="composition-visual__panel composition-visual__panel--wide composition-visual__questions">
      <div class="composition-visual__section-head">
        <p class="eyebrow">Pregunta a Rift</p>
        <h4>IA simple, basada en tu composición</h4>
      </div>

      <div class="composition-visual__question-tabs" role="tablist" aria-label="Preguntas rápidas a Rift">
        ${QUESTION_BLUEPRINTS.map((question) => `
          <button
            type="button"
            class="composition-visual__question-btn ${question.key === state.activeQuestion ? 'is-active' : ''}"
            data-question="${escapeHtml(question.key)}"
            aria-pressed="${question.key === state.activeQuestion ? 'true' : 'false'}"
          >
            ${escapeHtml(question.label)}
          </button>
        `).join('')}
      </div>

      <article class="composition-visual__answer-card">
        <span class="composition-visual__answer-kicker">${escapeHtml(active.title)}</span>
        <p class="composition-visual__answer-text">${escapeHtml(active.text)}</p>
        ${active.chips?.length ? `<div class="analysis-chip-list analysis-chip-list--compact">${active.chips.map((chip) => `<span class="analysis-chip">${escapeHtml(chip)}</span>`).join('')}</div>` : ''}
      </article>
    </section>
  `;
}

function renderEmptyState() {
  return `
    <section class="composition-visual composition-visual--empty">
      <p class="eyebrow">Composition View</p>
      <h3>Selecciona cinco campeones para ver el análisis visual</h3>
      <p class="analysis-note">La vista mostrará una explicación simple basada en el Excel: identidad, cómo gana, riesgos, plan e IA explicativa.</p>
      <div class="composition-visual__empty-grid">
        <div class="composition-visual__empty-chip">Identidad</div>
        <div class="composition-visual__empty-chip">Cómo gana</div>
        <div class="composition-visual__empty-chip">Riesgos</div>
        <div class="composition-visual__empty-chip">IA</div>
      </div>
    </section>
  `;
}

function renderView(analysis) {
  const selectedChampions = collectSelectedChampions();
  const score = compositionScore(analysis, selectedChampions);

  return `
    <section class="composition-visual">
      ${renderHero(score, analysis)}
      ${renderPlan(analysis)}
      ${renderStrengthsRisks(analysis)}
      ${renderMetrics(analysis)}
      ${renderExplainability(analysis, selectedChampions)}
      ${renderQuestions(analysis, selectedChampions)}
    </section>
  `;
}

function renderSummary() {
  const root = document.getElementById('compositionView');
  if (!root) return;

  const selectedChampions = collectSelectedChampions();
  if (!selectedChampions.length) {
    root.innerHTML = renderEmptyState();
    return;
  }

  const analysis = analyzeComposition(selectedChampions);
  root.innerHTML = renderView(analysis);
}

function handleQuestionClick(event) {
  const button = event.target instanceof Element ? event.target.closest('[data-question]') : null;
  if (!button) return;

  const nextQuestion = button.getAttribute('data-question');
  if (!nextQuestion || nextQuestion === state.activeQuestion) return;

  state.activeQuestion = nextQuestion;
  renderSummary();
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

  const root = document.getElementById('compositionView');
  if (root && !state.interactionBound) {
    root.addEventListener('click', handleQuestionClick);
    state.interactionBound = true;
  }
}

init().catch((error) => console.error(error));