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
  const strategicPlan = analysis.strategicPlan || analysis.plan || analysis.coach?.strategicPlan || {};
  const needs = Array.isArray(draftAssistant.compositionNeeds) ? draftAssistant.compositionNeeds : [];
  const strategicProfiles = Array.isArray(draftAssistant.strategicProfiles) ? draftAssistant.strategicProfiles : [];
  const pickRecommendations = Array.isArray(draftAssistant.pickRecommendations) ? draftAssistant.pickRecommendations : [];
  const banRecommendations = Array.isArray(draftAssistant.banRecommendations) ? draftAssistant.banRecommendations : [];
  const priorities = Array.isArray(draftAssistant.priorities) ? draftAssistant.priorities : [];
  const summary = draftAssistant.summary || 'La composición necesita reforzar su plan de juego antes de elegir un campeón o un ban.';
  const headline = buildHeadline(needs, strategicProfiles, draftAssistant);
  const planLine = buildPlanLine(strategicPlan);
  const primaryNeed = needs[0] || null;
  const secondaryNeed = needs[1] || null;
  const topProfile = strategicProfiles[0] || null;
  const topPick = pickRecommendations[0] || null;
  const topBan = banRecommendations[0] || null;

  state.root.hidden = false;
  state.root.innerHTML = `
    <section class="analysis-hub__summary-panel analysis-hub__summary-panel--draft-assistant">
      <div class="analysis-hub__summary-panel-head">
        <span class="analysis-hub__card-kicker">Draft Assistant</span>
        <span class="analysis-hub__summary-panel-note">Vista ejecutiva · lectura rápida primero</span>
      </div>

      <div class="analysis-hub__assistant-hero">
        <p class="analysis-hub__assistant-hero-title">${escapeHtml(headline)}</p>
        <p>${escapeHtml(summary)}</p>
        ${planLine ? `<p class="analysis-hub__assistant-hero-meta">Plan detectado: ${escapeHtml(planLine)}</p>` : ''}
      </div>

      <div class="analysis-hub__assistant-chip-row">
        ${priorities.slice(0, 2).map((item) => `
          <span class="analysis-hub__priority-pill analysis-hub__priority-pill--assistant">
            ${escapeHtml(item.label)}
          </span>
        `).join('')}
      </div>

      <div class="analysis-hub__assistant-grid analysis-hub__assistant-grid--compact">
        <article class="analysis-hub__assistant-card analysis-hub__assistant-card--summary">
          <div class="analysis-hub__assistant-card-head">
            <strong>Veredicto rápido</strong>
            <span>Lo esencial</span>
          </div>
          <div class="analysis-hub__assistant-list analysis-hub__assistant-list--compact">
            ${renderExecutiveRows(primaryNeed, secondaryNeed, topProfile, topPick, topBan, strategicPlan)}
          </div>
        </article>

        <details class="analysis-hub__assistant-card" open>
          <summary>
            <strong>Necesidades</strong>
            <span>${needs.length} señales</span>
          </summary>
          <div class="analysis-hub__assistant-list">
            ${renderNeedRows(needs, strategicPlan)}
          </div>
        </details>

        <details class="analysis-hub__assistant-card">
          <summary>
            <strong>Ruta recomendada</strong>
            <span>${topProfile ? 1 : 0} perfil</span>
          </summary>
          <div class="analysis-hub__assistant-list">
            ${renderProfileRows(strategicProfiles.slice(0, 1))}
            ${renderRecommendationRows(pickRecommendations.slice(0, 1), 'PICK')}
            ${renderRecommendationRows(banRecommendations.slice(0, 1), 'BAN')}
          </div>
        </details>
      </div>

      <details class="analysis-hub__assistant-footer">
        <summary>Ver detalle completo</summary>
        <div class="analysis-hub__assistant-list">
          ${renderNeedRows(needs, strategicPlan)}
          ${renderProfileRows(strategicProfiles)}
          ${renderRecommendationRows(pickRecommendations, 'CLASE')}
          ${renderRecommendationRows(banRecommendations, 'BAN')}
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

function renderExecutiveRows(primaryNeed, secondaryNeed, topProfile, topPick, topBan, strategicPlan = {}) {
  const rows = [];

  if (primaryNeed) {
    rows.push({
      title: `Prioridad · ${primaryNeed.label}`,
      text: clampWords(primaryNeed.impact || buildNeedImpact(primaryNeed, strategicPlan), 18),
      note: `Peso ${String(primaryNeed.score ?? 0)}/5 · ${priorityPrefix(primaryNeed.priority)}`,
    });
  }

  if (secondaryNeed) {
    rows.push({
      title: `Siguiente · ${secondaryNeed.label}`,
      text: clampWords(secondaryNeed.detail, 16),
      note: `Peso ${String(secondaryNeed.score ?? 0)}/5`,
    });
  }

  if (topProfile) {
    rows.push({
      title: `Perfil recomendado · ${topProfile.label}`,
      text: clampWords(topProfile.why || topProfile.detail || 'Encaja con el plan actual.', 18),
      note: `Confianza ${String(topProfile.confidence ?? 0)}/100`,
    });
  }

  if (topPick) {
    rows.push({
      title: `Pick · ${topPick.profileLabel || topPick.label}`,
      text: clampWords(topPick.detail, 18),
      note: `Confianza ${String(topPick.confidence ?? 0)}/100`,
    });
  }

  if (topBan) {
    rows.push({
      title: `Ban · ${topBan.label}`,
      text: clampWords(topBan.detail, 18),
      note: topBan.profileLabel ? `Perfil ${topBan.profileLabel}` : 'Evitar',
    });
  }

  if (!rows.length) {
    rows.push({
      title: 'Sin carencias claras',
      text: 'La composición está razonablemente alineada con su plan principal.',
      note: 'Motor estable',
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

  return needs.slice(0, 4).map((need) => `
    <article class="analysis-hub__row">
      <div class="analysis-hub__row-copy">
        <strong>${escapeHtml(priorityPrefix(need.priority))} · ${escapeHtml(need.label)}</strong>
        <p>${escapeHtml(clampWords(need.detail, 12))}</p>
        <p class="analysis-hub__row-note">Impacto: ${escapeHtml(clampWords(need.impact || buildNeedImpact(need, strategicPlan), 14))}</p>
      </div>
      <span class="analysis-hub__assistant-score">${escapeHtml(String(need.score ?? 0))}/5</span>
    </article>
  `).join('');
}

function renderProfileRows(profiles = []) {
  if (!profiles.length) {
    return `
      <article class="analysis-hub__row">
        <div class="analysis-hub__row-copy">
          <strong>Perfil flexible</strong>
          <p>La composición no muestra una especialización dominante todavía.</p>
        </div>
      </article>
    `;
  }

  return profiles.slice(0, 3).map((profile) => `
    <article class="analysis-hub__row">
      <div class="analysis-hub__row-copy">
        <strong>${escapeHtml(profile.label)}</strong>
        <p>${escapeHtml(clampWords(profile.detail, 14))}</p>
        <p class="analysis-hub__row-note">Por qué: ${escapeHtml(clampWords(profile.why || profile.impact || 'Encaja con el plan actual.', 14))}</p>
        ${Array.isArray(profile.relatedNeeds) && profile.relatedNeeds.length ? `<p class="analysis-hub__row-note">Señales: ${escapeHtml(profile.relatedNeeds.slice(0, 3).join(' · '))}</p>` : ''}
      </div>
      <span class="analysis-hub__assistant-score">${escapeHtml(confidencePrefix(profile.confidence))}<br>${escapeHtml(String(profile.confidence ?? 0))}/100</span>
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

  return items.slice(0, 3).map((item) => `
    <article class="analysis-hub__row">
      <div class="analysis-hub__row-copy">
        <strong>${escapeHtml(kind)} · ${escapeHtml(item.label)}</strong>
        <p>${escapeHtml(clampWords(item.detail, 14))}</p>
        ${item.profileLabel ? `<p class="analysis-hub__row-note">Perfil: ${escapeHtml(item.profileLabel)}</p>` : ''}
      </div>
      <span class="analysis-hub__assistant-score">${escapeHtml(priorityPrefix(item.priority || 'minor'))}</span>
    </article>
  `).join('');
}

function buildHeadline(needs, profiles, draftAssistant) {
  if (!needs.length) return 'La composición está bastante equilibrada.';

  const focus = draftAssistant?.summary ? clampWords(draftAssistant.summary, 10) : 'reforzar el plan';
  const profileFocus = profiles.length
    ? profiles.slice(0, 2).map((item) => item.label.toLowerCase()).join(' · ')
    : needs.slice(0, 2).map((item) => item.label.toLowerCase()).join(' · ');

  return `Foco: ${profileFocus} · ${focus}`;
}

function buildPlanLine(strategicPlan = {}) {
  const pieces = [strategicPlan?.fightStyle, strategicPlan?.mapFocus, strategicPlan?.tempo]
    .map((value) => String(value || '').trim())
    .filter(Boolean);
  return pieces.length ? pieces.join(' · ') : '';
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
