import { analyzeComposition } from './analyzer.js';

const ROOT_ID = 'analysisTacticalView';
const SELECTOR = '#compositionGrid .slot.is-filled';

const state = {
  root: null,
  observer: null,
  scheduled: false,
};

globalThis.renderTacticalPanel = renderPanel;

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

  const explainabilityRoot = document.getElementById('analysisExplainabilityView');
  const anchor = explainabilityRoot || storyView;
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
  const coach = unified?.coach || analysis?.coach || {};
  const tactical = buildTacticalLayer(analysis, coach);

  state.root.innerHTML = `
    <section class="analysis-explainability__shell">
      <header class="analysis-explainability__hero">
        <div class="analysis-explainability__hero-copy">
          <p class="eyebrow">Tactical Intelligence</p>
          <h4>Qué decisión tomar ahora mismo</h4>
          <p>Convierte el plan en una acción concreta y deja una alternativa clara si la ventana se cierra.</p>
          <div class="analysis-explainability__signal-row">
            ${uniqueValues(tactical.signals).slice(0, 6).map((signal) => `<span class="story-pill story-pill--info">${escapeHtml(signal)}</span>`).join('')}
          </div>
        </div>

        <div class="analysis-explainability__score-card ${toneByScore(tactical.confidence)}">
          <span class="analysis-explainability__score-kicker">Confianza táctica</span>
          <strong>${escapeHtml(tactical.label)}</strong>
          <span>${escapeHtml(String(tactical.confidence))}%</span>
        </div>
      </header>

      <div class="analysis-explainability__body">
        <article class="analysis-explainability__detail">
          <div class="analysis-explainability__detail-head">
            <div>
              <span class="analysis-explainability__card-kicker">Decisión</span>
              <strong>${escapeHtml(tactical.headline)}</strong>
            </div>
            <span class="story-pill story-pill--${toneByScore(tactical.confidence)}">${escapeHtml(tactical.modeLabel)}</span>
          </div>

          <p class="analysis-explainability__detail-copy">${escapeHtml(tactical.summary)}</p>

          <div class="analysis-explainability__meter" aria-hidden="true">
            <span style="width:${clamp(tactical.confidence, 0, 100)}%"></span>
          </div>

          <p class="analysis-explainability__reason">${escapeHtml(tactical.reason)}</p>

          ${tactical.champions.length ? `
            <div class="analysis-explainability__chips">
              ${tactical.champions.map((champion) => `<span class="story-pill story-pill--neutral">${escapeHtml(champion)}</span>`).join('')}
            </div>
          ` : ''}

          ${renderDecisionTree(tactical.tree)}
          ${renderDecisionCards(tactical.decisions)}
        </article>
      </div>
    </section>
  `;
}

function renderDecisionTree(nodes = []) {
  if (!nodes.length) return '';

  return `
    <div class="analysis-explainability__recommendation-evidence">
      ${nodes.map((node) => `
        <article class="analysis-explainability__recommendation-evidence-item">
          <div class="analysis-explainability__evidence-head">
            <strong>${escapeHtml(node.step || 'Paso')}</strong>
            <span>${escapeHtml(String(node.confidence || 0))}%</span>
          </div>
          <p>${escapeHtml(node.detail || '')}</p>
          ${node.fallback ? `<p>${escapeHtml(`Si no: ${node.fallback}`)}</p>` : ''}
        </article>
      `).join('')}
    </div>
  `;
}

