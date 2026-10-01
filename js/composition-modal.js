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

const SECTIONS = [
  { key: 'composition', title: 'Tu composición', kicker: 'Identidad', badge: 'Ver análisis' },
  { key: 'victory', title: 'Plan de victoria', kicker: 'Cómo gana', badge: 'Ver análisis' },
  { key: 'priorities', title: 'Prioridades', kicker: 'Qué hacer ahora', badge: 'Ver análisis' },
  { key: 'risks', title: 'Riesgos', kicker: 'Qué evitar', badge: 'Ver análisis' },
  { key: 'draft', title: 'Draft', kicker: 'Picks y bans', badge: 'Ver análisis' },
  { key: 'advanced', title: 'Análisis avanzado', kicker: 'Por qué', badge: 'Ver análisis' },
];

const state = {
  data: new Map(),
  loaded: false,
  patchScheduled: false,
  modalOpen: false,
  activeSection: 'composition',
  lastFocus: null,
  currentAnalysis: null,
  currentModel: null,
};

const els = { root: null, modal: null, modalTitle: null, modalKicker: null, modalSummary: null, modalTabs: null, modalBody: null, modalClose: null };

init().catch((error) => console.error(error));

async function init() {
  els.root = document.getElementById('storyView');
  if (!els.root) return;

  bindEvents();
  await loadRoleData();
  observeComposition();
  ensureModal();
  renderStory();
}

function bindEvents() {
  els.root.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-modal-section]');
    if (!trigger || !els.root.contains(trigger)) return;
    event.preventDefault();
    openModal(String(trigger.dataset.modalSection || 'composition'));
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && state.modalOpen) closeModal();
  });
}

function ensureModal() {
  if (els.modal) return;

  const modal = document.createElement('div');
  modal.id = 'analysisModal';
  modal.className = 'analysis-modal is-hidden';
  modal.setAttribute('aria-hidden', 'true');
  modal.innerHTML = `
    <div class="analysis-modal__backdrop" data-modal-close></div>
    <section class="analysis-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="analysisModalTitle">
      <header class="analysis-modal__header">
        <div class="analysis-modal__header-copy">
          <span id="analysisModalKicker" class="analysis-modal__kicker">Análisis</span>
          <h2 id="analysisModalTitle" class="analysis-modal__title">Tu composición</h2>
          <p id="analysisModalSummary" class="analysis-modal__summary"></p>
        </div>
        <button type="button" class="ghost-btn analysis-modal__close" data-modal-close>Cerrar</button>
      </header>
      <nav id="analysisModalTabs" class="analysis-modal__tabs" aria-label="Secciones del análisis"></nav>
      <div id="analysisModalBody" class="analysis-modal__body"></div>
    </section>
  `;

  document.body.appendChild(modal);

  els.modal = modal;
  els.modalTitle = modal.querySelector('#analysisModalTitle');
  els.modalKicker = modal.querySelector('#analysisModalKicker');
  els.modalSummary = modal.querySelector('#analysisModalSummary');
  els.modalTabs = modal.querySelector('#analysisModalTabs');
  els.modalBody = modal.querySelector('#analysisModalBody');
  els.modalClose = modal.querySelector('.analysis-modal__close');

  modal.addEventListener('click', (event) => {
    const close = event.target.closest('[data-modal-close]');
    if (close) closeModal();
  });

  els.modalTabs.addEventListener('click', (event) => {
    const tab = event.target.closest('[data-modal-nav]');
    if (!tab) return;
    openModal(String(tab.dataset.modalNav || 'composition'));
  });

  els.modalClose.addEventListener('click', closeModal);
}

function openModal(section) {
  if (!state.currentModel) return;

  state.activeSection = normalizeSection(section);
  state.modalOpen = true;
  state.lastFocus = document.activeElement;
  ensureModal();
  renderModal();
  els.modal.classList.remove('is-hidden');
  els.modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');

  window.requestAnimationFrame(() => {
    els.modalClose?.focus();
  });
}

function closeModal() {
  if (!els.modal) return;

  state.modalOpen = false;
  els.modal.classList.add('is-hidden');
  els.modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');

  if (state.lastFocus instanceof HTMLElement) {
    window.requestAnimationFrame(() => state.lastFocus.focus());
  }
}

