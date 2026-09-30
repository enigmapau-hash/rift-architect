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
  const summary = buildSummary(analysis);

  state.root.innerHTML = `
    <section class="analysis-hub__shell analysis-hub__shell--cards">
      <header class="analysis-hub__hero">
        <div class="analysis-hub__hero-copy">
          <p class="eyebrow">Sprint 13.5 · Executive Summary</p>
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

      <section class="analysis-hub__summary-panel">
        <div class="analysis-hub__summary-panel-head">
          <span class="analysis-hub__card-kicker">Perfil del draft</span>
          <span class="analysis-hub__summary-panel-note">Lectura visual</span>
        </div>
        <div class="analysis-hub__profile-grid">
          ${summary.profile.map(renderProfileRow).join('')}
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

function buildSummary(analysis) {
  const confidence = clamp(Number(analysis?.confidence) || 0, 0, 100);
  const grade = gradeFromScore(confidence);
  const badge = confidence >= 85 ? 'Alta confianza' : confidence >= 70 ? 'Confianza media-alta' : 'Necesita ajustes';
  const title = `${analysis?.primaryIdentity || 'Draft'} · ${analysis?.winCondition?.label || 'Plan claro'}`;
  const text = clampWords(
    [
      analysis?.winCondition?.detail || analysis?.summaryText || 'Tu composición sigue su identidad principal.',
      `Objetivo: ${analysis?.winCondition?.label || analysis?.primaryIdentity || 'jugar a tu plan'}.`,
      `Pico de poder: ${analysis?.tempoDetail?.label || 'Mid Game'}.`,
    ].join(' '),
    24
  );

  return {
    title,
    text,
    grade,
    badge,
    score: confidence,
    tags: uniqueValues([
      analysis?.primaryIdentity,
      analysis?.winCondition?.label,
      analysis?.tempoDetail?.label,
      analysis?.coherence?.label,
      `${confidence}%`,
    ]).slice(0, 4),
    profile: buildDraftProfile(analysis),
    priorities: buildPriorityChips(analysis),
  };
}

function buildDraftProfile(analysis) {
  const metrics = Array.isArray(analysis?.metrics) ? analysis.metrics : [];
  const score = (key) => Number(metrics.find((metric) => metric?.key === key)?.score || 0);
  const average = (keys) => Math.round(keys.reduce((sum, key) => sum + score(key), 0) / Math.max(1, keys.length));
  const label = (value) => {
    if (value >= 75) return 'Muy fuerte';
    if (value >= 55) return 'Aceptable';
    return 'Débil';
  };

  return [
    {
      label: 'Teamfight',
      score: average(['frontline', 'engage', 'control', 'teamfight']),
      text: analysis?.winCondition?.label || 'Luchas agrupadas y controladas.',
    },
    {
      label: 'Engage',
      score: average(['engage', 'pick', 'mobility']),
      text: 'Capacidad para iniciar y forzar.',
    },
    {
      label: 'Scaling',
      score: average(['scaling', 'damage']),
      text: analysis?.tempoDetail?.label || 'Cuánto creces con el tiempo.',
    },
    {
      label: 'Poke',
      score: average(['poke', 'control']),
      text: 'Desgaste a distancia antes de entrar.',
    },
    {
      label: 'Split Push',
      score: score('splitpush'),
      text: 'Capacidad para abrir mapa y laterales.',
    },
  ].map((item) => ({
    ...item,
    badge: label(item.score),
  }));
}

function buildPriorityChips(analysis) {
  const windowLabel = analysis?.tempoDetail?.label || 'Mid Game';
  return uniqueValues([
    analysis?.winCondition?.label,
    analysis?.coherence?.label,
    `Pico: ${windowLabel}`,
    analysis?.primaryIdentity,
  ]).slice(0, 4);
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

function uniqueValues(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function clampWords(text, maxWords = 12) {
  const words = String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);

  return words.slice(0, maxWords).join(' ');
}

function toneByScore(score) {
  if (score >= 85) return 'is-good';
  if (score >= 70) return 'is-mid';
  return 'is-low';
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

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
