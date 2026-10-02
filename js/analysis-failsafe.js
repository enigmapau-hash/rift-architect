import { analyzeComposition } from './analyzer.js';

const ROOT_ID = 'analysisHubExecutiveSummary';
const GRID_SELECTOR = '#compositionGrid';
const SLOT_SELECTOR = '#compositionGrid .slot.is-filled';

const state = {
  root: null,
  observer: null,
  scheduled: false,
  selectedChampions: [],
};

globalThis.renderAnalysisStory = renderStory;

init().catch((error) => console.error(error));

async function init() {
  const storyView = document.getElementById('storyView');
  const compositionGrid = document.getElementById('compositionGrid');
  if (!storyView || !compositionGrid) return;

  mountRoot(storyView);
  observeComposition(compositionGrid);

  window.addEventListener('rift-architect:composition-changed', handleCompositionChanged);
  window.addEventListener('storage', scheduleRender);
  window.addEventListener('resize', scheduleRender, { passive: true });
  window.setInterval(scheduleRender, 350);

  renderStory();
}

function mountRoot(storyView) {
  const existing = document.getElementById(ROOT_ID);
  if (existing) {
    state.root = existing;
    return;
  }

  const root = document.createElement('section');
  root.id = ROOT_ID;
  root.className = 'analysis-hub analysis-hub--cards analysis-hub--main-story';
  root.setAttribute('aria-live', 'polite');
  storyView.replaceChildren(root);
  state.root = root;
}

function observeComposition(node) {
  if (state.observer) return;

  state.observer = new MutationObserver(scheduleRender);
  state.observer.observe(node, { childList: true, subtree: true, characterData: true });
}

function handleCompositionChanged(event) {
  const selectedChampions = Array.isArray(event?.detail?.selectedChampions) ? event.detail.selectedChampions : [];
  if (selectedChampions.length) {
    state.selectedChampions = selectedChampions;
  }
  scheduleRender();
}

function scheduleRender() {
  if (state.scheduled) return;
  state.scheduled = true;
  window.requestAnimationFrame(() => {
    state.scheduled = false;
    renderStory();
  });
}

function renderStory() {
  if (!state.root) return;

  const selectedChampions = getSelectedChampions();
  state.selectedChampions = selectedChampions;

  if (selectedChampions.length < 5) {
    state.root.hidden = false;
    state.root.innerHTML = `
      <article class="analysis-hub__empty">
        <p class="eyebrow">Bloque 2 · Pantalla principal</p>
        <h4>Selecciona cinco campeones para ver el análisis</h4>
        <p>Primero verás un resumen corto. La historia completa aparecerá cuando la composición esté completa.</p>
      </article>
    `;
    return;
  }

  const analysis = analyzeComposition(selectedChampions);
  const model = buildModel(analysis);

  state.root.hidden = false;
  state.root.innerHTML = `
    <section class="analysis-hub__shell analysis-hub__shell--cards">
      <header class="analysis-hub__hero">
        <div class="analysis-hub__hero-copy">
          <p class="eyebrow">Bloque 2 · Pantalla principal</p>
          <h4>${escapeHtml(model.title)}</h4>
          <p>${escapeHtml(model.summaryText)}</p>
          <div class="analysis-hub__flow-mini">
            ${model.tags
              .map((tag, index) => `<span class="analysis-hub__flow-mini-item ${index === 0 ? 'is-active' : ''}">${escapeHtml(tag)}</span>`)
              .join('')}
          </div>
        </div>

        <div class="analysis-hub__score-card ${toneByScore(model.confidence)}">
          <span class="analysis-hub__score-kicker">Lectura rápida</span>
          <strong>${escapeHtml(model.grade)}</strong>
          <span>${escapeHtml(model.scoreBadge)} · ${escapeHtml(String(model.confidence))}%</span>
        </div>
      </header>

      <div class="analysis-hub__grid">
        ${renderIdentityCard(model)}
        ${renderListCard('Fortalezas', model.strengths, 'story-pill--success', 'Apoya el plan')}
        ${renderListCard('Debilidades', model.weaknesses, 'story-pill--danger', 'A vigilar')}
        ${renderPlanCard(model)}
        ${renderDualCard(model)}
      </div>
    </section>
  `;
}

function renderIdentityCard(model) {
  return `
    <article class="analysis-hub__card analysis-hub__card--assessment">
      <span class="analysis-hub__card-kicker">Identidad</span>
      <strong class="analysis-hub__card-title">${escapeHtml(model.primaryIdentity)}</strong>
      <p class="analysis-hub__card-copy">${escapeHtml(model.identityCopy)}</p>
      <div class="analysis-hub__chip-list">
        ${model.secondaryIdentities.length
          ? model.secondaryIdentities.map((item) => `<span class="story-pill story-pill--info">${escapeHtml(item)}</span>`).join('')
          : '<span class="analysis-empty">Sin secundarias claras</span>'}
      </div>
      <div class="analysis-hub__profile-bar" aria-hidden="true">
        <div class="analysis-hub__profile-fill" style="--meter:${clamp(model.confidence, 0, 100)}%"></div>
      </div>
      <p class="analysis-hub__card-foot">Tempo: ${escapeHtml(model.tempo)} · Dominancia: ${escapeHtml(model.dominance)}</p>
    </article>
  `;
}

