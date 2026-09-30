import { analyzeComposition } from './analyzer.js';

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
  const needs = Array.isArray(draftAssistant.compositionNeeds) ? draftAssistant.compositionNeeds : [];
  const pickRecommendations = Array.isArray(draftAssistant.pickRecommendations) ? draftAssistant.pickRecommendations : [];
  const banRecommendations = Array.isArray(draftAssistant.banRecommendations) ? draftAssistant.banRecommendations : [];
  const priorities = Array.isArray(draftAssistant.priorities) ? draftAssistant.priorities : [];
  const summary = draftAssistant.summary || 'La composición necesita reforzar su plan de juego antes de elegir un campeón o un ban.';
  const headline = buildHeadline(needs, draftAssistant);

  state.root.hidden = false;
  state.root.innerHTML = `
    <section class="analysis-hub__summary-panel analysis-hub__summary-panel--draft-assistant">
      <div class="analysis-hub__summary-panel-head">
        <span class="analysis-hub__card-kicker">Draft Assistant</span>
        <span class="analysis-hub__summary-panel-note">Necesidades, picks y bans</span>
      </div>

      <div class="analysis-hub__assistant-hero">
        <p class="analysis-hub__assistant-hero-title">${escapeHtml(headline)}</p>
        <p>${escapeHtml(summary)}</p>
      </div>

      <div class="analysis-hub__assistant-chip-row">
        ${priorities.slice(0, 4).map((item) => `
          <span class="analysis-hub__priority-pill analysis-hub__priority-pill--assistant">
            ${escapeHtml(item.label)}
          </span>
        `).join('')}
      </div>

      <div class="analysis-hub__assistant-grid">
        <details class="analysis-hub__assistant-card" open>
          <summary>
            <strong>Necesidades detectadas</strong>
            <span>${needs.length} señales</span>
          </summary>
          <div class="analysis-hub__assistant-list">
            ${renderNeedRows(needs)}
          </div>
        </details>

        <details class="analysis-hub__assistant-card">
          <summary>
            <strong>Draft Picks</strong>
            <span>${pickRecommendations.length} recomendaciones</span>
          </summary>
          <div class="analysis-hub__assistant-list">
            ${renderRecommendationRows(pickRecommendations, 'PICK')}
          </div>
        </details>

        <details class="analysis-hub__assistant-card">
          <summary>
            <strong>Draft Bans</strong>
            <span>${banRecommendations.length} recomendaciones</span>
          </summary>
          <div class="analysis-hub__assistant-list">
            ${renderRecommendationRows(banRecommendations, 'BAN')}
          </div>
        </details>
      </div>
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

function renderNeedRows(needs = []) {
  if (!needs.length) {
    return `
      <article class="analysis-hub__row">
        <div class="analysis-hub__row-copy">
          <strong>Sin carencias claras</strong>
          <p>La composición está razonablemente alineada con su plan principal.</p>
        </div>
      </article>
    `;
  }

  return needs.slice(0, 6).map((need) => `
    <article class="analysis-hub__row">
      <div class="analysis-hub__row-copy">
        <strong>${escapeHtml(priorityPrefix(need.priority))} · ${escapeHtml(need.label)}</strong>
        <p>${escapeHtml(clampWords(need.detail, 14))}</p>
      </div>
      <span class="analysis-hub__assistant-score">${escapeHtml(String(need.score ?? 0))}/5</span>
    </article>
  `).join('');
}

function renderRecommendationRows(items = [], kind = 'ITEM') {
  if (!items.length) {
    return `
      <article class="analysis-hub__row">
        <div class="analysis-hub__row-copy">
          <strong>Sin recomendaciones</strong>
          <p>Primero define las necesidades de la composición.</p>
        </div>
      </article>
    `;
  }

  return items.slice(0, 5).map((item) => `
    <article class="analysis-hub__row">
      <div class="analysis-hub__row-copy">
        <strong>${escapeHtml(kind)} · ${escapeHtml(item.label)}</strong>
        <p>${escapeHtml(clampWords(item.detail, 16))}</p>
      </div>
      <span class="analysis-hub__assistant-score">${escapeHtml(priorityPrefix(item.priority))}</span>
    </article>
  `).join('');
}

function buildHeadline(needs, draftAssistant) {
  if (!needs.length) return 'La composición está bastante equilibrada.';

  const top = needs.slice(0, 3).map((item) => item.label.toLowerCase());
  const focus = draftAssistant?.summary ? clampWords(draftAssistant.summary, 10) : 'reforzar el plan';
  return `Foco: ${top.join(' · ')} · ${focus}`;
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

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
