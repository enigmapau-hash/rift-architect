import { analyzeComposition } from './analyzer.js';

const ROOT_ID = 'analysisExplainabilityView';
const SELECTOR = '#compositionGrid .slot.is-filled';
const SECTION_ORDER = ['summary', 'identity', 'tempo', 'winCondition', 'draft', 'risks', 'recommendations'];

const state = {
  root: null,
  observer: null,
  scheduled: false,
  activeSection: 'summary',
};

init().catch((error) => console.error(error));

globalThis.renderExplainabilityPanel = renderPanel;

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
  const unified = analysis?.model || analysis?.unified || analysis?.analysisModel || {};
  const explanation = unified?.explainability || analysis?.explanation || analysis?.explainability || {};
  const sections = buildSections(analysis, unified, explanation);
  const activeKey = SECTION_ORDER.includes(state.activeSection) ? state.activeSection : sections[0]?.key || 'summary';
  const activeSection = sections.find((section) => section.key === activeKey) || sections[0];
  state.activeSection = activeSection?.key || 'summary';

  state.root.innerHTML = `
    <section class="analysis-explainability__shell">
      <header class="analysis-explainability__hero">
        <div class="analysis-explainability__hero-copy">
          <p class="eyebrow">Explain Engine</p>
          <h4>Por qué la IA llega a esta conclusión</h4>
          <p>La lectura del motor se convierte en evidencias, pesos, confianza y recomendaciones para revisar el razonamiento paso a paso.</p>
          <div class="analysis-explainability__signal-row">
            ${uniqueValues([analysis?.primaryIdentity, analysis?.tempoDetail?.label, analysis?.winCondition?.label, analysis?.coherence?.label, ...(explanation?.signals || [])])
              .slice(0, 6)
              .map((signal) => `<span class="story-pill story-pill--info">${escapeHtml(signal)}</span>`)
              .join('')}
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
          ${sections
            .map(
              (section) => `
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
          `
            )
            .join('')}
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

          ${activeSection.champions?.length ? `
            <div class="analysis-explainability__chips">
              ${activeSection.champions.map((champion) => `<span class="story-pill story-pill--neutral">${escapeHtml(champion)}</span>`).join('')}
            </div>
          ` : ''}

          ${activeSection.key === 'recommendations' ? renderRecommendationHub(activeSection.recommendations || [], unified) : ''}

          ${activeSection.key !== 'recommendations' && activeSection.evidence?.length ? `
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

function renderRecommendationHub(recommendations = [], unified = {}) {
  if (!recommendations.length) {
    return `
      <div class="analysis-explainability__recommendation-empty">
        <p>No hay recomendaciones estructuradas todavía.</p>
      </div>
    `;
  }

  return `
    <div class="analysis-explainability__recommendation-stack">
      ${recommendations.map((item, index) => renderRecommendationCard(item, index, unified)).join('')}
    </div>
  `;
}

function renderRecommendationCard(item, index, unified = {}) {
  const tone = toneByScore(item.confidence || 0);
  const metrics = Array.isArray(item.metrics) ? item.metrics : [];
  const evidence = Array.isArray(item.evidence) ? item.evidence : [];
  const champions = uniqueValues([...(item.affectedChampions || []), ...(item.evidence || []).flatMap((evidenceItem) => evidenceItem.champions || [])]).slice(0, 6);
  const priorityLabel = index === 0 ? 'Más importante' : item.priority >= 85 ? 'Muy recomendable' : item.priority >= 70 ? 'Situacional' : 'Opcional';

  return `
    <article class="analysis-explainability__recommendation-card analysis-explainability__recommendation-card--${tone}">
      <div class="analysis-explainability__recommendation-head">
        <div>
          <span class="analysis-explainability__card-kicker">${escapeHtml(item.category || 'recommendation')}</span>
          <strong>${escapeHtml(item.action || 'Recomendación')}</strong>
          <p class="analysis-explainability__recommendation-priority">${escapeHtml(priorityLabel)}</p>
        </div>
        <div class="analysis-explainability__score-card ${tone}">
          <span class="analysis-explainability__score-kicker">Confianza</span>
          <strong>${escapeHtml(item.confidenceLabel || labelFromConfidence(item.confidence || 0))}</strong>
          <span>${escapeHtml(String(item.confidence || 0))}%</span>
        </div>
      </div>

      <p class="analysis-explainability__recommendation-reason">${escapeHtml(item.reason || 'Sin detalle disponible.')}</p>

      <div class="analysis-explainability__meter" aria-hidden="true">
        <span style="width:${clamp(item.confidence || 0, 0, 100)}%"></span>
      </div>

      ${champions.length ? `
        <div class="analysis-explainability__chips">
          ${champions.map((champion) => `<span class="story-pill story-pill--neutral">${escapeHtml(champion)}</span>`).join('')}
        </div>
      ` : ''}

      ${metrics.length ? `
        <div class="analysis-explainability__metric-row">
          ${metrics.map((metric) => `
            <span class="analysis-explainability__metric-pill">
              ${escapeHtml(metric.label)} <strong>${escapeHtml(String(metric.score))}</strong>
            </span>
          `).join('')}
        </div>
      ` : ''}

      ${evidence.length ? `
        <div class="analysis-explainability__recommendation-evidence">
          ${evidence.slice(0, 3).map((evidenceItem) => `
            <article class="analysis-explainability__recommendation-evidence-item">
              <div class="analysis-explainability__evidence-head">
                <strong>${escapeHtml(evidenceItem.label || evidenceItem.source || 'Evidencia')}</strong>
                <span>${escapeHtml(String(evidenceItem.weight || 0))}</span>
              </div>
              <p>${escapeHtml(evidenceItem.detail || evidenceItem.source || 'Sin detalle')}</p>
            </article>
          `).join('')}
        </div>
      ` : ''}

      ${item.affectedChampions?.length ? `
        <div class="analysis-explainability__chips">
          ${item.affectedChampions.map((champion) => `<span class="story-pill story-pill--info">${escapeHtml(champion)}</span>`).join('')}
        </div>
      ` : ''}
    </article>
  `;
}

