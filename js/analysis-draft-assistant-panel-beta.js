import { analyzeComposition } from './analyzer.js';
import { buildNarrative } from './engine/narrativeEngine.js';

const ROOT_ID = 'analysisHubDraftAssistant';
const SELECTOR = '#compositionGrid .slot.is-filled';
const state = { root: null, observer: null, scheduled: false };

init().catch(console.error);

async function init() {
  const storyView = document.getElementById('storyView');
  const compositionGrid = document.getElementById('compositionGrid');
  if (!storyView || !compositionGrid) return;

  mountRoot(storyView);
  observeComposition(compositionGrid);
  renderPanel();
}

function mountRoot(storyView) {
  const existing = document.getElementById(ROOT_ID);
  if (existing) {
    state.root = existing;
    return;
  }

  const root = document.createElement('section');
  root.id = ROOT_ID;
  root.className = 'analysis-hub analysis-hub--cards analysis-hub--draft-assistant';
  root.setAttribute('aria-live', 'polite');

  const hubRoot = document.getElementById('analysisHubExecutiveSummary');
  if (hubRoot?.parentElement) {
    hubRoot.insertAdjacentElement('afterend', root);
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
    renderPanel();
  });
}

function renderPanel() {
  if (!state.root) return;

  const selectedChampions = collectSelectedChampions();
  if (selectedChampions.length < 5) {
    state.root.hidden = true;
    state.root.innerHTML = '';
    return;
  }

  const analysis = analyzeComposition(selectedChampions);
  const draftAssistant = analysis.draftAssistant || {};
  const strategicPlan = analysis.strategicPlan || analysis.plan || analysis.coach?.strategicPlan || {};
  const narrative = analysis.narrative || buildNarrative(analysis);
  const needs = Array.isArray(draftAssistant.compositionNeeds) ? draftAssistant.compositionNeeds : [];
  const profiles = Array.isArray(draftAssistant.strategicProfiles) ? draftAssistant.strategicProfiles : [];
  const picks = Array.isArray(draftAssistant.pickRecommendations) ? draftAssistant.pickRecommendations : [];
  const bans = Array.isArray(draftAssistant.banRecommendations) ? draftAssistant.banRecommendations : [];

  const heroTitle = narrative.title || 'Tu composición quiere ganar por un plan claro.';
  const heroLine = narrative.summary || 'La composición se entiende mejor como una sola historia.';
  const winLine = narrative.winLine || fallbackWinLine(analysis, strategicPlan);
  const priorityLine = narrative.solutionLine || fallbackSolutionLine(profiles[0] || null, picks[0] || null, strategicPlan);
  const riskLine = narrative.warningLine || fallbackWarningLine(bans[0] || null);
  const confidenceLine = confidencePrefix(narrative.confidence ?? analysis.confidence ?? 78);

  state.root.hidden = false;
  state.root.innerHTML = `
    <section class="design-system-card design-system-card--hero">
      <div class="design-system-card__header">
        <span class="design-system-badge">Tu composición</span>
        <span class="design-system-badge design-system-badge--muted">Confianza ${escapeHtml(confidenceLine)}</span>
      </div>

      <h3 class="design-system-card__title">${escapeHtml(heroTitle)}</h3>
      <p class="design-system-card__copy">${escapeHtml(heroLine)}</p>

      <div class="design-system-flow">
        ${renderFlowItem('Cómo ganas', winLine, 'is-hero', 'La idea principal de la partida')}
        ${renderFlowItem('Tu prioridad', priorityLine, 'is-primary', 'La acción que más te acerca al plan')}
        ${renderFlowItem('Evita', riskLine, 'is-warning', 'El error que más castiga la partida')}
      </div>
    </section>

    <details class="design-system-card design-system-card--detail">
      <summary class="design-system-card__summary">
        <strong>Ver análisis completo</strong>
        <span>${needs.length} señales</span>
      </summary>

      <div class="analysis-hub__assistant-list">
        <article class="analysis-hub__row analysis-hub__row--executive">
          <div class="analysis-hub__row-copy">
            <strong>Por qué</strong>
            <p>${escapeHtml(narrative.becauseLine || fallbackBecauseLine(needs[0] || null, strategicPlan))}</p>
          </div>
        </article>

        ${renderNeedRows(needs, strategicPlan)}
        ${renderProfileRows(profiles)}
        ${renderRecommendationRows(picks, 'Mejor decisión')}
        ${renderRecommendationRows(bans, 'Qué evitar')}
      </div>
    </details>
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

function renderFlowItem(label = '', value = '', tone = '', meta = '') {
  return `
    <article class="design-system-flow__item ${tone}">
      <span class="design-system-flow__label">${escapeHtml(label)}</span>
      <strong class="design-system-flow__value">${escapeHtml(value)}</strong>
      ${meta ? `<p class="design-system-flow__meta">${escapeHtml(meta)}</p>` : ''}
    </article>
  `;
}

function renderNeedRows(needs = [], strategicPlan = {}) {
  if (!needs.length) return '';

  return needs.slice(0, 3).map((need) => `
    <article class="analysis-hub__row">
      <div class="analysis-hub__row-copy">
        <strong>${escapeHtml(priorityPrefix(need.priority))} · ${escapeHtml(need.label)}</strong>
        <p>${escapeHtml(clampWords(need.detail, 11))}</p>
        <p class="analysis-hub__row-note">Impacto: ${escapeHtml(clampWords(need.impact || buildNeedImpact(need, strategicPlan), 13))}</p>
      </div>
      <span class="analysis-hub__assistant-score">${escapeHtml(String(need.score ?? 0))}/5</span>
    </article>
  `).join('');
}

function renderProfileRows(profiles = []) {
  if (!profiles.length) return '';

  return profiles.slice(0, 2).map((profile) => `
    <article class="analysis-hub__row">
      <div class="analysis-hub__row-copy">
        <strong>${escapeHtml(profile.label)}</strong>
        <p>${escapeHtml(clampWords(profile.detail, 12))}</p>
        <p class="analysis-hub__row-note">Por qué: ${escapeHtml(clampWords(profile.why || profile.impact || 'Encaja con el plan actual.', 12))}</p>
      </div>
      <span class="analysis-hub__assistant-score">${escapeHtml(confidencePrefix(profile.confidence))}<br>${escapeHtml(String(profile.confidence ?? 0))}/100</span>
    </article>
  `).join('');
}

function renderRecommendationRows(items = [], title = 'ITEM') {
  if (!items.length) return '';

  return items.slice(0, 2).map((item) => `
    <article class="analysis-hub__row">
      <div class="analysis-hub__row-copy">
        <strong>${escapeHtml(title)} · ${escapeHtml(item.label)}</strong>
        <p>${escapeHtml(clampWords(item.detail, 12))}</p>
        ${item.profileLabel ? `<p class="analysis-hub__row-note">Perfil: ${escapeHtml(item.profileLabel)}</p>` : ''}
      </div>
      <span class="analysis-hub__assistant-score">${escapeHtml(priorityPrefix(item.priority || 'minor'))}</span>
    </article>
  `).join('');
}

function fallbackWinLine(analysis = {}, strategicPlan = {}) {
  const identity = analysis?.primaryIdentity || strategicPlan?.fightStyle || 'Tu composición';
  const objective = strategicPlan?.primaryObjective || analysis?.winCondition?.label || 'su plan principal';
  return `${identity} quiere ganar por ${String(objective).toLowerCase()}.`;
}

function fallbackSolutionLine(topProfile = null, topPick = null, strategicPlan = {}) {
  const profile = topProfile?.label || 'un perfil estable';
  const pick = topPick?.profileLabel || topPick?.label || 'una opción compatible';
  const focus = String(strategicPlan?.fightStyle || strategicPlan?.mapFocus || 'el plan').toLowerCase();
  return `La mejor forma de resolverlo es buscar ${profile.toLowerCase()} y, si hace falta, traducirlo a ${pick.toLowerCase()} para sostener ${focus}.`;
}

function fallbackWarningLine(topBan = null) {
  if (!topBan) return 'Evita añadir ruido: prioriza decisiones que encajen con el plan.';
  return `Ten cuidado con ${topBan.label.toLowerCase()}: ${clampWords(topBan.detail, 16)}.`;
}

function fallbackBecauseLine(primaryNeed = null, strategicPlan = {}) {
  if (!primaryNeed) return 'La necesidad principal sale del plan de juego actual.';
  const plan = String(strategicPlan?.fightStyle || strategicPlan?.mode || 'el plan actual').toLowerCase();
  const reason = String(primaryNeed.impact || primaryNeed.detail || 'la composición todavia tiene un hueco importante').toLowerCase();
  return `Necesita ${primaryNeed.label.toLowerCase()} porque ${reason} y eso afecta a ${plan}.`;
}

function buildNeedImpact(need = {}, strategicPlan = {}) {
  const style = String(strategicPlan?.fightStyle || 'tu plan').toLowerCase();
  const focus = String(strategicPlan?.mapFocus || 'los objetivos').toLowerCase();

  const impacts = {
    frontline: `Sin frontline, ${style} pierde espacio para ejecutarse.`,
    engage: 'Te costara iniciar peleas y asegurar objetivos.',
    damage: 'No tendras cierre claro en peleas largas o Baron.',
    scaling: 'El plan se queda corto en late game.',
    objective: `Convertir ventaja en ${focus} sera mas dificil.`,
    control: 'Perderas espacio y vision en los puntos clave.',
    teamfight: 'El 5v5 se volvera mas caotico y menos fiable.',
    poke: 'No podras desgastar al rival antes del engage.',
    mobility: 'Rotar y reposicionarte costara mas.',
    pick: 'No castigaras errores cortos ni niebla.',
    splitpush: 'No abriras mapa ni forzaras respuestas laterales.',
  };

  return impacts[need.key] || 'El plan detectado quedara mas debil.';
}

function clampWords(text, maxWords = 12) {
  const words = String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);

  return words.slice(0, maxWords).join(' ');
}

function priorityPrefix(priority) {
  if (priority === 'critical') return 'Crítico';
  if (priority === 'important') return 'Importante';
  return 'Menor';
}

function confidencePrefix(confidence) {
  const value = Number(confidence) || 0;
  if (value >= 85) return 'Muy alta';
  if (value >= 70) return 'Alta';
  if (value >= 55) return 'Media';
  return 'Baja';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
