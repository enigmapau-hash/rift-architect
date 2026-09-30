import { analyzeComposition } from './analyzer.js';
import { buildExecutiveSummary } from './engine/executiveSummary.js';

const ROOT_ID = 'analysisHubExecutiveSummary';
const SELECTOR = '#compositionGrid .slot.is-filled';
const state = { root: null, observer: null, scheduled: false };

init().catch(console.error);

async function init() {
  const storyView = document.getElementById('storyView');
  const compositionGrid = document.getElementById('compositionGrid');
  if (!storyView || !compositionGrid) return;

  mountRoot(storyView);
  observeComposition(compositionGrid);
  renderSummary();
}

function mountRoot(storyView) {
  const existing = document.getElementById(ROOT_ID);
  if (existing) {
    state.root = existing;
    return;
  }

  const root = document.createElement('section');
  root.id = ROOT_ID;
  root.className = 'analysis-hub analysis-hub--cards';
  root.setAttribute('aria-live', 'polite');

  const hubRoot = document.getElementById('analysisHubView');
  if (hubRoot?.parentElement) {
    hubRoot.parentElement.insertBefore(root, hubRoot);
  } else {
    storyView.insertAdjacentElement('afterend', root);
  }

  state.root = root;
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
    renderSummary();
  });
}

function renderSummary() {
  if (!state.root) return;

  const selectedChampions = collectSelectedChampions();
  if (selectedChampions.length < 5) {
    state.root.hidden = true;
    state.root.innerHTML = '';
    return;
  }

  state.root.hidden = false;
  const analysis = analyzeComposition(selectedChampions);
  const summary = analysis.executiveSummary || buildExecutiveSummary(analysis);
  const executionProfile = Array.isArray(summary.executionProfile) ? summary.executionProfile : [];
  const checklist = Array.isArray(summary.checklist) ? summary.checklist : [];
  const criticalErrors = Array.isArray(summary.criticalErrors) ? summary.criticalErrors : [];
  const gamePlanTimeline = buildGamePlanTimeline(analysis, summary, analysis.coach || {});

  state.root.innerHTML = `
    <section class="analysis-hub__shell analysis-hub__shell--cards">
      <header class="analysis-hub__hero">
        <div class="analysis-hub__hero-copy">
          <p class="eyebrow">Sprint 14.4 · Executive Summary</p>
          <h4>${escapeHtml(summary.title)}</h4>
          <p>${escapeHtml(summary.text)}</p>
          <div class="analysis-hub__flow-mini">
            ${summary.tags.map((tag, index) => `<span class="analysis-hub__flow-mini-item ${index === 0 ? 'is-active' : ''}">${escapeHtml(tag)}</span>`).join('')}
          </div>
        </div>

        <div class="analysis-hub__score-card ${toneByScore(summary.score)}">
          <span class="analysis-hub__score-kicker">Draft</span>
          <strong>${escapeHtml(summary.grade)}</strong>
          <span>${escapeHtml(summary.badge)}</span>
        </div>
      </header>

      <section class="analysis-hub__summary-panel">
        <div class="analysis-hub__summary-panel-head">
          <span class="analysis-hub__card-kicker">Perfil del draft</span>
          <span class="analysis-hub__summary-panel-note">Lectura visual</span>
        </div>
        <div class="analysis-hub__profile-grid">
          ${summary.profile.map(renderProfileRow).join('')}
        </div>
      </section>

      <section class="analysis-hub__summary-panel">
        <div class="analysis-hub__summary-panel-head">
          <span class="analysis-hub__card-kicker">Perfil de ejecución</span>
          <span class="analysis-hub__summary-panel-note">Coaching práctico</span>
        </div>
        <div class="analysis-hub__execution-grid">
          ${executionProfile.map(renderExecutionRow).join('')}
        </div>
      </section>

      <section class="analysis-hub__summary-panel">
        <div class="analysis-hub__summary-panel-head">
          <span class="analysis-hub__card-kicker">Plan de partida</span>
          <span class="analysis-hub__summary-panel-note">Qué hacer por fases</span>
        </div>
        <div class="analysis-hub__timeline-grid">
          ${gamePlanTimeline.map(renderTimelineRow).join('')}
        </div>
      </section>

      <section class="analysis-hub__summary-panel">
        <div class="analysis-hub__summary-panel-head">
          <span class="analysis-hub__card-kicker">Checklist de partida</span>
          <span class="analysis-hub__summary-panel-note">Lo que debes hacer</span>
        </div>
        <div class="analysis-hub__list">
          ${checklist.map(renderChecklistRow).join('')}
        </div>
      </section>

      <section class="analysis-hub__summary-panel">
        <div class="analysis-hub__summary-panel-head">
          <span class="analysis-hub__card-kicker">Errores críticos</span>
          <span class="analysis-hub__summary-panel-note">Lo que debes evitar</span>
        </div>
        <div class="analysis-hub__list">
          ${criticalErrors.map(renderCriticalErrorRow).join('')}
        </div>
        <div class="analysis-hub__priority-strip">
          ${summary.priorities.map((item) => `<span class="analysis-hub__priority-pill">${escapeHtml(item)}</span>`).join('')}
        </div>
      </section>
    </section>
  `;
}