function renderStory() {
  if (!els.root) return;

  const selectedChampions = collectSelectedChampions();
  if (selectedChampions.length < 5) {
    state.currentAnalysis = null;
    state.currentModel = null;
    closeModal();
    els.root.innerHTML = `
      <section class="composition-story composition-story--empty">
        <h3>Selecciona cinco campeones para ver el análisis</h3>
        <p>Primero verás un resumen corto. Al abrir cada tarjeta aparecerá el análisis completo en una ventana dedicada.</p>
      </section>
    `;
    return;
  }

  const analysis = analyzeComposition(selectedChampions);
  const model = buildStoryModel(analysis, selectedChampions);
  state.currentAnalysis = analysis;
  state.currentModel = model;

  const cards = SECTIONS.map((section) => renderSummaryCard(section, model)).join('');
  els.root.innerHTML = `<section class="composition-story composition-story--cards">${cards}</section>`;

  if (state.modalOpen) {
    ensureModal();
    renderModal();
    els.modal.classList.remove('is-hidden');
    els.modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
  }
}

function renderSummaryCard(section, model) {
  const summary = getSectionSummary(section.key, model);
  const meta = getSectionMeta(section.key, model);
  const tone = getSectionTone(section.key);

  return `
    <button type="button" class="composition-story__summary-card composition-story__summary-card--${tone}" data-modal-section="${escapeHtml(section.key)}" aria-haspopup="dialog">
      <span class="composition-story__summary-kicker">${escapeHtml(section.kicker)}</span>
      <div class="composition-story__summary-main">
        <strong class="composition-story__summary-title">${escapeHtml(section.title)}</strong>
        <p class="composition-story__summary-copy">${escapeHtml(summary)}</p>
      </div>
      <div class="composition-story__summary-meta">
        ${meta.map((item) => `<span class="story-pill story-pill--neutral">${escapeHtml(item)}</span>`).join('')}
        <span class="composition-story__summary-cta">▼ ${escapeHtml(section.badge)}</span>
      </div>
    </button>
  `;
}

function renderModal() {
  if (!els.modal || !state.currentModel) return;

  const section = normalizeSection(state.activeSection);
  const sectionConfig = SECTIONS.find((item) => item.key === section) || SECTIONS[0];
  const model = state.currentModel;

  els.modalTitle.textContent = sectionConfig.title;
  els.modalKicker.textContent = sectionConfig.kicker;
  els.modalSummary.textContent = getSectionSummary(section, model);
  renderTabs(section);
  els.modalBody.innerHTML = renderSection(section, model);
}

function renderTabs(activeSection) {
  if (!els.modalTabs) return;

  els.modalTabs.innerHTML = SECTIONS.map((section) => `
    <button
      type="button"
      class="analysis-modal__tab ${section.key === activeSection ? 'is-active' : ''}"
      data-modal-nav="${escapeHtml(section.key)}"
      aria-pressed="${section.key === activeSection ? 'true' : 'false'}"
    >
      ${escapeHtml(section.title)}
    </button>
  `).join('');
}

