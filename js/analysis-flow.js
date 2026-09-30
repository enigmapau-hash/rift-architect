import { analyzeComposition } from './analyzer.js';
import { buildExecutiveSummary } from './engine/executiveSummary.js';
import { buildDecisionFlowBase, applyDecisionFlowAction } from './engine/decisionFlow.js';

const ROOT_ID = 'analysisHubView';
const SELECTOR = '#compositionGrid .slot.is-filled';

const CARD_ORDER = [
  { id: 'verdict', icon: '📊', title: 'Veredicto' },
  { id: 'plan', icon: '🎯', title: 'Plan' },
  { id: 'risks', icon: '⚠️', title: 'Riesgos' },
  { id: 'timing', icon: '⏱️', title: 'Timing' },
  { id: 'advisor', icon: '🤖', title: 'Advisor' },
];

const ACTIONS = [
  { key: 'win', icon: '🎯', label: '¿Cómo gano?' },
  { key: 'risk', icon: '⚠️', label: '¿Qué me castiga?' },
  { key: 'init', icon: '🛡️', label: '¿Quién inicia?' },
  { key: 'priority', icon: '🏆', label: '¿Qué priorizo?' },
];

const state = {
  root: null,
  observer: null,
  scheduled: false,
  activeCard: 'verdict',
  activeAction: 'win',
};

init().catch((error) => console.error(error));

async function init() {
  const storyView = document.getElementById('storyView');
  const compositionGrid = document.getElementById('compositionGrid');
  if (!storyView || !compositionGrid) return;

  mountRoot(storyView);
  observeComposition(compositionGrid);
  renderHub();
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
  storyView.insertAdjacentElement('afterend', root);
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
    renderHub();
  });
}

function renderHub() {
  if (!state.root) return;

  const selectedChampions = collectSelectedChampions();
  if (selectedChampions.length < 5) {
    state.root.innerHTML = `
      <article class="analysis-hub__empty">
        <p class="eyebrow">Sprint 13.8 · Decision Flow</p>
        <h4>Completa los cinco campeones para ver el análisis</h4>
        <p>La lectura aparece cuando la composición está completa.</p>
      </article>
    `;
    return;
  }

  if (!CARD_ORDER.some((card) => card.id === state.activeCard)) {
    state.activeCard = 'verdict';
  }

  const analysis = analyzeComposition(selectedChampions);
  const summary = analysis.executiveSummary || buildExecutiveSummary(analysis);
  const baseFlow = analysis.decisionFlowBase || buildDecisionFlowBase(analysis, selectedChampions);
  const model = applyDecisionFlowAction(baseFlow, state.activeAction);

  state.root.innerHTML = `
    <section class="analysis-hub__shell analysis-hub__shell--cards">
      <header class="analysis-hub__hero">
        <div class="analysis-hub__hero-copy">
          <p class="eyebrow">Sprint 13.8 · Decision Flow</p>
          <h4>${escapeHtml(summary.title)}</h4>
          <p>${escapeHtml(summary.text)}</p>
          <div class="analysis-hub__flow-mini">
            ${summary.tags
              .map((tag, index) => `<span class="analysis-hub__flow-mini-item ${index === 0 ? 'is-active' : ''}">${escapeHtml(tag)}</span>`)
              .join('')}
          </div>
        </div>

        <div class="analysis-hub__score-card ${toneByScore(summary.score)}">
          <span class="analysis-hub__score-kicker">Draft</span>
          <strong>${escapeHtml(summary.grade)}</strong>
          <span>${escapeHtml(summary.badge)}</span>
        </div>
      </header>

      <nav class="analysis-hub__flow" aria-label="Flujo de decisión">
        ${CARD_ORDER.map((card, index) => renderFlowButton(card, index + 1, model[card.id], state.activeCard === card.id)).join('')}
      </nav>

      <div class="analysis-hub__cards">
        ${CARD_ORDER.map((card) => renderDetailCard(card, model[card.id], state.activeCard === card.id)).join('')}
      </div>
    </section>
  `;

  bindHubInteractions();
}