function collectSelectedChampions() {
  return [...document.querySelectorAll(SELECTOR)]
    .map((slot) => ({
      role: String(slot.dataset.role || 'top'),
      champion: slot.querySelector('.slot__name')?.textContent?.trim() || '',
      identity: slot.querySelector('.slot__meta')?.textContent?.trim() || '',
      function: slot.querySelector('.champion-item__sub')?.textContent?.trim() || '',
      tempo: slot.querySelector('.slot__tempo')?.textContent?.trim() || '',
      strengths: [],
      weaknesses: [],
    }))
    .filter((champion) => champion.champion);
}

function buildGamePlanTimeline(analysis = {}, summary = {}, coach = {}) {
  const coachPhases = Array.isArray(coach.phases) ? coach.phases : [];
  if (coachPhases.length >= 3) {
    return coachPhases.slice(0, 3).map((phase, index) => ({
      phase: phase.phase || ['EARLY (0–10)', 'MID (10–20)', 'LATE (20+)'][index] || `PHASE ${index + 1}`,
      title: phase.title || phase.label || 'Ajusta tu plan',
      detail: phase.detail || 'Sigue la condición de victoria principal.',
      actions: uniqueValues([...(phase.actions || []), ...(phase.avoid || [])].filter(Boolean)).slice(0, 3),
      avoid: uniqueValues(phase.avoid || []).slice(0, 2),
    }));
  }

  const context = normalizeText(
    [
      analysis?.primaryIdentity,
      analysis?.winCondition?.label,
      analysis?.winCondition?.detail,
      analysis?.tempoDetail?.label,
      analysis?.tempoDetail?.detail,
      analysis?.summaryText,
      summary?.text,
    ]
      .filter(Boolean)
      .join(' ')
  );

  const isFrontToBack = containsAny(context, ['front to back', 'fronttoback', 'protect', 'peel', 'frontline', 'teamfight', 'wombo']);
  const isPoke = containsAny(context, ['poke', 'siege']);
  const isPick = containsAny(context, ['pick', 'dive']);
  const isSplitPush = containsAny(context, ['splitpush', 'side lane', 'sidelane', 'abrir mapa']);
  const isScaling = containsAny(context, ['scaling', 'late', 'escala']);

  const checklist = Array.isArray(summary.checklist) ? summary.checklist : [];
  const criticalErrors = Array.isArray(summary.criticalErrors) ? summary.criticalErrors : [];

  const early = {
    phase: 'EARLY (0–10)',
    title: isPoke ? 'Desgasta y toma visión' : isPick ? 'Busca ventanas cortas' : isSplitPush ? 'Gana tempo en laterales' : isFrontToBack ? 'Escala sin regalar ventajas' : 'Asegura la base',
    detail: isPoke
      ? 'Prioriza visión de río y poke seguro. No comprometas la entrada si no has debilitado al rival.'
      : isPick
        ? 'Juega alrededor de niebla y castiga errores rápidos. No alargues la pelea.'
        : isSplitPush
          ? 'Abre el mapa y fuerza respuestas tempranas. Tu valor aparece en laterales y rotaciones.'
          : isFrontToBack
            ? 'No fuerces peleas largas si no tienes prioridad. Protege recursos y prepara el escalado.'
            : 'Gana tiempo, evita desventajas gratis y prepara la composición para su ventana real.',
    actions: checklist.slice(0, 2).map((item) => item.label),
    avoid: criticalErrors.slice(0, 1).map((item) => item.label),
  };

  const mid = {
    phase: 'MID (10–20)',
    title: isPoke ? 'Convierte poke en objetivo' : isPick ? 'Encadena picks y objetivos' : isSplitPush ? 'Convierte presión en mapa' : isFrontToBack ? 'Agrúpate y fuerza objetivos' : 'Transforma la ventaja',
    detail: isPoke
      ? 'Tu ventana real está en convertir desgaste en torre, dragón o heraldo.'
      : isPick
        ? 'La visión ya debe producir picks y esas ventanas tienen que acabar en objetivos.'
        : isSplitPush
          ? 'Obliga al rival a responder en más de una línea y usa esa ventaja para tomar objetivos.'
          : isFrontToBack
            ? 'Es el momento de agruparte, controlar espacio y jugar alrededor del objetivo clave.'
            : 'Tu composición debe convertir el mapa en una ventaja concreta y repetible.',
    actions: checklist.slice(1, 3).map((item) => item.label),
    avoid: criticalErrors.slice(1, 2).map((item) => item.label),
  };

  const late = {
    phase: 'LATE (20+)',
    title: isSplitPush ? 'Cierra por presión lateral' : isFrontToBack ? 'Juega el 5v5 limpio' : isPoke ? 'No entres sin ventaja' : isScaling ? 'Cierra con calma y orden' : 'Ejecuta la condición de victoria',
    detail: isSplitPush
      ? 'Sigue abriendo el mapa y castiga las respuestas tarde. No regales el control central.'
      : isFrontToBack
        ? 'Protege al carry y fuerza peleas limpias. Tu victoria depende de un 5v5 ordenado.'
        : isPoke
          ? 'Usa el daño previo para evitar entradas malas y cierra la partida sin regalar el tempo.'
          : isScaling
            ? 'Tu ventaja aparece aquí: agrúpate, protege la condición de victoria y no improvises.'
            : 'Haz que todo el trabajo previo termine en una pelea clara o en un cierre de objetivo.',
    actions: checklist.slice(2, 4).map((item) => item.label),
    avoid: criticalErrors.slice(2, 3).map((item) => item.label),
  };

  return [early, mid, late];
}

