import { analyzeComposition } from './analyzer.js';

const ROOT_ID = 'analysisCoreSummaryView';
const SELECTOR = '#compositionGrid .slot.is-filled';

const state = {
  root: null,
  observer: null,
  scheduled: false,
};

globalThis.renderExecutiveSummary = renderPanel;

init().catch((error) => console.error(error));

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
  root.className = 'analysis-hub analysis-hub--cards analysis-hub--executive';
  root.setAttribute('aria-live', 'polite');

  const anchor = storyView?.parentElement || storyView;
  anchor.insertAdjacentElement('afterend', root);
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

  state.root.hidden = false;

  const analysis = analyzeComposition(selectedChampions);
  const summary = buildCompactSummary(analysis);

  state.root.innerHTML = `
    <section class="analysis-hub__shell analysis-hub__shell--cards">
      <header class="analysis-hub__hero">
        <div class="analysis-hub__hero-copy">
          <p class="eyebrow">Executive Summary</p>
          <h4>${escapeHtml(summary.title)}</h4>
          <p>${escapeHtml(summary.text)}</p>
          <div class="analysis-hub__flow-mini">
            ${summary.signals
              .map((signal, index) => `<span class="analysis-hub__flow-mini-item ${index === 0 ? 'is-active' : ''}">${escapeHtml(signal)}</span>`)
              .join('')}
          </div>
        </div>

        <div class="analysis-hub__score-card ${toneByScore(summary.score)}">
          <span class="analysis-hub__score-kicker">Lectura rápida</span>
          <strong>${escapeHtml(summary.grade)}</strong>
          <span>${escapeHtml(summary.badge)}</span>
        </div>
      </header>

      <section class="analysis-hub__summary-panel">
        <div class="analysis-hub__summary-panel-head">
          <span class="analysis-hub__card-kicker">Lo esencial</span>
          <span class="analysis-hub__summary-panel-note">4 señales en 1 vistazo</span>
        </div>
        <div class="analysis-hub__profile-grid">
          ${summary.blocks.map(renderBlockRow).join('')}
        </div>
      </section>
    </section>
  `;
}

function buildCompactSummary(analysis = {}) {
  const primaryIdentity = cleanText(analysis?.primaryIdentity || 'Sin definir');
  const winCondition = cleanText(analysis?.winCondition?.label || 'Jugar a tu plan');
  const winDetail = cleanText(analysis?.winCondition?.detail || analysis?.summaryText || '');
  const tempo = cleanText(analysis?.tempoDetail?.label || analysis?.tempo || 'Tempo medio');
  const confidence = clamp(Number(analysis?.confidence) || 0, 0, 100);
  const strengths = uniqueValues(Array.isArray(analysis?.strengths) ? analysis.strengths : []).slice(0, 3);
  const weaknesses = uniqueValues(Array.isArray(analysis?.weaknesses) ? analysis.weaknesses : []).slice(0, 3);
  const risks = uniqueValues([
    ...(Array.isArray(analysis?.coherence?.conflicts)
      ? analysis.coherence.conflicts.map((item) => item?.label || item)
      : []),
    ...(Array.isArray(analysis?.winCondition?.avoid) ? analysis.winCondition.avoid : []),
  ]).slice(0, 3);

  return {
    title: `${primaryIdentity} · ${winCondition}`,
    text: winDetail || 'Resumen ejecutivo basado en la composición propia.',
    score: confidence,
    grade: gradeFromScore(confidence),
    badge: labelFromConfidence(confidence),
    signals: uniqueValues([primaryIdentity, tempo, winCondition, analysis?.coherence?.label || '']).slice(0, 4),
    blocks: [
      {
        label: 'Identidad',
        value: primaryIdentity,
        detail: [tempo, analysis?.dominance || '', `Confianza ${confidence}%`].filter(Boolean).join(' · '),
        score: confidence,
        badge: labelFromConfidence(confidence),
      },
      {
        label: 'Fortalezas',
        value: strengths[0] || 'Sin fortaleza clara',
        detail: strengths.length ? strengths.slice(0, 3).join(' · ') : 'La composición todavía no destaca en nada concreto.',
        score: Math.max(45, confidence - 6),
        badge: strengths.length ? 'Apoya el plan' : 'A revisar',
      },
      {
        label: 'Debilidades',
        value: weaknesses[0] || risks[0] || 'Sin debilidad clara',
        detail: weaknesses.length ? weaknesses.slice(0, 3).join(' · ') : risks.join(' · ') || 'Poco castigo visible',
        score: Math.max(35, 100 - confidence),
        badge: risks.length ? 'Evitar' : 'Baja exposición',
      },
      {
        label: 'Plan',
        value: winCondition,
        detail: winDetail || 'Juega alrededor de la condición principal.',
        score: confidence,
        badge: 'Qué hacer',
      },
    ],
  };
}

function renderBlockRow(item) {
  return `
    <article class="analysis-hub__profile-row analysis-hub__profile-row--executive">
      <div class="analysis-hub__profile-head">
        <strong>${escapeHtml(item.label)}</strong>
        <span>${escapeHtml(item.badge)} · ${escapeHtml(String(item.score))}%</span>
      </div>
      <div class="analysis-hub__profile-bar" aria-hidden="true">
        <div class="analysis-hub__profile-fill" style="--meter:${clamp(Number(item.score) || 0, 0, 100)}%"></div>
      </div>
      <p><strong>${escapeHtml(item.value)}</strong>${item.detail ? ` · ${escapeHtml(item.detail)}` : ''}</p>
    </article>
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

function uniqueValues(values = []) {
  return [...new Set(values.filter(Boolean).map((value) => String(value).trim()).filter(Boolean))];
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