function renderDecisionCards(decisions = []) {
  if (!decisions.length) return '';

  return `
    <div class="analysis-explainability__recommendation-stack">
      ${decisions.map((item, index) => {
        const tone = toneByScore(item.confidence || 0);
        const priorityLabel = index === 0 ? 'Crítica' : index === 1 ? 'Importante' : 'Opcional';
        return `
          <article class="analysis-explainability__recommendation-card analysis-explainability__recommendation-card--${tone}">
            <div class="analysis-explainability__recommendation-head">
              <div>
                <span class="analysis-explainability__card-kicker">${escapeHtml(priorityLabel)}</span>
                <strong>${escapeHtml(item.action || 'Decisión')}</strong>
                <p class="analysis-explainability__recommendation-priority">${escapeHtml(item.phase || '')}</p>
              </div>
              <div class="analysis-explainability__score-card ${tone}">
                <span class="analysis-explainability__score-kicker">Impacto</span>
                <strong>${escapeHtml(item.confidenceLabel || labelFromConfidence(item.confidence || 0))}</strong>
                <span>${escapeHtml(String(item.confidence || 0))}%</span>
              </div>
            </div>

            <p class="analysis-explainability__recommendation-reason">${escapeHtml(item.reason || '')}</p>

            <div class="analysis-explainability__meter" aria-hidden="true">
              <span style="width:${clamp(item.confidence || 0, 0, 100)}%"></span>
            </div>

            ${item.blockedBy ? `
              <div class="analysis-explainability__alert-list">
                <article class="analysis-explainability__alert-item">
                  <strong>Si te lo niegan</strong>
                  <p>${escapeHtml(item.blockedBy)}</p>
                </article>
              </div>
            ` : ''}

            ${item.evidence.length ? `
              <div class="analysis-explainability__recommendation-evidence">
                ${item.evidence.slice(0, 3).map((entry) => `
                  <article class="analysis-explainability__recommendation-evidence-item">
                    <div class="analysis-explainability__evidence-head">
                      <strong>${escapeHtml(entry.label || entry.source || 'Evidencia')}</strong>
                      <span>${escapeHtml(String(entry.weight || 0))}</span>
                    </div>
                    <p>${escapeHtml(entry.detail || entry.source || '')}</p>
                  </article>
                `).join('')}
              </div>
            ` : ''}

            ${item.affectedChampions.length ? `
              <div class="analysis-explainability__chips">
                ${item.affectedChampions.map((champion) => `<span class="story-pill story-pill--info">${escapeHtml(champion)}</span>`).join('')}
              </div>
            ` : ''}
          </article>
        `;
      }).join('')}
    </div>
  `;
}