function renderSection(section, model) {
  const raw = state.currentAnalysis || {};

  switch (section) {
    case 'composition':
      return [
        renderHero(model.identity, model.summaryText, [
          `${model.grade} · ${model.score}/100`,
          `Pico: ${model.tempo}`,
          `${model.selectedCount}/5 roles`,
        ]),
        renderBlock('Identidad', 'Qué somos', [
          renderFlowItem('Identidad', model.identity, `Confianza ${model.grade} · ${model.score}/100`, 'is-hero'),
          renderFlowItem('Pieza clave', model.keyPiece ? model.keyPiece.champion : 'Sin pieza clave', model.keyPiece ? [model.keyPiece.function, model.keyPiece.identity, model.keyPiece.tempo].filter(Boolean).join(' · ') : 'Todavía no hay una pieza clave clara.', 'is-primary'),
          renderFlowItem('Fortalezas', joinTexts(model.strengths.map((item) => item.label)), 'Puntos que ya funcionan.', 'is-primary'),
          renderFlowItem('Debilidades', joinTexts(model.weaknesses.map((item) => item.label)), 'Huecos que conviene cerrar.', 'is-warning'),
          renderFlowItem('Lectura', model.quickCoach, 'La composición se entiende desde su identidad.', 'is-warning'),
        ]),
        renderTrace('Motor que alimenta esta lectura', [
          ['Resumen ejecutivo', raw.primaryIdentity || model.identity, raw.summaryText || model.summaryText],
          ['Win condition', raw.winCondition?.label || 'Sin win condition', asText(raw.winCondition?.detail || model.winCondition)],
          ['Coherencia', raw.coherence?.label || 'Sin coherencia', asText(raw.coherence?.detail || 'La lectura se apoya en el motor y en la composición.')],
        ]),
      ].join('');

    case 'victory':
      return [
        renderHero(model.winCondition, model.quickCoach, [
          `Pico: ${model.tempo}`,
          `${model.phases.length} fases`,
          joinTexts(model.objectivePriority.slice(0, 2).map((item) => item.label || item)),
        ]),
        renderBlock('Cómo gana', 'Plan de victoria', [
          renderFlowItem('Win condition', model.winCondition, model.quickCoach, 'is-primary'),
          renderFlowItem('Tempo', model.tempo, 'Cuándo es más fuerte esta composición.', 'is-hero'),
          renderFlowItem('Fases', model.phases.join(' · ') || 'Sin fases definidas', 'Early · Mid · Late', 'is-warning'),
          renderFlowItem('Plan', joinTexts((raw.gamePlan || []).map((item) => asText(item)).slice(0, 3)), 'Secuencia que convierte la ventaja en victoria.', 'is-primary'),
          renderFlowItem('Objetivo', joinTexts(model.objectivePriority.slice(0, 3).map((item) => item.label || item)), 'Prioridad sugerida por el motor.', 'is-warning'),
        ]),
        renderTrace('De dónde sale la victoria', [
          ['Objetivo principal', raw.advisor?.primaryObjective || model.winCondition, raw.advisor?.summary?.reason || model.winCondition],
          ['Ventanas', phaseSummary(model.gameWindows), 'Early · Mid · Late'],
          ['Pico de poder', model.tempo, raw.winCondition?.detail || model.winCondition],
        ]),
      ].join('');

    case 'priorities':
      return [
        renderHero(model.priorities[0] || 'Prioriza lo que más acelera la victoria', model.quickCoach, [
          `${model.priorities.length} pasos`,
          'Plan activo',
          `${model.checklist.length} checks`,
        ]),
        renderBlock('Qué hacer ahora', 'Prioridades', [
          ...model.priorities.map((priority, index) => renderFlowItem(`Prioridad ${index + 1}`, priority, index === 0 ? 'La más importante ahora' : 'Siguiente paso del plan', index === 0 ? 'is-primary' : '')),
          renderFlowItem('Coach', model.quickCoach, 'El criterio que ordena todo el plan.', 'is-hero'),
          ...model.checklist.map((item, index) => renderFlowItem(`Checklist ${index + 1}`, item.label, item.detail || 'Paso operativo del plan.', index === 0 ? 'is-primary' : '')),
        ]),
        renderTrace('Prioridades y ejecución', [
          ['Checklist', joinTexts(model.checklist.map((item) => item.label)), 'Pasos que no deben olvidarse.'],
          ['Prioridades IA', joinTexts(model.execPriorities.map((item) => item.label)), 'Lo más importante ahora.'],
          ['Coach', raw.coach?.headline || model.quickCoach, raw.coach?.briefing || model.quickCoach],
        ]),
      ].join('');

    case 'risks':
      return [
        renderHero(model.avoid[0] || 'No fuerces el plan equivocado', model.quickCoach, [
          `${model.weaknesses.length} debilidades`,
          `${model.avoid.length} riesgos`,
          `${model.criticalErrors.length} errores críticos`,
        ]),
        renderBlock('Qué evitar', 'Riesgos', [
          ...model.avoid.map((risk, index) => renderFlowItem(`Riesgo ${index + 1}`, risk, index === 0 ? 'El más castigado' : 'Compensar a tiempo', index === 0 ? 'is-warning' : '')),
          ...model.weaknesses.map((item) => renderFlowItem(item.label, item.detail || 'Sin detalle adicional', item.score !== null ? `${item.score}/100` : 'Debilidad detectada', '')),
          ...model.criticalErrors.map((item, index) => renderFlowItem(item.label, item.detail || 'Puede romper el plan principal.', index === 0 ? 'Prioridad defensiva' : 'Riesgo detectado', index === 0 ? 'is-warning' : '')),
        ]),
        renderTrace('Riesgos del motor', [
          ['Mayor riesgo', model.avoid[0] || 'Sin riesgo claro', joinTexts(model.criticalErrors.map((item) => item.detail || item.label).slice(0, 2))],
          ['Debilidades', joinTexts(model.weaknesses.map((item) => item.label)), 'Se conectan con el perfil del draft.'],
          ['Alertas', joinTexts(model.alerts), 'Lo que conviene vigilar.'],
        ]),
      ].join('');

    case 'draft':
      return [
        renderHero(model.draftSummary, 'El draft completa el plan de la composición.', [
          `${model.compositionNeeds.length} necesidades`,
          `${model.pickRecommendations.length} picks`,
          `${model.banRecommendations.length} bans`,
        ]),
        renderBlock('Picks y bans', 'Draft', [
          renderFlowItem('Resumen', model.draftSummary, model.compositionNeeds[0]?.detail || 'El draft completa el plan de la composición.', 'is-hero'),
          ...model.compositionNeeds.map((item, index) => renderFlowItem(`Necesidad ${index + 1}`, item.label, item.detail || 'Hueco a cubrir.', index === 0 ? 'is-primary' : '')),
          ...model.pickRecommendations.map((item, index) => renderFlowItem(`Pick ${index + 1}`, item.label, joinTexts([item.detail, item.meta]), index === 0 ? 'Mejora el plan' : '')),
          ...model.banRecommendations.map((item, index) => renderFlowItem(`Ban ${index + 1}`, item.label, joinTexts([item.detail, item.meta]), index === 0 ? 'Bloquea una amenaza' : 'is-warning')),
        ]),
        renderTrace('Pistas del draft assistant', [
          ['Necesidades', joinTexts(model.compositionNeeds.map((item) => item.label)), 'Huecos que el draft debe cubrir.'],
          ['Picks', joinTexts(model.pickRecommendations.map((item) => item.label)), 'Opciones que completan el plan.'],
          ['Bans', joinTexts(model.banRecommendations.map((item) => item.label)), 'Amenazas que frenan el plan.'],
        ]),
      ].join('');

    case 'advanced':
    default:
      return [
        renderHero(model.coherenceLabel, model.coherenceDetail, [
          `${model.metrics.length} métricas`,
          `${model.insights.length} insights`,
          `${model.executionProfile.length} señales de ejecución`,
        ]),
        renderBlock('Por qué', 'Análisis avanzado', [
          renderFlowItem('Coherencia', model.coherenceLabel, model.coherenceDetail, 'is-primary'),
          renderFlowItem('Señales', joinTexts(model.whyItems), 'Evidencias que sostienen la lectura.', 'is-warning'),
          ...model.metrics.map((metric, index) => renderFlowItem(metric.label, metric.score !== null ? `${metric.score}/10` : metric.detail || 'Sin puntuación', metric.detail || 'Señal cuantitativa del motor.', index === 0 ? 'is-hero' : '')),
          ...model.executionProfile.map((item, index) => renderFlowItem(item.label, item.score !== null ? `${item.score}/5` : item.badge || 'Señal', item.detail || 'Perfil de ejecución.', index === 0 ? 'is-primary' : '')),
          ...model.insights.map((insight, index) => renderFlowItem(`Insight ${index + 1}`, insight, 'Consejo táctico del motor.', index === 0 ? 'is-warning' : '')),
          ...model.alerts.map((alert, index) => renderFlowItem(`Alerta ${index + 1}`, alert, 'Punto que conviene vigilar.', index === 0 ? 'is-warning' : '')),
        ]),
        renderTrace('Explicación del motor', [
          ['Coherencia', model.coherenceLabel, model.coherenceDetail],
          ['Métricas', joinTexts(model.metrics.map((item) => item.label)), 'Señales cuantitativas del motor.'],
          ['Insights', joinTexts(model.insights), 'Consejos tácticos resumidos.'],
        ]),
      ].join('');
  }
}