function renderListCard(title, items, pillClass, emptyLabel) {
  return `
    <article class="analysis-hub__card">
      <span class="analysis-hub__card-kicker">${escapeHtml(title)}</span>
      <div class="analysis-hub__list">
        ${items.length
          ? items.map((item) => `
              <article class="analysis-hub__profile-row">
                <div class="analysis-hub__profile-head">
                  <strong>${escapeHtml(item.label)}</strong>
                  <span>${escapeHtml(item.badge)} · ${escapeHtml(String(item.score))}%</span>
                </div>
                <div class="analysis-hub__profile-bar" aria-hidden="true">
                  <div class="analysis-hub__profile-fill" style="--meter:${clamp(item.score, 0, 100)}%"></div>
                </div>
                <p>${escapeHtml(item.detail)}</p>
                <div class="analysis-hub__chip-list"><span class="story-pill ${pillClass}">${escapeHtml(emptyLabel)}</span></div>
              </article>
            `).join('')
          : `<p class="analysis-empty">${escapeHtml(emptyLabel)}</p>`}
      </div>
    </article>
  `;
}

function renderPlanCard(model) {
  return `
    <article class="analysis-hub__card analysis-hub__card--assessment">
      <span class="analysis-hub__card-kicker">Plan</span>
      <div class="analysis-hub__timeline-grid">
        ${model.phases
          .map(
            (phase) => `
              <article class="analysis-hub__timeline-row">
                <div class="analysis-hub__profile-head">
                  <strong>${escapeHtml(phase.phase)}</strong>
                  <span>${escapeHtml(phase.title)}</span>
                </div>
                <p>${escapeHtml(phase.detail)}</p>
                ${phase.actions.length ? `<div class="analysis-hub__chip-list">${phase.actions.map((action) => `<span class="story-pill story-pill--info">${escapeHtml(action)}</span>`).join('')}</div>` : ''}
              </article>
            `
          )
          .join('')}
      </div>
    </article>
  `;
}

function renderDualCard(model) {
  return `
    <article class="analysis-hub__card analysis-hub__card--assessment">
      <span class="analysis-hub__card-kicker">Sinergias y riesgos</span>
      <div class="analysis-hub__evidence-grid">
        <article class="analysis-hub__evidence-card">
          <span class="analysis-hub__card-kicker">Sinergias</span>
          <div class="analysis-hub__chip-list">
            ${model.synergies.length
              ? model.synergies.map((item) => `<span class="story-pill story-pill--success">${escapeHtml(item)}</span>`).join('')
              : '<span class="analysis-empty">Sin sinergias claras</span>'}
          </div>
        </article>

        <article class="analysis-hub__evidence-card analysis-hub__evidence-card--danger">
          <span class="analysis-hub__card-kicker">Riesgos</span>
          <div class="analysis-hub__chip-list">
            ${model.risks.length
              ? model.risks.map((item) => `<span class="story-pill story-pill--danger">${escapeHtml(item)}</span>`).join('')
              : '<span class="analysis-empty">Sin riesgos claros</span>'}
          </div>
        </article>
      </div>
    </article>
  `;
}

