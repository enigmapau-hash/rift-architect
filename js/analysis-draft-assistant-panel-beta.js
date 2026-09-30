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
  const priorities = Array.isArray(draftAssistant.priorities) ? draftAssistant.priorities : [];
  const primaryNeed = needs[0] || null;
  const topProfile = profiles[0] || null;
  const topPick = picks[0] || null;
  const topBan = bans[0] || null;

  state.root.hidden = false;
  state.root.innerHTML = `
    <section class="analysis-hub__summary-panel analysis-hub__summary-panel--draft-assistant">
      <div class="analysis-hub__summary-panel-head">
        <span class="analysis-hub__card-kicker">Beta 0.2</span>
        <span class="analysis-hub__summary-panel-note">Una sola conversación · respuesta arriba, detalle abajo</span>
      </div>

      <div class="analysis-hub__assistant-story">
        <p class="analysis-hub__assistant-hero-title">${escapeHtml(narrative.title || 'Tu composición quiere ganar por un plan claro.')}</p>
        <p>${escapeHtml(narrative.summary || 'La composición se entiende mejor como una historia simple.')}</p>
        <div class="analysis-hub__assistant-list analysis-hub__assistant-list--compact">
          ${renderQuickRows({ narrative, primaryNeed, topProfile, topPick, topBan, strategicPlan })}
        </div>
      </div>

      <div class="analysis-hub__assistant-chip-row">
        ${priorities.slice(0, 2).map((item) => `
          <span class="analysis-hub__priority-pill analysis-hub__priority-pill--assistant">${escapeHtml(item.label)}</span>
        `).join('')}
      </div>

      <details class="analysis-hub__assistant-card" open>
        <summary>
          <strong>Ver análisis completo</strong>
          <span>${needs.length} señales</span>
        </summary>
        <div class="analysis-hub__assistant-list">
          ${renderNeedRows(needs, strategicPlan)}
          ${renderProfileRows(profiles.slice(0, 2))}
          ${renderRecommendationRows(picks.slice(0, 2), 'PICK')}
          ${renderRecommendationRows(bans.slice(0, 2), 'BAN')}
        </div>
      </details>
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

function renderQuickRows({ narrative, primaryNeed, topProfile, topPick, topBan, strategicPlan = {} }) {
  const rows = [];

  if (narrative?.winLine) {
    rows.push({ title: 'Cómo gana', text: narrative.winLine, note: 'La historia principal' });
  }

  if (primaryNeed) {
    rows.push({
      title: `Qué necesita · ${primaryNeed.label}`,
      text: clampWords(primaryNeed.impact || buildNeedImpact(primaryNeed, strategicPlan), 16),
      note: `Peso ${String(primaryNeed.score ?? 0)}/5`,
    });
  }

  if (topProfile || topPick) {
    const solutionTitle = topProfile ? `Mejor solución · ${topProfile.label}` : `Mejor decisión · ${topPick.label}`;
    const solutionText = topProfile
      ? clampWords(topProfile.why || topProfile.detail || 'Encaja con el plan actual.', 16)
      : clampWords(topPick.detail, 16);
    const solutionNote = topProfile
      ? `Confianza ${String(topProfile.confidence ?? 0)}/100`
      : `Confianza ${String(topPick.confidence ?? 0)}/100`;

    rows.push({ title: solutionTitle, text: solutionText, note: solutionNote });
  }

  if (topBan) {
    rows.push({
      title: `Qué evitar · ${topBan.label}`,
      text: clampWords(topBan.detail, 16),
      note: topBan.profileLabel ? `Perfil ${topBan.profileLabel}` : 'Evitar',
    });
  }

  return rows.slice(0, 4).map((row) => `
    <article class="analysis-hub__row analysis-hub__row--executive">
      <div class="analysis-hub__row-copy">
        <strong>${escapeHtml(row.title)}</strong>
        <p>${escapeHtml(row.text)}</p>
        <p class="analysis-hub__row-note">${escapeHtml(row.note)}</p>
      </div>
    </article>
  `).join('');
}

function renderNeedRows(needs = [], strategicPlan = {}) {
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
  if (!profiles.length) {
    return '';
  }

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

function renderRecommendationRows(items = [], kind = 'ITEM') {
  if (!items.length) {
    return '';
  }

  return items.slice(0, 2).map((item) => `
    <article class="analysis-hub__row">
      <div class="analysis-hub__row-copy">
        <strong>${escapeHtml(kind)} · ${escapeHtml(item.label)}</strong>
        <p>${escapeHtml(clampWords(item.detail, 12))}</p>
        ${item.profileLabel ? `<p class="analysis-hub__row-note">Perfil: ${escapeHtml(item.profileLabel)}</p>` : ''}
      </div>
      <span class="analysis-hub__assistant-score">${escapeHtml(priorityPrefix(item.priority || 'minor'))}</span>
    </article>
  `).join('');
}

function buildNeedImpact(need = {}, strategicPlan = {}) {
  const style = String(strategicPlan?.fightStyle || 'tu plan').toLowerCase();
  const focus = String(strategicPlan?.mapFocus || 'los objetivos').toLowerCase();

  const impacts = {
    frontline: `Sin frontline, ${style} pierde espacio para ejecutarse.`,
    engage: 'Te costará iniciar peleas y asegurar objetivos.',
    damage: 'No tendrás cierre claro en peleas largas o Barón.',
    scaling: 'El plan se queda corto en late game.',
    objective: `Convertir ventaja en ${focus} será más difícil.`,
    control: 'Perderás espacio y visión en los puntos clave.',
    teamfight: 'El 5v5 se volverá más caótico y menos fiable.',
    poke: 'No podrás desgastar al rival antes del engage.',
    mobility: 'Rotar y reposicionarte costará más.',
    pick: 'No castigarás errores cortos ni niebla.',
    splitpush: 'No abrirás mapa ni forzarás respuestas laterales.',
  };

  return impacts[need.key] || 'El plan detectado quedará más débil.';
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