function buildSections(analysis, unified, explanation) {
  const summaryConfidence = Number(explanation.confidence) || Number(analysis?.confidence) || 0;
  const identity = explanation.identity || {};
  const tempo = explanation.tempo || {};
  const coherence = explanation.coherence || {};
  const winCondition = explanation.winCondition || {};
  const synergies = Array.isArray(explanation.synergies) ? explanation.synergies : [];
  const dependencies = Array.isArray(explanation.dependencies) ? explanation.dependencies : [];
  const draftAssistant = analysis?.draftAssistant || {};
  const recommendationItems = normalizeRecommendationList(unified?.draft?.recommendations || analysis?.recommendations || draftAssistant?.recommendations || []);
  const topRecommendation = recommendationItems[0] || null;
  const pick = Array.isArray(draftAssistant.pickRecommendations) ? draftAssistant.pickRecommendations[0] : null;
  const ban = Array.isArray(draftAssistant.banRecommendations) ? draftAssistant.banRecommendations[0] : null;

  const summaryEvidence = uniqueItems([...(identity.evidence || []), ...(tempo.evidence || []), ...(winCondition.evidence || [])]).slice(0, 4);

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
      evidence: uniqueItems([...(coherence.evidence || []), ...(dependencies[0]?.evidence || []), ...(synergies[0]?.evidence || [])]).slice(0, 4),
    },
    {
      key: 'recommendations',
      label: 'Acción',
      title: topRecommendation?.action || unified?.draft?.recommendationSummary || 'Recommendation Hub',
      detail: unified?.draft?.recommendationSummary || 'Las recomendaciones se ordenan por impacto, confianza y evidencia.',
      confidence: topRecommendation?.confidence || summaryConfidence,
      confidenceLabel: topRecommendation?.confidenceLabel || labelFromConfidence(topRecommendation?.confidence || summaryConfidence),
      reason: 'Ordenadas por prioridad, confianza y evidencia. Cada bloque muestra la acción, la razón y el soporte del motor.',
      champions: uniqueValues(recommendationItems.flatMap((item) => item.affectedChampions || [])).slice(0, 4),
      evidence: uniqueItems(recommendationItems.flatMap((item) => item.evidence || [])).slice(0, 4),
      recommendations: recommendationItems.slice(0, 5),
    },
  ];
}

function normalizeRecommendationList(items = []) {
  return toArray(items)
    .map((item) => ({
      id: toText(item?.id || item?.key || item?.action || item?.label || 'recommendation'),
      category: toText(item?.category || 'general'),
      priority: clamp(Math.round(Number(item?.priority) || 0), 1, 100),
      confidence: clamp(Math.round(Number(item?.confidence) || 0), 0, 100),
      confidenceLabel: toText(item?.confidenceLabel || labelFromConfidence(item?.confidence || 0)),
      action: toText(item?.action || item?.label || 'Recomendación'),
      reason: toText(item?.reason || 'Sin detalle disponible.'),
      evidence: normalizeEvidence(item?.evidence || []),
      affectedChampions: uniqueValues(toArray(item?.affectedChampions).map((champion) => toText(champion))).slice(0, 6),
      metrics: toArray(item?.metrics).map((metric) => ({
        key: toText(metric?.key || metric?.label || 'metric'),
        label: toText(metric?.label || metric?.key || 'Métrica'),
        score: clamp(Math.round(Number(metric?.score) || 0), 0, 100),
      })),
    }))
    .sort((a, b) => b.priority - a.priority || b.confidence - a.confidence)
    .filter((item, index, list) => list.findIndex((candidate) => candidate.id === item.id) === index);
}

function normalizeEvidence(items = []) {
  return toArray(items)
    .map((item) => ({
      source: toText(item?.source || item?.label || item?.name || item),
      label: toText(item?.label || item?.title || item?.name || item?.source || item),
      detail: toText(item?.detail || item?.text || item?.summary || ''),
      weight: clamp(Math.round(Number(item?.weight) || 0), 0, 100),
      champions: uniqueValues(toArray(item?.champions).map((champion) => toText(champion))).slice(0, 4),
    }))
    .filter((item) => item.label || item.detail || item.source);
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

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function toText(value, fallback = 'Sin definir') {
  if (value == null) return fallback;
  if (typeof value === 'string') return value.trim() || fallback;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map((item) => toText(item, '')).filter(Boolean).join(' · ') || fallback;
  if (typeof value === 'object') {
    return toText(
      value.label ?? value.name ?? value.title ?? value.text ?? value.value ?? value.detail ?? value.summary ?? value.reason ?? value.description ?? value.champion ?? value.item ?? '',
      fallback
    );
  }
  return String(value) || fallback;
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