function buildModel(analysis = {}) {
  const executive = analysis.executiveSummary || {};
  const confidence = clamp(Number(executive.score ?? analysis.confidence ?? 0), 0, 100);
  const primaryIdentity = cleanText(analysis.primaryIdentity || 'Sin definir');
  const winLabel = cleanText(analysis.winCondition?.label || 'Jugar a tu plan');
  const winDetail = cleanText(analysis.winCondition?.detail || analysis.summaryText || '');
  const title = cleanText(executive.title || `${primaryIdentity} · ${winLabel}`);
  const summaryText = cleanText(executive.text || winDetail || 'Resumen compacto basado en la composición propia.');
  const tempo = cleanText(analysis.tempoDetail?.label || analysis.tempo || 'Tempo medio');
  const dominance = cleanText(analysis.dominance || 'Sin definir');
  const secondaryIdentities = uniqueValues([
    ...(Array.isArray(analysis.secondaryIdentities) ? analysis.secondaryIdentities : []),
    analysis.coherence?.label,
  ]).slice(0, 3);

  const strengths = uniqueValues(Array.isArray(analysis.strengths) ? analysis.strengths : []).slice(0, 3).map((item, index) => ({
    label: item,
    detail: 'Apoya la condición principal.',
    score: clamp(92 - index * 8, 55, 100),
    badge: 'Apoya el plan',
  }));

  const weaknesses = uniqueValues(Array.isArray(analysis.weaknesses) ? analysis.weaknesses : []).slice(0, 3).map((item, index) => ({
    label: item,
    detail: 'Te expone si lo fuerzas mal.',
    score: clamp(72 - index * 10, 35, 90),
    badge: 'A vigilar',
  }));

  const synergies = uniqueValues([
    ...(Array.isArray(analysis.synergies) ? analysis.synergies.map(formatEntry) : []),
    ...(Array.isArray(analysis.dependencies?.items) ? analysis.dependencies.items.map(formatEntry) : []),
  ]).slice(0, 3);

  const risks = uniqueValues([
    ...(Array.isArray(analysis.coherence?.conflicts) ? analysis.coherence.conflicts.map(formatEntry) : []),
    ...(Array.isArray(analysis.winCondition?.avoid) ? analysis.winCondition.avoid : []),
  ]).slice(0, 3);

  const phases = buildPhases(analysis);

  return {
    title,
    summaryText,
    confidence,
    scoreBadge: labelFromConfidence(confidence),
    grade: gradeFromScore(confidence),
    tags: uniqueValues([primaryIdentity, tempo, winLabel, analysis.coherence?.label || '']).slice(0, 4),
    primaryIdentity,
    identityCopy: summaryText,
    secondaryIdentities,
    strengths,
    weaknesses,
    synergies,
    risks,
    phases,
    tempo,
    dominance,
  };
}

function buildPhases(analysis = {}) {
  const coachPhases = Array.isArray(analysis.coach?.phases) ? analysis.coach.phases : [];
  if (coachPhases.length >= 3) {
    return coachPhases.slice(0, 3).map((phase, index) => ({
      phase: phase.phase || ['EARLY (0–10)', 'MID (10–20)', 'LATE (20+)'][index],
      title: cleanText(phase.title || phase.label || 'Ajusta tu plan'),
      detail: cleanText(phase.detail || 'Sigue la condición de victoria principal.'),
      actions: uniqueValues(Array.isArray(phase.actions) ? phase.actions : []).slice(0, 3),
    }));
  }

  const gamePlan = Array.isArray(analysis.gamePlan) ? analysis.gamePlan : [];
  return [
    {
      phase: 'EARLY (0–10)',
      title: cleanText(gamePlan[0] || 'Gana tiempo'),
      detail: 'Evita regalar ventajas y prepara tu ventana real.',
      actions: ['Visión', 'Tempo', 'Primer objetivo'],
    },
    {
      phase: 'MID (10–20)',
      title: cleanText(gamePlan[1] || 'Convierte ventaja'),
      detail: 'Transforma tu plan en mapa y objetivos.',
      actions: ['Agrupar', 'Pick', 'Objetivos'],
    },
    {
      phase: 'LATE (20+)',
      title: cleanText(gamePlan[2] || 'Cierra limpio'),
      detail: 'Juega tu condición de victoria principal sin improvisar.',
      actions: ['Proteger carry', 'Teamfight', 'Cerrar'],
    },
  ];
}

function formatEntry(value) {
  if (value == null) return '';
  if (typeof value === 'string') return cleanText(value);
  if (typeof value === 'object') {
    return cleanText(value.label || value.name || value.title || value.text || value.value || value.detail || value.summary || value.reason || value.description || value.champion || value.item || '');
  }
  return cleanText(String(value));
}

function getSelectedChampions() {
  return ROLE_ORDER.filter((role) => state.selected[role]).map((role) => ({ role, ...state.selected[role] }));
}

function uniqueValues(values = []) {
  return [...new Set(values.filter(Boolean).map((value) => cleanText(value)).filter(Boolean))];
}

function cleanText(value = '') {
  return String(value).replace(/\s+/g, ' ').trim();
}

function gradeFromScore(score) {
  const value = clamp(Number(score) || 0, 0, 100);
  if (value >= 90) return 'S';
  if (value >= 80) return 'A+';
  if (value >= 70) return 'A';
  if (value >= 60) return 'B';
  if (value >= 45) return 'C';
  return 'D';
}

function labelFromConfidence(score = 0) {
  const value = clamp(Math.round(Number(score) || 0), 0, 100);
  if (value >= 90) return 'Excelente';
  if (value >= 80) return 'Muy alta';
  if (value >= 70) return 'Alta';
  if (value >= 55) return 'Media';
  return 'Baja';
}

function toneByScore(score) {
  if (score >= 85) return 'is-good';
  if (score >= 70) return 'is-mid';
  return 'is-low';
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
