import { analyzeComposition } from './analyzer.js';

const ROOT_ID = 'analysisExplainabilityView';
const SELECTOR = '#compositionGrid .slot.is-filled';
const SECTION_ORDER = ['summary', 'identity', 'tempo', 'winCondition', 'draft', 'risks'];

const state = {
  root: null,
  observer: null,
  scheduled: false,
  activeSection: 'summary',
};

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
  root.className = 'analysis-explainability';
  root.setAttribute('aria-live', 'polite');

  const hubRoot = document.getElementById('analysisHubView');
  const anchor = hubRoot || storyView;
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
  const explanation = analysis?.explanation || analysis?.explainability || {};
  const sections = buildSections(analysis, explanation);
  const activeKey = SECTION_ORDER.includes(state.activeSection) ? state.activeSection : sections[0]?.key || 'summary';
  const activeSection = sections.find((section) => section.key === activeKey) || sections[0];
  state.activeSection = activeSection?.key || 'summary';

  state.root.innerHTML = `
    <section class="analysis-explainability__shell">
      <header class="analysis-explainability__hero">
        <div class="analysis-explainability__hero-copy">
          <p class="eyebrow">Explain Engine</p>
          <h4>Por qué la IA llega a esta conclusión</h4>
          <p>La lectura del motor se convierte en evidencias, pesos y confianza para que puedas revisar el razonamiento paso a paso.</p>
          <div class="analysis-explainability__signal-row">
            ${uniqueValues([analysis?.primaryIdentity, analysis?.tempoDetail?.label, analysis?.winCondition?.label, analysis?.coherence?.label, ...(analysis?.explanation?.signals || [])]).slice(0, 6).map((signal) => `<span class="story-pill story-pill--info">${escapeHtml(signal)}</span>`).join('')}
          </div>
        </div>

        <div class="analysis-explainability__score-card ${toneByScore(Number(explanation.confidence) || Number(analysis?.confidence) || 0)}">
          <span class="analysis-explainability__score-kicker">Confianza global</span>
          <strong>${escapeHtml(labelFromConfidence(explanation.confidence || analysis?.confidence || 0))}</strong>
          <span>${escapeHtml(String(Math.round(Number(explanation.confidence) || Number(analysis?.confidence) || 0)))}%</span>
        </div>
      </header>

      <div class="analysis-explainability__body">
        <div class="analysis-explainability__tabs" role="tablist" aria-label="Explorador de explicación">
          ${sections.map((section) => `
            <button
              type="button"
              class="analysis-explainability__tab ${section.key === activeSection.key ? 'is-active' : ''}"
              role="tab"
              aria-selected="${section.key === activeSection.key ? 'true' : 'false'}"
              data-explainability-section="${section.key}"
            >
              <span class="analysis-explainability__tab-label">${escapeHtml(section.label)}</span>
              <strong>${escapeHtml(section.title)}</strong>
              <small>${escapeHtml(section.confidenceLabel)} · ${escapeHtml(String(section.confidence))}%</small>
            </button>
          `).join('')}
        </div>

        <article class="analysis-explainability__detail">
          <div class="analysis-explainability__detail-head">
            <div>
              <span class="analysis-explainability__card-kicker">${escapeHtml(activeSection.label)}</span>
              <strong>${escapeHtml(activeSection.title)}</strong>
            </div>
            <span class="story-pill story-pill--${toneByScore(activeSection.confidence)}">${escapeHtml(activeSection.confidenceLabel)} · ${escapeHtml(String(activeSection.confidence))}%</span>
          </div>

          <p class="analysis-explainability__detail-copy">${escapeHtml(activeSection.detail)}</p>

          <div class="analysis-explainability__meter" aria-hidden="true">
            <span style="width:${clamp(activeSection.confidence, 0, 100)}%"></span>
          </div>

          <p class="analysis-explainability__reason">${escapeHtml(activeSection.reason)}</p>

          ${activeSection.champions.length ? `
            <div class="analysis-explainability__chips">
              ${activeSection.champions.map((champion) => `<span class="story-pill story-pill--neutral">${escapeHtml(champion)}</span>`).join('')}
            </div>
          ` : ''}

          ${activeSection.evidence.length ? `
            <div class="analysis-explainability__evidence-list">
              ${activeSection.evidence.map((item) => `
                <article class="analysis-explainability__evidence-item">
                  <div class="analysis-explainability__evidence-head">
                    <strong>${escapeHtml(item.label || item.source || 'Evidencia')}</strong>
                    <span>${escapeHtml(String(item.weight || 0))}</span>
                  </div>
                  <p>${escapeHtml(item.detail || item.source || 'Sin detalle')}</p>
                  ${Array.isArray(item.champions) && item.champions.length ? `<div class="analysis-explainability__chips">${item.champions.map((champion) => `<span class="story-pill story-pill--info">${escapeHtml(champion)}</span>`).join('')}</div>` : ''}
                </article>
              `).join('')}
            </div>
          ` : ''}
        </article>
      </div>
    </section>
  `;

  state.root.querySelectorAll('[data-explainability-section]').forEach((button) => {
    button.addEventListener('click', () => {
      state.activeSection = String(button.dataset.explainabilitySection || 'summary');
      renderPanel();
    });
  });
}