function uniqueValues(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function renderProfileRow(item) {
  return `
    <article class="analysis-hub__profile-row">
      <div class="analysis-hub__profile-head">
        <strong>${escapeHtml(item.label)}</strong>
        <span>${escapeHtml(item.badge)} · ${item.score}/100</span>
      </div>
      <div class="analysis-hub__profile-bar" aria-hidden="true">
        <div class="analysis-hub__profile-fill" style="--meter:${clamp(item.score, 0, 100)}%"></div>
      </div>
      <p>${escapeHtml(item.text)}</p>
    </article>
  `;
}

function renderExecutionRow(item) {
  return `
    <article class="analysis-hub__profile-row">
      <div class="analysis-hub__profile-head">
        <strong>${escapeHtml(item.label)}</strong>
        <span>${item.score}/5 · ${escapeHtml(item.badge)}</span>
      </div>
      <div class="analysis-hub__profile-bar" aria-hidden="true">
        <div class="analysis-hub__profile-fill" style="--meter:${clamp(item.score * 20, 0, 100)}%"></div>
      </div>
      <p>${escapeHtml(item.detail)}</p>
    </article>
  `;
}

function renderTimelineRow(item) {
  return `
    <article class="analysis-hub__timeline-row">
      <div class="analysis-hub__profile-head">
        <strong>${escapeHtml(item.phase)}</strong>
        <span>${escapeHtml(item.title)}</span>
      </div>
      <p>${escapeHtml(item.detail)}</p>
      ${item.actions?.length ? `<div class="analysis-hub__chip-list">${item.actions.map((action) => `<span class="story-pill story-pill--info">${escapeHtml(action)}</span>`).join('')}</div>` : ''}
      ${item.avoid?.length ? `<div class="analysis-hub__chip-list">${item.avoid.map((avoid) => `<span class="story-pill story-pill--warning">${escapeHtml(avoid)}</span>`).join('')}</div>` : ''}
    </article>
  `;
}

function renderChecklistRow(item) {
  return `
    <article class="analysis-hub__row">
      <div class="analysis-hub__row-copy">
        <strong>✓ ${escapeHtml(item.label)}</strong>
        <p>${escapeHtml(item.detail)}</p>
      </div>
    </article>
  `;
}

function renderCriticalErrorRow(item) {
  return `
    <article class="analysis-hub__row">
      <div class="analysis-hub__row-copy">
        <strong>⚠ ${escapeHtml(item.label)}</strong>
        <p>${escapeHtml(item.detail)}</p>
      </div>
    </article>
  `;
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

function containsAny(text, terms = []) {
  const normalized = normalizeText(text);
  return terms.some((term) => normalized.includes(normalizeText(term)));
}

function toneByScore(score) {
  if (score >= 85) return 'is-good';
  if (score >= 70) return 'is-mid';
  return 'is-low';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