function buildTacticalLayer(analysis, coach) {
  const priorities = toArray(coach?.priorities || analysis?.priorities || []);
  const phases = toArray(coach?.phases || []);
  const risks = toArray(coach?.risks || []);
  const powerSpikes = toArray(coach?.powerSpikes || []);
  const mode = String(coach?.mode || 'hybrid');
  const modeLabel = mode === 'frontToBack' ? 'Front to back' : mode === 'poke' ? 'Poke' : mode === 'pick' ? 'Pick' : mode === 'splitpush' ? 'Splitpush' : mode === 'scaling' ? 'Escalado' : 'Flexible';

  const primaryAction = toText(priorities[0]?.label || analysis?.winCondition?.label || analysis?.primaryIdentity || 'Jugar la identidad');
  const secondaryAction = toText(priorities[1]?.label || phases[1]?.title || 'Preparar la siguiente ventana');
  const riskAction = toText(risks[0]?.label || analysis?.coherence?.label || 'Sin riesgo claro');
  const spike = toText(powerSpikes[0]?.label || 'Pico relevante');

  const decisions = [
    {
      action: `Forzar ${primaryAction}`,
      phase: phases[0]?.phase || 'Early',
      reason: toText(priorities[0]?.detail || coach?.summary?.priority || analysis?.winCondition?.detail || 'Es la decisión que mejor convierte la identidad en ventaja real.'),
      confidence: scoreFromText([primaryAction, priorities[0]?.detail, coach?.summary?.priority]),
      confidenceLabel: labelFromConfidence(scoreFromText([primaryAction, priorities[0]?.detail, coach?.summary?.priority])),
      blockedBy: `Si no puedes forzar ${primaryAction.toLowerCase()}, toma visión y prepara ${secondaryAction.toLowerCase()}.`,
      evidence: makeEvidence(priorities[0], spike, analysis?.coherence?.label),
      affectedChampions: uniqueValues([coach?.summary?.identity, coach?.summary?.priority, analysis?.primaryIdentity]).slice(0, 4),
    },
    {
      action: `Convertir ${spike}`,
      phase: phases[1]?.phase || 'Mid',
      reason: toText(phases[1]?.detail || coach?.summary?.powerSpike || 'La ventana de poder debe transformarse en objetivo o mapa.');
      confidence: scoreFromText([spike, phases[1]?.detail, coach?.summary?.powerSpike]),
      confidenceLabel: labelFromConfidence(scoreFromText([spike, phases[1]?.detail, coach?.summary?.powerSpike])),
      blockedBy: `Si el rival te niega ${spike.toLowerCase()}, juega corto y devuelve la presión a objetivos secundarios.`,
      evidence: makeEvidence(powerSpikes[0], phases[1], analysis?.summaryText),
      affectedChampions: uniqueValues([coach?.summary?.powerSpike, coach?.summary?.priority, analysis?.winCondition?.label]).slice(0, 4),
    },
    {
      action: `Evitar ${riskAction}`,
      phase: phases[2]?.phase || 'Late',
      reason: toText(risks[0]?.detail || coach?.summary?.risk || 'La victoria depende de no regalar el punto débil más castigable.'),
      confidence: scoreFromText([riskAction, risks[0]?.detail, coach?.summary?.risk]),
      confidenceLabel: labelFromConfidence(scoreFromText([riskAction, risks[0]?.detail, coach?.summary?.risk])),
      blockedBy: `Si el riesgo aparece, reduce la pelea a una sola ventana y vuelve a la condición de victoria principal.`,
      evidence: makeEvidence(risks[0], coach?.summary?.risk, analysis?.coherence?.detail),
      affectedChampions: uniqueValues([analysis?.coherence?.label, riskAction, coach?.summary?.risk]).slice(0, 4),
    },
  ].map((item) => ({
    ...item,
    evidence: item.evidence.filter(Boolean).slice(0, 4),
    affectedChampions: item.affectedChampions.filter(Boolean),
  }));

  const tree = [
    {
      step: 'Decisión principal',
      detail: decisions[0].action,
      confidence: decisions[0].confidence,
      fallback: decisions[1].action,
    },
    {
      step: 'Si no hay ventana',
      detail: decisions[1].action,
      confidence: decisions[1].confidence,
      fallback: decisions[2].action,
    },
    {
      step: 'Si se complica',
      detail: decisions[2].action,
      confidence: decisions[2].confidence,
      fallback: `Vuelve a ${primaryAction.toLowerCase()}`,
    },
  ];

  const headline = decisions[0].action;
  const summary = `${decisions[0].action} · ${decisions[1].action} · ${decisions[2].action}`;
  const signals = uniqueValues([
    modeLabel,
    primaryAction,
    secondaryAction,
    riskAction,
    spike,
    coach?.summary?.identity,
    coach?.summary?.risk,
  ]);

  const confidence = clamp(Math.round((decisions.reduce((sum, item) => sum + item.confidence, 0) / decisions.length) || analysis?.confidence || 0), 0, 100);

  return {
    mode,
    modeLabel,
    headline,
    summary,
    reason: coach?.briefing || analysis?.summaryText || 'La decisión táctica traduce el plan en una acción concreta.',
    label: labelFromConfidence(confidence),
    confidence,
    decisions,
    tree,
    signals,
    champions: uniqueValues([coach?.summary?.identity, coach?.summary?.priority, coach?.summary?.risk, coach?.summary?.powerSpike]).slice(0, 4),
  };
}

function makeEvidence(priority, spike, coherenceLabel) {
  return [
    priority ? { label: priority.label || 'Prioridad', detail: priority.detail || '', weight: priority.score || priority.rank || 0, champions: [] } : null,
    spike ? { label: toText(spike.label || spike), detail: 'Ventana de poder disponible', weight: 3, champions: [] } : null,
    coherenceLabel ? { label: toText(coherenceLabel), detail: 'Coherencia de la composición', weight: 2, champions: [] } : null,
  ].filter(Boolean);
}

function scoreFromText(values = []) {
  const joined = values.filter(Boolean).map((value) => String(value)).join(' ');
  const len = joined.length;
  if (!len) return 65;
  return clamp(45 + Math.min(50, Math.round(len / 8)), 0, 100);
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