function renderHero(title, summary, meta = []) {
  return `
    <section class="analysis-modal__hero">
      <div class="analysis-modal__hero-score">
        <strong>${escapeHtml(getSectionToneLabel(summary))}</strong>
        <span>${escapeHtml(meta[0] || 'Análisis')}</span>
      </div>
      <div class="analysis-modal__hero-copy">
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(summary)}</p>
        <div class="analysis-modal__hero-meta">
          ${meta.map((item) => `<span class="story-pill story-pill--info">${escapeHtml(item)}</span>`).join('')}
        </div>
      </div>
    </section>
  `;
}

function renderBlock(kicker, title, items) {
  return `
    <section class="analysis-modal__block">
      <div class="analysis-modal__block-head">
        <span class="analysis-modal__eyebrow">${escapeHtml(kicker)}</span>
        <h3 class="analysis-modal__block-title">${escapeHtml(title)}</h3>
      </div>
      <div class="design-system-flow">
        ${items.join('')}
      </div>
    </section>
  `;
}

function renderTrace(title, rows) {
  return `
    <section class="analysis-modal__block analysis-modal__block--trace">
      <div class="analysis-modal__block-head">
        <span class="analysis-modal__eyebrow">Motor</span>
        <h3 class="analysis-modal__block-title">${escapeHtml(title)}</h3>
      </div>
      <div class="design-system-flow">
        ${rows.map((row, index) => renderFlowItem(row[0], row[1], row[2], index === 0 ? 'is-hero' : index === 1 ? 'is-primary' : 'is-warning')).join('')}
      </div>
    </section>
  `;
}