function bindHubInteractions() {
  state.root.querySelectorAll('[data-hub-step]').forEach((button) => {
    button.addEventListener('click', () => {
      state.activeCard = String(button.dataset.hubStep || 'verdict');
      renderHub();
    });
  });

  state.root.querySelectorAll('details[data-hub-card]').forEach((details) => {
    details.addEventListener('toggle', () => {
      const cardId = String(details.dataset.hubCard || '');
      if (details.open) {
        state.activeCard = cardId;
        state.root.querySelectorAll('details[data-hub-card]').forEach((other) => {
          if (other !== details) other.open = false;
        });
      } else if (state.activeCard === cardId) {
        state.activeCard = 'verdict';
      }
    });
  });

  state.root.querySelectorAll('[data-hub-action]').forEach((button) => {
    button.addEventListener('click', () => {
      state.activeAction = String(button.dataset.hubAction || 'win');
      state.activeCard = 'advisor';
      renderHub();
    });
  });
}

function renderFlowButton(card, index, model, active) {
  return `
    <button class="analysis-hub__flow-btn ${active ? 'is-active' : ''}" type="button" data-hub-step="${card.id}">
      <span class="analysis-hub__flow-index">${index}</span>
      <span class="analysis-hub__flow-copy">
        <strong>${card.icon} ${escapeHtml(card.title)}</strong>
        <small>${escapeHtml(model?.summary || '—')}</small>
      </span>
      <span class="analysis-hub__flow-arrow" aria-hidden="true">▸</span>
    </button>
  `;
}

function renderDetailCard(card, model, open) {
  return `
    <details class="analysis-hub__card analysis-hub__card--${card.id}" data-hub-card="${card.id}" ${open ? 'open' : ''}>
      <summary class="analysis-hub__summary">
        <div class="analysis-hub__summary-head">
          <div class="analysis-hub__summary-copy">
            <span class="analysis-hub__card-kicker">${card.icon} ${escapeHtml(card.title)}</span>
            <strong>${escapeHtml(model.summary)}</strong>
            <p class="analysis-hub__summary-line">${escapeHtml(model.line)}</p>
          </div>
          <span class="analysis-hub__card-badge">${escapeHtml(model.badge)}</span>
        </div>
        <div class="analysis-hub__summary-footer">
          <span class="analysis-hub__summary-hint analysis-hub__summary-hint--closed">Ver más</span>
          <span class="analysis-hub__summary-hint analysis-hub__summary-hint--open">Ocultar</span>
          <span class="analysis-hub__summary-chevron" aria-hidden="true">▾</span>
        </div>
      </summary>
      <div class="analysis-hub__body">${renderCardBody(card.id, model)}</div>
    </details>
  `;
}