function buildSections(analysis, explanation) {
  const summaryConfidence = Number(explanation.confidence) || Number(analysis?.confidence) || 0;
  const identity = explanation.identity || {};
  const tempo = explanation.tempo || {};
  const coherence = explanation.coherence || {};
  const winCondition = explanation.winCondition || {};
  const synergies = Array.isArray(explanation.synergies) ? explanation.synergies : [];
  const dependencies = Array.isArray(explanation.dependencies) ? explanation.dependencies : [];
  const draftAssistant = analysis?.draftAssistant || {};
  const pick = Array.isArray(draftAssistant.pickRecommendations) ? draftAssistant.pickRecommendations[0] : null;
  const ban = Array.isArray(draftAssistant.banRecommendations) ? draftAssistant.banRecommendations[0] : null;

  const summaryEvidence = uniqueItems([
    ...(identity.evidence || []),
    ...(tempo.evidence || []),
    ...(winCondition.evidence || []),
  ]).slice(0, 4);

  return [
    {
      key: 'summary',
      label: 'Resumen',
      title: analysis?.primaryIdentity || 'Lectura global',
      detail: analysis?.summaryText || 'La síntesis del motor reúne identidad, tempo y condición de victoria.',
      confidence: summaryConfidence,
      confidenceLabel: labelFromConfidence(summaryConfidence),
      reason: uniqueValues([identity.reason, tempo.reason, winCondition.reason]).join(' · ') || 'La lectura global combina identidad, ritmo y cierre.',
      champions: uniqueValues([...(identity.champions || []), ...(tempo.champions || []), ...(winCondition.champions || [])]).slice(0, 4),
      evidence: summaryEvidence,
    },
    {
      key: 'identity',
      label: 'Identidad',
      title: identity.label || analysis?.primaryIdentity || 'Identidad principal',
      detail: identity.detail || 'La composición gira alrededor de esta identidad.',
      confidence: identity.confidence || summaryConfidence,
      confidenceLabel: identity.confidenceLabel || labelFromConfidence(identity.confidence || summaryConfidence),
      reason: identity.reason || 'Las sinergias y los campeones empujan esta lectura.',
      champions: identity.champions || [],
      evidence: identity.evidence || [],
    },
    {
      key: 'tempo',
      label: 'Tempo',
      title: tempo.label || analysis?.tempo || 'Tempo de partida',
      detail: tempo.detail || 'El ritmo de la composición define cuándo ganar tiempo y cuándo pelear.',
      confidence: tempo.confidence || summaryConfidence,
      confidenceLabel: tempo.confidenceLabel || labelFromConfidence(tempo.confidence || summaryConfidence),
      reason: tempo.reason || 'La curva de poder y las fases dan forma a esta lectura.',
      champions: tempo.champions || [],
      evidence: tempo.evidence || [],
    },
    {
      key: 'winCondition',
      label: 'Victoria',
      title: winCondition.label || analysis?.winCondition?.label || 'Condición de victoria',
      detail: winCondition.detail || analysis?.winCondition?.detail || 'El motor ya tiene un camino principal para cerrar la partida.',
      confidence: winCondition.confidence || summaryConfidence,
      confidenceLabel: winCondition.confidenceLabel || labelFromConfidence(winCondition.confidence || summaryConfidence),
      reason: winCondition.reason || 'La condición de victoria nace del conjunto de señales más sólidas.',
      champions: winCondition.champions || [],
      evidence: winCondition.evidence || [],
    },
    {
      key: 'draft',
      label: 'Draft',
      title: pick?.label || 'Picks y bans',
      detail: pick?.detail || draftAssistant?.summary || 'El draft traduce las necesidades en picks y bans concretos.',
      confidence: pick?.confidence || summaryConfidence,
      confidenceLabel: pick?.confidenceLabel || labelFromConfidence(pick?.confidence || summaryConfidence),
      reason: uniqueValues([pick?.action, pick?.profileLabel, ban?.detail]).join(' · ') || 'El draft se resuelve a partir de necesidades y perfiles.',
      champions: uniqueValues([...(pick?.classTags || []), ...(ban?.classTags || [])]).slice(0, 4),
      evidence: uniqueItems([
        ...(pick
          ? [{ label: pick.label || 'Pick recomendado', detail: pick.detail || '', weight: pick.confidence || 0, champions: pick.classTags || [] }]
          : []),
        ...(ban
          ? [{ label: ban.label || 'Ban recomendado', detail: ban.detail || '', weight: Math.max(0, (ban.confidence || 0) - 10), champions: ban.classTags || [] }]
          : []),
      ]).slice(0, 4),
    },
    {
      key: 'risks',
      label: 'Riesgos',
      title: coherence.label || 'Riesgos y fricción',
      detail: coherence.detail || 'La coherencia marca qué fricciones pueden romper el plan.',
      confidence: coherence.confidence || coherence.score || summaryConfidence,
      confidenceLabel: coherence.confidenceLabel || labelFromConfidence(coherence.confidence || coherence.score || summaryConfidence),
      reason: coherence.reason || 'Los conflictos, dependencias y huecos hacen visible el riesgo real.',
      champions: uniqueValues([...(coherence.champions || []), ...(dependencies[0]?.champions || [])]).slice(0, 4),
      evidence: uniqueItems([
        ...(coherence.evidence || []),
        ...(dependencies[0]?.evidence || []),
        ...(synergies[0]?.evidence || []),
      ]).slice(0, 4),
    },
  ];
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

function labelFromConfidence(score = 0) {
  const value = clamp(Math.round(Number(score) || 0), 0, 100);
  if (value >= 85) return 'Muy alta';
  if (value >= 70) return 'Alta';
  if (value >= 55) return 'Media';
  return 'Baja';
}

function toneByScore(score = 0) {
  const value = clamp(Math.round(Number(score) || 0), 0, 100);
  if (value >= 85) return 'is-good';
  if (value >= 70) return 'is-mid';
  return 'is-low';
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function uniqueValues(values = []) {
  return [...new Set(values.filter(Boolean).map((value) => String(value).trim()).filter(Boolean))];
}

function uniqueItems(items = []) {
  const seen = new Set();
  const result = [];
  items.forEach((item) => {
    const key = normalizeKey(item?.label || item?.source || item?.detail || JSON.stringify(item));
    if (!key || seen.has(key)) return;
    seen.add(key);
    result.push(item);
  });
  return result;
}

function normalizeKey(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function escapeHtml(value) {
  if (typeof globalThis.escapeHtml === 'function') {
    return globalThis.escapeHtml(value);
  }

  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