function renderFlowItem(label = '', value = '', meta = '', tone = '') {
  return `
    <article class="design-system-flow__item ${tone}">
      <span class="design-system-flow__label">${escapeHtml(label)}</span>
      <p class="design-system-flow__value">${escapeHtml(value)}</p>
      ${meta ? `<p class="design-system-flow__meta">${escapeHtml(meta)}</p>` : ''}
    </article>
  `;
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
  const identity = asText(analysis?.primaryIdentity || 'Sin identidad clara');
  const score = clampToRange(Number(analysis?.confidence) || Number(executive.score) || 0, 0, 100);
  const grade = gradeFromScore(score);

  const keyPiece = findKeyPiece(selectedChampions);
  const objectivePriority = asArray(advisor.objectivePriority).slice(0, 3).map(normalizeEntry);
  const loseConditions = asArray(advisor.loseConditions).slice(0, 3).map((item) => normalizeEntry({ label: item?.label ?? item, detail: item?.detail ?? item?.reason ?? item?.description ?? '' }));

  const priorities = uniqueValues([
    ...objectivePriority.map((item) => item.label),
    analysis?.winCondition?.label,
    executive.priorities?.[0]?.label,
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
  const whyItems = uniqueValues([
    identity,
    asText(analysis?.winCondition?.label || ''),
    asText(analysis?.coherence?.label || ''),
    ...metrics.map((item) => item.label),
  ]).slice(0, 4);

  const summaryText = asText(analysis?.summaryText || `Tu composición gira alrededor de ${identity} y necesita una lectura simple para convertir esa idea en decisiones.`);
  const winCondition = asText(analysis?.winCondition?.detail || analysis?.winCondition?.label || 'Escala y gana la pelea correcta en tu ventana de poder.');
  const quickCoach = asText(coach.headline || coach.summary || 'Juega alrededor de tu identidad.');
  const draftSummary = asText(draftAssistant.summary || draftAssistant.profileSummary || 'La composición todavía pide completar huecos concretos con picks y bans que protejan el plan.');
  const coherenceLabel = asText(analysis?.coherence?.label || 'Coherencia');
  const coherenceDetail = asText(analysis?.coherence?.detail || 'La consistencia del plan se apoya en el motor y en la composición seleccionada.');

  return {
    analysis,
    selectedCount: selectedChampions.length,
    score,
    grade,
    identity,
    summaryText,
    winCondition,
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
    whyItems,
    quickCoach,
    draftSummary,
    coherenceLabel,
    coherenceDetail,
    gameWindows: advisor.gameWindows || {},
  };
}

function getSectionSummary(section, model) {
  switch (section) {
    case 'composition': return model.summaryText;
    case 'victory': return model.winCondition;
    case 'priorities': return model.priorities[0] || 'Ganar tempo y visión';
    case 'risks': return model.avoid[0] || 'Forzar peleas malas';
    case 'draft': return model.draftSummary;
    case 'advanced': return model.coherenceLabel;
    default: return model.summaryText;
  }
}

function getSectionMeta(section, model) {
  switch (section) {
    case 'composition': return [`${model.grade} · ${model.score}/100`, `Pico: ${model.tempo}`, `${model.selectedCount}/5 roles`];
    case 'victory': return [`Pico: ${model.tempo}`, `${model.phases.length} fases`, `${model.gamePlan.length} pasos`];
    case 'priorities': return [`${model.priorities.length} pasos`, `${model.checklist.length} checks`, 'Plan activo'];
    case 'risks': return [`${model.weaknesses.length} debilidades`, `${model.criticalErrors.length} errores`, `${model.avoid.length} riesgos`];
    case 'draft': return [`${model.compositionNeeds.length} necesidades`, `${model.pickRecommendations.length} picks`, `${model.banRecommendations.length} bans`];
    case 'advanced': return [`${model.metrics.length} métricas`, `${model.insights.length} insights`, `${model.executionProfile.length} señales`];
    default: return [];
  }
}

function getSectionTone(section) {
  switch (section) {
    case 'composition': return 'info';
    case 'victory': return 'success';
    case 'priorities': return 'success';
    case 'risks': return 'danger';
    case 'draft': return 'neutral';
    case 'advanced': return 'info';
    default: return 'info';
  }
}

function getSectionToneLabel(summary) {
  const text = asText(summary).trim();
  if (!text) return 'IA';
  const words = text.split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('') || 'IA';
}

function renderModalIfOpen() {
  if (state.modalOpen) renderModal();
}

function normalizeSection(section) {
  return SECTIONS.some((item) => item.key === section) ? section : 'composition';
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

function normalizeSelectedChampion(champion) {
  if (!champion) return null;
  return {
    role: champion.role,
    champion: asText(champion.champion, 'Sin definir'),
    identity: asText(champion.identity, ''),
    function: asText(champion.function, ''),
    tempo: asText(champion.tempo, ''),
    strengths: asArray(champion.strengths).map((item) => asText(item)).filter(Boolean),
    weaknesses: asArray(champion.weaknesses).map((item) => asText(item)).filter(Boolean),
  };
}

function findChampionByTags(selectedChampions, tags = []) {
  const normalizedTags = tags.map((tag) => normalizeText(tag));
  return selectedChampions.find((champion) => {
    const values = [champion.champion, champion.identity, champion.function, champion.tempo, ...asArray(champion.strengths), ...asArray(champion.weaknesses)];
    return values.some((value) => normalizedTags.some((tag) => normalizeText(asText(value)).includes(tag)));
  });
}

function joinTexts(values = []) {
  return uniqueValues(values.map((value) => asText(value)).filter(Boolean)).join(' · ') || 'Sin datos';
}

function uniqueValues(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function normalizeEntry(item) {
  return {
    label: asText(item?.label ?? item?.name ?? item?.title ?? item?.text ?? item?.value ?? item?.champion ?? item, 'Sin definir'),
    detail: asText(item?.detail ?? item?.summary ?? item?.description ?? item?.reason ?? item?.note ?? item?.explanation ?? item?.message ?? '', ''),
    score: Number.isFinite(Number(item?.score)) ? Math.round(Number(item.score)) : null,
  };
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

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asText(value, fallback = 'Sin definir') {
  if (value == null) return fallback;
  if (typeof value === 'string') return value.trim() || fallback;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map((item) => asText(item, '')).filter(Boolean).join(' · ') || fallback;
  if (typeof value === 'object') {
    return asText(
      value.label ?? value.name ?? value.title ?? value.text ?? value.value ?? value.detail ?? value.summary ?? value.reason ?? value.description ?? value.champion ?? value.item ?? '',
      fallback,
    );
  }
  return String(value) || fallback;
}

function normalizeText(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function phaseSummary(gameWindows) {
  return uniqueValues([
    gameWindows?.early?.label ? `Early: ${gameWindows.early.label}` : null,
    gameWindows?.mid?.label ? `Mid: ${gameWindows.mid.label}` : null,
    gameWindows?.late?.label ? `Late: ${gameWindows.late.label}` : null,
  ]).join(' · ') || 'Early · Mid · Late';
}

function findKeyPiece(selectedChampions) {
  const engager = findChampionByTags(selectedChampions, ['engage', 'iniciación', 'iniciacion', 'frontline', 'start']);
  const carry = findChampionByTags(selectedChampions, ['adc', 'carry', 'hypercarry', 'escalado']);
  const protector = findChampionByTags(selectedChampions, ['peel', 'protect', 'shield']);
  const frontline = findChampionByTags(selectedChampions, ['frontline', 'tanque', 'front', 'defensa']);
  return carry || engager || protector || frontline || selectedChampions[0] || null;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}