function renderCardBody(cardId, model) {
  switch (cardId) {
    case 'verdict':
      return `
        <p class="analysis-hub__lead">${escapeHtml(model.text)}</p>
        <div class="analysis-hub__chip-list">
          ${model.chips.map((chip) => `<span class="story-pill story-pill--info">${escapeHtml(chip)}</span>`).join('')}
        </div>
        <div class="analysis-hub__metric-list">${model.metrics.map(renderMetricRow).join('')}</div>
        <details class="analysis-hub__why">
          <summary>Evidencias</summary>
          <div class="analysis-hub__chip-list">
            ${model.evidence.map((item) => `<span class="story-pill story-pill--info">${escapeHtml(item)}</span>`).join('')}
          </div>
        </details>
      `;
    case 'plan':
      return `
        <p class="analysis-hub__lead">${escapeHtml(model.text)}</p>
        <div class="analysis-hub__chip-list">
          ${model.chips.map((chip) => `<span class="story-pill story-pill--info">${escapeHtml(chip)}</span>`).join('')}
        </div>
        <div class="analysis-hub__list">${model.steps.map(renderLineRow).join('')}</div>
        <details class="analysis-hub__why">
          <summary>Evidencias</summary>
          <div class="analysis-hub__chip-list">
            ${model.evidence.map((item) => `<span class="story-pill story-pill--info">${escapeHtml(item)}</span>`).join('')}
          </div>
        </details>
      `;
    case 'risks':
      return `
        <p class="analysis-hub__lead">${escapeHtml(model.text)}</p>
        <div class="analysis-hub__chip-list">
          ${model.chips.map((chip) => `<span class="story-pill story-pill--warning">${escapeHtml(chip)}</span>`).join('')}
        </div>
        <div class="analysis-hub__list">${model.items.map(renderLineRow).join('')}</div>
        <details class="analysis-hub__why">
          <summary>Evidencias</summary>
          <div class="analysis-hub__chip-list">
            ${model.evidence.map((item) => `<span class="story-pill story-pill--warning">${escapeHtml(item)}</span>`).join('')}
          </div>
        </details>
      `;
    case 'timing':
      return `
        <p class="analysis-hub__lead">${escapeHtml(model.text)}</p>
        <div class="analysis-hub__chip-list">
          ${model.chips.map((chip) => `<span class="story-pill story-pill--info">${escapeHtml(chip)}</span>`).join('')}
        </div>
        <div class="analysis-hub__list">${model.windows.map(renderPhaseRow).join('')}</div>
        <details class="analysis-hub__why">
          <summary>Evidencias</summary>
          <div class="analysis-hub__chip-list">
            ${model.evidence.map((item) => `<span class="story-pill story-pill--info">${escapeHtml(item)}</span>`).join('')}
          </div>
        </details>
      `;
    case 'advisor':
      return `
        <div class="analysis-hub__actions" role="tablist" aria-label="Acciones del asesor">
          ${ACTIONS.map((action) => `
            <button class="analysis-hub__action ${action.key === model.activeAction ? 'is-active' : ''}" type="button" role="tab" aria-selected="${action.key === model.activeAction ? 'true' : 'false'}" data-hub-action="${action.key}">
              <span class="analysis-hub__action-icon">${action.icon}</span>
              <span class="analysis-hub__action-copy">
                <strong>${escapeHtml(action.label)}</strong>
                <small>${escapeHtml(model.actionHints[action.key] || '')}</small>
              </span>
            </button>
          `).join('')}
        </div>

        <p class="analysis-hub__lead">${escapeHtml(model.response.text)}</p>

        <article class="analysis-hub__response-card analysis-hub__response-card--compact">
          <span class="analysis-hub__card-kicker">Respuesta contextual</span>
          <strong>${escapeHtml(model.response.title)}</strong>
          <p>${escapeHtml(model.why)}</p>
        </article>

        <div class="analysis-hub__chip-list">
          ${model.chips.map((chip) => `<span class="story-pill story-pill--${chip.tone}">${escapeHtml(chip.label)}</span>`).join('')}
        </div>

        <div class="analysis-hub__list">${model.insights.map(renderLineRow).join('')}</div>
        <details class="analysis-hub__why">
          <summary>Evidencias</summary>
          <div class="analysis-hub__chip-list">
            ${model.evidence.map((item) => `<span class="story-pill story-pill--info">${escapeHtml(item)}</span>`).join('')}
          </div>
        </details>
      `;
    default:
      return '';
  }
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

function renderMetricRow(metric) {
  return `
    <article class="analysis-hub__metric">
      <div class="analysis-hub__metric-head">
        <strong>${escapeHtml(metric.label)}</strong>
        <span>${metric.score}/100</span>
      </div>
      <div class="analysis-hub__metric-bar" aria-hidden="true">
        <div class="analysis-hub__metric-fill" style="--meter:${clamp(metric.score, 0, 100)}%"></div>
      </div>
      <p>${escapeHtml(metric.detail)}</p>
    </article>
  `;
}

function renderLineRow(item) {
  return `
    <div class="analysis-hub__row">
      <div class="analysis-hub__row-copy">
        <strong>${escapeHtml(item.label)}</strong>
        <p>${escapeHtml(item.detail)}</p>
      </div>
      ${item.score != null ? `<span class="analysis-hub__row-score">${item.score}/10</span>` : ''}
    </div>
  `;
}

function renderPhaseRow(phase) {
  const chips = Array.isArray(phase.actions) ? phase.actions.slice(0, 2) : [];
  return `
    <div class="analysis-hub__phase-row">
      <div class="analysis-hub__row-copy">
        <strong>${escapeHtml(phase.label)}</strong>
        <p>${escapeHtml(phase.detail)}</p>
      </div>
      <div class="analysis-hub__chip-list">${chips.map((chip) => `<span class="story-pill story-pill--info">${escapeHtml(chip)}</span>`).join('')}</div>
    </div>
  `;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
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
