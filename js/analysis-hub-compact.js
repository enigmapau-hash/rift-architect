import { analyzeComposition } from './analyzer.js';

const ROOT_ID = 'analysisHubView';
const SELECTOR = '#compositionGrid .slot.is-filled';

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
  root.className = 'analysis-hub analysis-hub--compact';
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
        <p class="eyebrow">Sprint 13.5 · Analysis Hub</p>
        <h4>Completa los cinco campeones para ver el análisis</h4>
        <p>La lectura unificada aparece cuando la composición está completa.</p>
      </article>
    `;
    return;
  }

  const analysis = analyzeComposition(selectedChampions);
  const model = buildModel(analysis, selectedChampions, state.activeAction);

  state.root.innerHTML = `
    <section class="analysis-hub__shell analysis-hub__shell--compact">
      <div class="analysis-hub__hero">
        <div class="analysis-hub__hero-copy">
          <p class="eyebrow">Sprint 13.5 · Analysis Hub</p>
          <h4>${escapeHtml(model.heroHeadline)}</h4>
          <p>${escapeHtml(model.summary)}</p>
          <div class="analysis-hub__verdict">
            <span class="story-pill story-pill--${toneByGrade(model.grade)}">${escapeHtml(model.verdictBadge)}</span>
            <strong>${escapeHtml(model.verdictHeadline)}</strong>
            <p>${escapeHtml(model.verdictText)}</p>
          </div>
        </div>

        <div class="analysis-hub__score-card ${toneByScore(model.overall)}">
          <span class="analysis-hub__score-kicker">Hub score</span>
          <strong>${model.grade} · ${model.overall}</strong>
          <span>${escapeHtml(model.scoreBadge)}</span>
        </div>
      </div>

      <div class="analysis-hub__metric-strip">
        ${model.metrics.map(renderMetricCard).join('')}
      </div>

      <div class="analysis-hub__main">
        <article class="analysis-hub__panel analysis-hub__panel--plan">
          <span class="analysis-hub__card-kicker">Plan de partida</span>
          <div class="analysis-hub__row analysis-hub__row--lead">
            <div class="analysis-hub__row-copy">
              <strong>${escapeHtml(model.plan.title)}</strong>
              <p>${escapeHtml(model.plan.text)}</p>
              <details class="analysis-hub__why">
                <summary>¿Por qué?</summary>
                <p>${escapeHtml(model.plan.why)}</p>
              </details>
            </div>
            <span class="analysis-hub__row-score">${escapeHtml(model.plan.badge)}</span>
          </div>

          <div class="analysis-hub__chip-list">
            ${model.plan.chips.map((chip) => `<span class="story-pill story-pill--${chip.tone}">${escapeHtml(chip.label)}</span>`).join('')}
          </div>

          <div class="analysis-hub__mini-grid">
            ${model.phases.map(renderPhaseCard).join('')}
          </div>
        </article>

        <article class="analysis-hub__panel analysis-hub__panel--advisor">
          <span class="analysis-hub__card-kicker">Rift Advisor</span>
          <div class="analysis-hub__actions" role="tablist" aria-label="Acciones del asesor">
            ${ACTIONS.map((action) => `
              <button
                class="analysis-hub__action ${action.key === model.activeAction ? 'is-active' : ''}"
                type="button"
                role="tab"
                aria-selected="${action.key === model.activeAction ? 'true' : 'false'}"
                data-hub-action="${action.key}"
              >
                <span class="analysis-hub__action-icon">${action.icon}</span>
                <span class="analysis-hub__action-copy">
                  <strong>${escapeHtml(action.label)}</strong>
                  <small>${escapeHtml(model.actionHints[action.key] || '')}</small>
                </span>
              </button>
            `).join('')}
          </div>

          <div class="analysis-hub__response-grid">
            <article class="analysis-hub__response-card">
              <span class="analysis-hub__card-kicker">Respuesta contextual</span>
              <strong>${escapeHtml(model.response.title)}</strong>
              <p>${escapeHtml(model.response.text)}</p>
              <details class="analysis-hub__why">
                <summary>¿Por qué?</summary>
                <p>${escapeHtml(model.response.why)}</p>
              </details>
              <div class="analysis-hub__chip-list">
                ${model.response.chips.map((chip) => `<span class="story-pill story-pill--${chip.tone}">${escapeHtml(chip.label)}</span>`).join('')}
              </div>
            </article>

            <article class="analysis-hub__response-card analysis-hub__response-card--compact">
              <span class="analysis-hub__card-kicker">Señal principal</span>
              <strong>${escapeHtml(model.signal.title)}</strong>
              <p>${escapeHtml(model.signal.text)}</p>
              <div class="analysis-hub__chip-list">
                ${model.signal.chips.map((chip) => `<span class="story-pill story-pill--info">${escapeHtml(chip)}</span>`).join('')}
              </div>
            </article>
          </div>
        </article>
      </div>

      <div class="analysis-hub__footer-grid">
        <article class="analysis-hub__panel">
          <span class="analysis-hub__card-kicker">Señales que sostienen el consejo</span>
          <div class="analysis-hub__list">
            ${model.insights.map(renderLineRow).join('')}
          </div>
        </article>

        <article class="analysis-hub__panel analysis-hub__panel--danger">
          <span class="analysis-hub__card-kicker">Alertas a vigilar</span>
          <div class="analysis-hub__list">
            ${model.alerts.map(renderLineRow).join('')}
          </div>
        </article>
      </div>
    </section>
  `;

  state.root.querySelectorAll('[data-hub-action]').forEach((button) => {
    button.addEventListener('click', () => {
      state.activeAction = String(button.dataset.hubAction || 'win');
      renderHub();
    });
  });
}

function collectSelectedChampions() {
  return [...document.querySelectorAll(SELECTOR)]
    .map((slot) => {
      const role = String(slot.dataset.role || 'top');
      const champion = slot.querySelector('.slot__name')?.textContent?.trim() || '';
      const identity = slot.querySelector('.slot__meta')?.textContent?.trim() || '';
      const functionText = slot.querySelector('.champion-item__sub')?.textContent?.trim() || '';
      const tempo = slot.querySelector('.slot__tempo')?.textContent?.trim() || '';

      return {
        role,
        champion,
        identity,
        function: functionText,
        tempo,
        strengths: [],
        weaknesses: [],
      };
    })
    .filter((champion) => champion.champion);
}

function buildModel(analysis, selectedChampions, activeAction) {
  const coach = analysis?.coach || {};
  const advisor = analysis?.advisor || {};
  const objectivePriority = Array.isArray(advisor?.objectivePriority) && advisor.objectivePriority.length
    ? advisor.objectivePriority
    : Array.isArray(coach?.priorities) && coach.priorities.length
      ? coach.priorities
      : [];
  const phases = Array.isArray(coach?.phases) && coach.phases.length ? coach.phases : buildFallbackPhases();
  const risks = buildRisks(analysis, coach, advisor);
  const initiator = buildInitiator(selectedChampions);
  const metrics = buildMetrics(analysis, selectedChampions);
  const overall = Math.round(metrics.reduce((sum, metric) => sum + metric.score, 0) / metrics.length);
  const grade = gradeFromScore(overall);
  const primaryObjective = advisor?.primaryObjective || objectivePriority[0]?.label || analysis?.winCondition?.label || analysis?.primaryIdentity || 'Jugar alrededor de la identidad';

  return {
    heroHeadline: analysis?.primaryIdentity || 'Tu composición',
    summary: analysis?.summaryText || advisor?.summary?.reason || 'La lectura unificada resume identidad, plan y riesgos en un vistazo.',
    verdictBadge: overall >= 85 ? 'Draft muy sólido' : overall >= 70 ? 'Draft estable' : 'Draft mejorable',
    verdictHeadline: analysis?.winCondition?.label || analysis?.coherence?.label || 'Lectura del draft',
    verdictText: buildVerdictText(analysis, advisor, phases, risks),
    grade,
    overall,
    scoreBadge: overall >= 85 ? 'Alta confianza' : overall >= 70 ? 'Confianza media-alta' : 'Necesita ajustes',
    metrics,
    plan: {
      title: primaryObjective,
      text: analysis?.winCondition?.detail || advisor?.summary?.reason || 'El plan debe seguir la identidad principal.',
      why: uniqueValues([
        analysis?.coherence?.label,
        analysis?.tempoDetail?.label,
        analysis?.winCondition?.label,
        advisor?.summary?.powerSpike,
      ]).join(' · ') || 'La recomendación sale del análisis del motor.',
      badge: overall >= 80 ? 'Fuerte' : 'Sensible',
      chips: uniqueValues([
        primaryObjective,
        advisor?.summary?.powerSpike,
        phases[1]?.label,
        phases[0]?.label,
      ]).map((label) => ({ label, tone: 'info' })),
    },
    phases: phases.slice(0, 3),
    actionHints: buildActionHints(analysis, coach, advisor, objectivePriority, risks, initiator),
    response: buildAction(activeAction, { analysis, coach, advisor, objectivePriority, risks, initiator, phases }),
    signal: buildSignal(analysis, coach, advisor, objectivePriority, risks),
    insights: buildInsights(analysis, coach, advisor, objectivePriority),
    alerts: risks,
    activeAction,
  };
}

function buildMetrics(analysis, selectedChampions) {
  const execution = computeExecutionEase(selectedChampions);

  return [
    {
      label: 'Identidad',
      score: clamp(Math.round(Number(analysis?.confidence) || 0), 0, 100),
      detail: analysis?.primaryIdentity || 'Sin definir',
    },
    {
      label: 'Coherencia',
      score: clamp(Math.round(Number(analysis?.coherence?.score) || 0), 0, 100),
      detail: analysis?.coherence?.label || 'Sin definir',
    },
    {
      label: 'Victoria',
      score: clamp(Math.round(Number(analysis?.winCondition?.score) || 0), 0, 100),
      detail: analysis?.winCondition?.label || 'Sin definir',
    },
    {
      label: 'Tempo',
      score: clamp(Math.round(Number(analysis?.tempoDetail?.confidence) || 0), 0, 100),
      detail: analysis?.tempoDetail?.label || 'Sin definir',
    },
    {
      label: 'Ejecución',
      score: execution * 10,
      detail: execution >= 8 ? 'Más sencilla' : execution >= 5 ? 'Exige coordinación' : 'Muy exigente',
    },
  ];
}

function buildAction(activeAction, context) {
  const { analysis, coach, advisor, objectivePriority, risks, initiator, phases } = context;
  const topPriority = objectivePriority[0] || null;
  const topRisk = risks[0] || null;
  const powerSpike = advisor?.summary?.powerSpike || coach?.summary?.powerSpike || 'tu ventana de poder';
  const primaryObjective = advisor?.primaryObjective || topPriority?.label || analysis?.winCondition?.label || analysis?.primaryIdentity || 'Jugar alrededor de la identidad';

  switch (activeAction) {
    case 'risk':
      return {
        title: topRisk?.label || 'Mayor riesgo',
        text: topRisk?.detail || 'Forzar la pelea equivocada te hace perder la ventaja del draft.',
        why: uniqueValues([
          topRisk?.label,
          coach?.summary?.risk,
          analysis?.coherence?.label,
          analysis?.winCondition?.avoid?.[0],
        ]).join(' · ') || 'El riesgo sale de la coherencia del draft.',
        chips: uniqueValues([
          topRisk?.label,
          advisor?.summary?.risk,
          analysis?.coherence?.label,
          analysis?.winCondition?.avoid?.[0],
        ]).map((label) => ({ label, tone: 'danger' })),
      };
    case 'init':
      return {
        title: initiator?.champion ? `${initiator.champion} debe iniciar` : 'Iniciación por orden',
        text: initiator?.champion
          ? `${initiator.champion} es tu mejor punto de entrada porque ${initiator.reason}.`
          : 'La iniciación debe venir del campeón con más engage y control.',
        why: initiator?.why || 'Busco la pieza que mejor abre la pelea sin romper la estructura.',
        chips: uniqueValues([
          initiator?.champion,
          initiator?.role,
          coach?.summary?.identity,
          analysis?.primaryIdentity,
        ]).map((label) => ({ label, tone: 'info' })),
      };
    case 'priority':
      return {
        title: topPriority?.label || primaryObjective,
        text: topPriority?.detail || `${primaryObjective} es la prioridad inmediata del draft.`,
        why: uniqueValues([
          topPriority?.label,
          topPriority?.detail,
          coach?.summary?.priority,
          phases[0]?.detail,
          analysis?.tempoDetail?.label,
        ]).join(' · ') || 'La prioridad se ordena por identidad, tempo y ventana de poder.',
        chips: uniqueValues([
          topPriority?.label,
          powerSpike,
          phases[0]?.label,
          phases[1]?.label,
        ]).map((label) => ({ label, tone: 'info' })),
      };
    case 'win':
    default:
      return {
        title: primaryObjective,
        text: analysis?.winCondition?.detail || 'Tu composición gana jugando a su identidad principal.',
        why: uniqueValues([
          advisor?.summary?.identity,
          advisor?.summary?.powerSpike,
          analysis?.tempoDetail?.label,
          analysis?.winCondition?.label,
          coach?.summary?.priority,
          coach?.summary?.reason,
        ]).join(' · ') || 'La respuesta sale del análisis del motor.',
        chips: uniqueValues([
          primaryObjective,
          powerSpike,
          analysis?.tempoDetail?.label,
          analysis?.coherence?.label,
        ]).map((label) => ({ label, tone: 'success' })),
      };
  }
}

function buildActionHints(analysis, coach, advisor, objectivePriority, risks, initiator) {
  return {
    win: advisor?.summary?.reason || coach?.summary?.reason || 'Cómo convertir el plan en victoria',
    risk: risks[0]?.detail || 'Qué castiga más a esta composición',
    init: initiator?.champion ? `${initiator.champion} encaja con la iniciación` : 'Quién abre mejor la pelea',
    priority: objectivePriority[0]?.detail || coach?.summary?.priority || 'Qué priorizar ahora mismo',
  };
}

function buildSignal(analysis, coach, advisor, objectivePriority, risks) {
  const title = advisor?.primaryObjective || coach?.headline || analysis?.primaryIdentity || 'Señal principal';
  const text = advisor?.summary?.reason || coach?.summary?.reason || analysis?.summaryText || 'La aplicación condensa el análisis en una sola idea fácil de seguir.';
  const chips = uniqueValues([
    coach?.summary?.powerSpike,
    coach?.summary?.priority,
    coach?.summary?.risk,
    objectivePriority[0]?.label,
    risks[0]?.label,
  ]).map((label) => ({ label, tone: 'info' }));

  return { title, text, chips };
}

function buildInsights(analysis, coach, advisor, objectivePriority) {
  const items = [
    ...(Array.isArray(coach?.insights) ? coach.insights : []).slice(0, 2).map((item) => ({
      label: item?.label,
      detail: item?.detail || 'Señal que refuerza la lectura del motor.',
    })),
    ...(Array.isArray(advisor?.objectivePriority) ? advisor.objectivePriority : []).slice(0, 1).map((item) => ({
      label: item?.label,
      detail: item?.detail || 'Prioridad del plan.',
    })),
    {
      label: analysis?.primaryIdentity || 'Juega tu identidad',
      detail: analysis?.summaryText || 'La lectura general de la composición sigue esta línea.',
    },
  ];

  return uniqueByLabel(items).slice(0, 3);
}

function buildRisks(analysis, coach, advisor) {
  const items = uniqueValues([
    ...(Array.isArray(coach?.alerts) ? coach.alerts : []).map((item) => item?.label),
    ...(Array.isArray(advisor?.loseConditions) ? advisor.loseConditions : []).map((item) => item?.label),
    ...(Array.isArray(analysis?.weaknesses) ? analysis.weaknesses : []).map((item) => item?.label || item),
    ...(Array.isArray(analysis?.winCondition?.avoid) ? analysis.winCondition.avoid.map((item) => toLabel(item)) : []),
  ]).filter(Boolean);

  return items.slice(0, 3).map((label) => ({
    label,
    detail: buildRiskDetail(label, analysis, coach),
  }));
}

function buildRiskDetail(label, analysis, coach) {
  const normalized = normalizeText(label);
  const detailMap = [
    ['splitpush', 'Divides la presión y enfrías el 5v5.'],
    ['poke', 'Te obliga a gastar vida y recursos antes de empezar.'],
    ['engage', 'Una mala entrada te deja sin plan.'],
    ['teamfight', 'Si peleas desordenado, pierdes tu condición principal.'],
    ['vision', 'Sin visión el pick pierde valor.'],
    ['frontline', 'Falta espacio para que el carry pegue.'],
    ['peel', 'El carry queda expuesto demasiado pronto.'],
    ['late', 'Forzar antes del pico de poder te castiga.'],
    ['early', 'La partida puede volverse incómoda si no ganas tiempo.'],
  ];

  const match = detailMap.find(([key]) => normalized.includes(key));
  if (match) return match[1];
  return coach?.summary?.risk || analysis?.winCondition?.avoid?.[0] || 'Puede romper el plan principal.';
}

function buildVerdictText(analysis, advisor, phases, risks) {
  const parts = [
    analysis?.winCondition?.detail || analysis?.summaryText || 'La composición se entiende como una historia visual.',
    advisor?.summary?.powerSpike ? `Tu ventana más importante llega en ${advisor.summary.powerSpike}.` : null,
    phases[1]?.detail ? `Momento fuerte: ${phases[1].detail}` : null,
    risks[0]?.label ? `Mayor riesgo: ${risks[0].label}.` : null,
  ].filter(Boolean);

  return parts.slice(0, 3).join(' ');
}

function renderMetricCard(metric) {
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

function renderPhaseCard(phase) {
  return `
    <article class="analysis-hub__mini-card">
      <span class="analysis-hub__card-kicker">${escapeHtml(phase.label)}</span>
      <strong>${escapeHtml(phase.detail)}</strong>
      <div class="analysis-hub__chip-list">
        ${(Array.isArray(phase.actions) ? phase.actions : []).slice(0, 2).map((action) => `<span class="story-pill story-pill--info">${escapeHtml(action)}</span>`).join('')}
      </div>
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
    </div>
  `;
}

function buildFallbackPhases() {
  return [
    { label: 'Early', detail: 'Gana tiempo y controla visión.', actions: [] },
    { label: 'Mid Game', detail: 'Convierte la ventaja en objetivos.', actions: [] },
    { label: 'Late Game', detail: 'Cierra con carry protegido.', actions: [] },
  ];
}

function buildInitiator(selectedChampions) {
  const candidates = selectedChampions.map((champion) => {
    const text = [
      champion.champion,
      champion.identity,
      champion.function,
      champion.tempo,
      ...(Array.isArray(champion.strengths) ? champion.strengths : []),
      ...(Array.isArray(champion.weaknesses) ? champion.weaknesses : []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    let score = 0;
    const reasons = [];

    if (containsAny(text, ['engage', 'inici', 'start', 'entry', 'hook', 'pick'])) {
      score += 4;
      reasons.push('tiene herramientas para empezar');
    }
    if (containsAny(text, ['cc', 'stun', 'knock', 'root', 'pull', 'immobil', 'silence'])) {
      score += 3;
      reasons.push('aporta control fiable');
    }
    if (containsAny(text, ['frontline', 'tank', 'bruiser', 'support', 'engage'])) {
      score += 2;
      reasons.push('aguanta la primera línea');
    }
    if (String(champion.role || '').toLowerCase() === 'support' || String(champion.role || '').toLowerCase() === 'jungle') {
      score += 1;
      reasons.push('suele marcar el ritmo');
    }

    return {
      champion: champion.champion,
      role: champion.role,
      score,
      reason: reasons.join(' y ') || 'encaja con el plan de pelea',
      why: 'Busco la pieza con más engage, CC y capacidad de entrar sin desordenar la composición.',
    };
  });

  const best = candidates.sort((a, b) => b.score - a.score || a.champion.localeCompare(b.champion, 'es'))[0];
  if (!best || best.score < 3) return null;
  return best;
}

function computeExecutionEase(selectedChampions) {
  const complexTerms = ['exigente', 'técnico', 'tecnico', 'difícil', 'dificil', 'caótico', 'caotico', 'mecánico', 'mecanico', 'preciso'];
  const complexityHits = selectedChampions.reduce((total, champion) => {
    const text = [champion.champion, champion.identity, champion.function, champion.tempo].filter(Boolean).join(' ').toLowerCase();
    return total + (complexTerms.some((term) => text.includes(term)) ? 1 : 0);
  }, 0);

  return clamp(10 - complexityHits * 2, 1, 10);
}

function uniqueByLabel(items = []) {
  const seen = new Set();
  const result = [];

  items.forEach((item) => {
    const label = String(item?.label || '').trim();
    if (!label) return;
    const key = normalizeText(label);
    if (seen.has(key)) return;
    seen.add(key);
    result.push({ ...item, label });
  });

  return result;
}

function uniqueValues(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function containsAny(text, terms = []) {
  const normalized = normalizeText(text);
  return terms.some((term) => normalized.includes(normalizeText(term)));
}

function toLabel(value, fallback = '') {
  if (value == null) return fallback;
  if (typeof value === 'string') return value.trim() || fallback;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map((item) => toLabel(item, '')).filter(Boolean).join(' · ') || fallback;
  if (typeof value === 'object') {
    return toLabel(value.label ?? value.name ?? value.title ?? value.text ?? value.value ?? value.detail ?? value.summary ?? value.reason ?? value.description ?? value.item ?? '', fallback);
  }
  return String(value) || fallback;
}

function normalizeText(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toneByScore(score) {
  if (score >= 85) return 'is-good';
  if (score >= 70) return 'is-mid';
  return 'is-low';
}

function toneByGrade(grade) {
  if (String(grade).startsWith('A')) return 'success';
  if (String(grade).startsWith('B')) return 'info';
  return 'warning';
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
