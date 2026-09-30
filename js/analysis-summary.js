import { analyzeComposition } from './analyzer.js';

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
  if (existing) { state.root = existing; return; }
  const root = document.createElement('section');
  root.id = ROOT_ID;
  root.className = 'analysis-hub analysis-hub--cards';
  root.setAttribute('aria-live', 'polite');
  const hubRoot = document.getElementById('analysisHubView');
  if (hubRoot?.parentElement) hubRoot.parentElement.insertBefore(root, hubRoot);
  else storyView.insertAdjacentElement('afterend', root);
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
  window.requestAnimationFrame(() => { state.scheduled = false; renderSummary(); });
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
  const summary = buildSummary(analysis);

  state.root.innerHTML = `
    <section class="analysis-hub__shell analysis-hub__shell--cards">
      <header class="analysis-hub__hero">
        <div class="analysis-hub__hero-copy">
          <p class="eyebrow">Sprint 13.5 · Executive Summary</p>
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
    </section>
  `;
}

function collectSelectedChampions() {
  return [...document.querySelectorAll(SELECTOR)]
    .map((slot) => ({ role: String(slot.dataset.role || 'top'), champion: slot.querySelector('.slot__name')?.textContent?.trim() || '', identity: slot.querySelector('.slot__meta')?.textContent?.trim() || '', function: slot.querySelector('.champion-item__sub')?.textContent?.trim() || '', tempo: slot.querySelector('.slot__tempo')?.textContent?.trim() || '', strengths: [], weaknesses: [] }))
    .filter((champion) => champion.champion);
}

function buildSummary(analysis) {
  const confidence = Number(analysis?.confidence) || 0;
  const grade = gradeFromScore(confidence);
  const badge = confidence >= 85 ? 'Alta confianza' : confidence >= 70 ? 'Confianza media-alta' : 'Necesita ajustes';
  const title = `${analysis?.primaryIdentity || 'Draft'} · ${analysis?.winCondition?.label || 'Plan claro'}`;
  const text = [analysis?.winCondition?.detail || analysis?.summaryText || 'Tu composición sigue su identidad principal.', `Objetivo: ${analysis?.winCondition?.label || analysis?.primaryIdentity || 'jugar a tu plan'}.`, `Pico de poder: ${analysis?.tempoDetail?.label || 'Mid Game'}.`].join(' ');
  return { title, text, grade, badge, score: clamp(confidence, 0, 100), tags: uniqueValues([analysis?.primaryIdentity, analysis?.winCondition?.label, analysis?.tempoDetail?.label, `${clamp(confidence, 0, 100)}%`]).slice(0, 4) };
}

function uniqueValues(values = []) { return [...new Set(values.filter(Boolean))]; }
function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
function toneByScore(score) { if (score >= 85) return 'is-good'; if (score >= 70) return 'is-mid'; return 'is-low'; }
function gradeFromScore(score) { if (score >= 95) return 'A+'; if (score >= 88) return 'A'; if (score >= 80) return 'B+'; if (score >= 72) return 'B'; if (score >= 64) return 'C+'; if (score >= 56) return 'C'; return 'D'; }
function escapeHtml(value) { return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;'); }
