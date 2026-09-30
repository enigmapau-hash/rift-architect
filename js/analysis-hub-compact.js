import { analyzeComposition } from './analyzer.js';

const ROOT_ID = 'analysisHubView';
const SELECTOR = '#compositionGrid .slot.is-filled';
const ACTIONS = [
  { key: 'win', icon: '🎯', label: '¿Cómo gano?' },
  { key: 'risk', icon: '⚠️', label: '¿Qué me castiga?' },
  { key: 'init', icon: '🛡️', label: '¿Quién inicia?' },
  { key: 'priority', icon: '🏆', label: '¿Qué priorizo?' },
];

const state = { root: null, observer: null, scheduled: false, activeAction: 'win' };

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
        <p class="eyebrow">Sprint 13.5 · Panel de decisión</p>
        <h4>Completa los cinco campeones para ver el análisis</h4>
        <p>La lectura unificada aparece cuando la composición está completa.</p>
      </article>
    `;
    return;
  }

  const model = buildModel(analyzeComposition(selectedChampions), selectedChampions, state.activeAction);

  state.root.innerHTML = `
    <section class="analysis-hub__shell analysis-hub__shell--cards">
      <header class="analysis-hub__hero">
        <div class="analysis-hub__hero-copy">
          <p class="eyebrow">Sprint 13.5 · Panel de decisión</p>
          <h4>${escapeHtml(model.heroHeadline)}</h4>
          <p>${escapeHtml(model.summary)}</p>
        </div>
        <div class="analysis-hub__score-card ${toneByScore(model.score.overall)}">
          <span class="analysis-hub__score-kicker">Veredicto</span>
          <strong>${escapeHtml(model.score.grade)}</strong>
          <span>${escapeHtml(model.score.badge)}</span>
        </div>
      </header>

      <div class="analysis-hub__cards">
        ${renderDetailCard('📊', 'Veredicto', model.verdict.summary, model.verdict.badge, renderVerdictBody(model), 'analysis-hub__card--verdict')}
        ${renderDetailCard('🎯', 'Plan de partida', model.plan.summary, model.plan.badge, renderPlanBody(model), 'analysis-hub__card--plan')}
        ${renderDetailCard('⚠️', 'Riesgos', model.risks.summary, model.risks.badge, renderRiskBody(model), 'analysis-hub__card--risks')}
        ${renderDetailCard('⏱️', 'Timing', model.timing.summary, model.timing.badge, renderTimingBody(model), 'analysis-hub__card--timing')}
        ${renderDetailCard('🤖', 'Advisor', model.advisor.summary, model.advisor.badge, renderAdvisorBody(model), 'analysis-hub__card--advisor')}
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

function buildModel(analysis, selectedChampions, activeAction) {
  const coach = analysis?.coach || {};
  const advisor = analysis?.advisor || {};
  const priorities = buildPriorities(analysis, coach, advisor);
  const risks = buildRisks(analysis, coach, advisor);
  const phases = buildPhases(analysis, coach, advisor, priorities);
  const initiator = buildInitiator(selectedChampions);
  const metrics = buildMetrics(analysis, selectedChampions);
  const confidence = Number(analysis?.confidence) || 0;
  const coherence = Number(analysis?.coherence?.score) || 0;
  const execution = computeExecutionEase(selectedChampions) * 10;
  const overall = clamp(Math.round((confidence + coherence + execution) / 3), 0, 100);
  const grade = gradeFromScore(overall);
  const powerSpike = advisor?.summary?.powerSpike || phases[1]?.label || 'Mid Game';
  const primaryObjective = advisor?.primaryObjective || priorities[0]?.label || analysis?.winCondition?.label || analysis?.primaryIdentity || 'Jugar alrededor de la identidad';
  const response = buildAction(activeAction, { analysis, coach, advisor, priorities, risks, initiator, phases });
  const signal = buildSignal(analysis, coach, advisor, priorities, risks);

  return {
    heroHeadline: analysis?.primaryIdentity || 'Tu composición',
    summary: clampWords(analysis?.summaryText || advisor?.summary?.reason || 'La lectura unificada resume identidad, plan y riesgos.', 18),
    score: { grade, overall, badge: overall >= 85 ? 'Alta confianza' : overall >= 70 ? 'Confianza media-alta' : 'Necesita ajustes' },
    verdict: {
      summary: `${grade} · ${analysis?.coherence?.label || 'Lectura directa'}`,
      badge: overall >= 85 ? 'Draft muy sólido' : overall >= 70 ? 'Draft estable' : 'Draft mejorable',
      text: buildVerdictText(analysis, advisor, phases, risks),
      metrics,
      diagnostics: [
        { label: 'Identidad', score: Math.max(1, Math.round(confidence / 10)), detail: analysis?.primaryIdentity || 'Sin definir' },
        { label: 'Coherencia', score: Math.max(1, Math.round(coherence / 10)), detail: analysis?.coherence?.label || 'Sin definir' },
        { label: 'Win condition', score: Math.max(1, Math.round((Number(analysis?.winCondition?.score) || 60) / 10)), detail: analysis?.winCondition?.label || 'Sin definir' },
        { label: 'Tempo', score: Math.max(1, Math.round((Number(analysis?.tempoDetail?.confidence) || 60) / 10)), detail: analysis?.tempoDetail?.label || 'Sin definir' },
      ],
      chips: uniqueValues([analysis?.primaryIdentity, analysis?.winCondition?.label, analysis?.tempoDetail?.label]).slice(0, 3),
    },
    plan: {
      summary: primaryObjective,
      badge: primaryObjective === analysis?.primaryIdentity ? 'Juega tu identidad' : 'Plan claro',
      text: analysis?.winCondition?.detail || advisor?.summary?.reason || 'El plan debe seguir la identidad principal.',
      phases: phases.slice(0, 3),
      chips: uniqueValues([primaryObjective, powerSpike, initiator?.champion]).slice(0, 3),
    },
    risks: {
      summary: risks[0]?.label || 'Sin riesgo claro',
      badge: risks.length ? 'Vigilar' : 'Sin riesgo',
      text: risks[0]?.detail || 'No hay una debilidad crítica evidente.',
      items: risks,
    },
    timing: {
      summary: `${powerSpike} · ${phases[1]?.label || 'Mid Game'}`,
      badge: 'Timing',
      text: buildTimingText(analysis, advisor, phases),
      windows: phases,
      chips: uniqueValues([phases[0]?.label, phases[1]?.label, phases[2]?.label, powerSpike]).slice(0, 3),
    },
    advisor: {
      summary: response.title,
      badge: 'IA',
      text: response.text,
      why: response.why,
      chips: response.chips,
      insights: buildInsights(analysis, coach, advisor, priorities),
      actionHints: buildActionHints(analysis, coach, advisor, priorities, risks, initiator),
      signal,
      response,
    },
    activeAction,
  };
}

function renderDetailCard(icon, title, summary, badge, body, className = '') {
  return `
    <details class="analysis-hub__card ${className}">
      <summary class="analysis-hub__summary">
        <div class="analysis-hub__summary-head">
          <div class="analysis-hub__summary-copy">
            <span class="analysis-hub__card-kicker">${icon} ${escapeHtml(title)}</span>
            <strong>${escapeHtml(summary)}</strong>
          </div>
          <span class="analysis-hub__card-badge">${escapeHtml(badge)}</span>
        </div>
        <span class="analysis-hub__summary-hint">Ver detalles</span>
      </summary>
      <div class="analysis-hub__body">${body}</div>
    </details>
  `;
}

function renderVerdictBody(model) {
  return `
    <p class="analysis-hub__lead">${escapeHtml(model.verdict.text)}</p>
    <div class="analysis-hub__chip-list">${model.verdict.chips.map((chip) => `<span class="story-pill story-pill--info">${escapeHtml(chip)}</span>`).join('')}</div>
    <div class="analysis-hub__metric-list">${model.verdict.metrics.map(renderMetricRow).join('')}</div>
    <div class="analysis-hub__row-list">${model.verdict.diagnostics.map(renderLineRow).join('')}</div>
  `;
}

function renderPlanBody(model) {
  return `
    <p class="analysis-hub__lead">${escapeHtml(model.plan.text)}</p>
    <div class="analysis-hub__chip-list">${model.plan.chips.map((chip) => `<span class="story-pill story-pill--info">${escapeHtml(chip)}</span>`).join('')}</div>
    <div class="analysis-hub__list">${model.plan.phases.map(renderPhaseRow).join('')}</div>
  `;
}

function renderRiskBody(model) {
  return `
    <p class="analysis-hub__lead">${escapeHtml(model.risks.text)}</p>
    <div class="analysis-hub__list">${model.risks.items.map(renderLineRow).join('')}</div>
  `;
}

function renderTimingBody(model) {
  return `
    <p class="analysis-hub__lead">${escapeHtml(model.timing.text)}</p>
    <div class="analysis-hub__chip-list">${model.timing.chips.map((chip) => `<span class="story-pill story-pill--info">${escapeHtml(chip)}</span>`).join('')}</div>
    <div class="analysis-hub__list">${model.timing.windows.map(renderPhaseRow).join('')}</div>
  `;
}

function renderAdvisorBody(model) {
  return `
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
            <small>${escapeHtml(model.advisor.actionHints[action.key] || '')}</small>
          </span>
        </button>
      `).join('')}
    </div>

    <article class="analysis-hub__response-card analysis-hub__response-card--compact">
      <span class="analysis-hub__card-kicker">Respuesta contextual</span>
      <strong>${escapeHtml(model.advisor.response.title)}</strong>
      <p>${escapeHtml(model.advisor.response.text)}</p>
      <details class="analysis-hub__why">
        <summary>¿Por qué?</summary>
        <p>${escapeHtml(model.advisor.why)}</p>
      </details>
    </article>

    <div class="analysis-hub__chip-list">${model.advisor.chips.map((chip) => `<span class="story-pill story-pill--${chip.tone}">${escapeHtml(chip.label)}</span>`).join('')}</div>
    <div class="analysis-hub__list">${model.advisor.insights.map(renderLineRow).join('')}</div>
  `;
}

function renderMetricRow(metric) {
  return `
    <article class="analysis-hub__metric">
      <div class="analysis-hub__metric-head">
        <strong>${escapeHtml(metric.label)}</strong>
        <span>${metric.score}/100</span>
      </div>
      <div class="analysis-hub__metric-bar" aria-hidden="true"><div class="analysis-hub__metric-fill" style="--meter:${clamp(metric.score, 0, 100)}%"></div></div>
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

function buildMetrics(analysis, selectedChampions) {
  const execution = computeExecutionEase(selectedChampions) * 10;
  return [
    { label: 'Identidad', score: clamp(Math.round(Number(analysis?.confidence) || 0), 0, 100), detail: analysis?.primaryIdentity || 'Sin definir' },
    { label: 'Coherencia', score: clamp(Math.round(Number(analysis?.coherence?.score) || 0), 0, 100), detail: analysis?.coherence?.label || 'Sin definir' },
    { label: 'Victoria', score: clamp(Math.round(Number(analysis?.winCondition?.score) || 0), 0, 100), detail: analysis?.winCondition?.label || 'Sin definir' },
    { label: 'Tempo', score: clamp(Math.round(Number(analysis?.tempoDetail?.confidence) || 0), 0, 100), detail: analysis?.tempoDetail?.label || 'Sin definir' },
    { label: 'Ejecución', score: execution, detail: execution >= 80 ? 'Más sencilla' : execution >= 50 ? 'Exige coordinación' : 'Muy exigente' },
  ];
}

function buildPriorities(analysis, coach, advisor) {
  const items = uniqueValues([
    ...(Array.isArray(advisor?.objectivePriority) ? advisor.objectivePriority : []).map((item) => item?.label),
    ...(Array.isArray(coach?.priorities) ? coach.priorities : []).map((item) => item?.label),
    analysis?.winCondition?.label,
    analysis?.primaryIdentity,
  ]).filter(Boolean);

  return (items.length ? items : ['Jugar alrededor de la identidad']).slice(0, 3).map((label, index) => ({
    label,
    detail: buildPriorityDetail(label, analysis, index),
  }));
}

function buildPowerSpikes(analysis) {
  const phases = normalizeText(analysis?.tempoDetail?.label || analysis?.tempo || '');
  const win = normalizeText(analysis?.winCondition?.label || '');
  const labels = [];
  if (containsAny(phases, ['early'])) labels.push('Nivel 6');
  if (containsAny(phases, ['mid'])) labels.push('1 objeto');
  if (containsAny(phases, ['late']) || containsAny(win, ['escalar', 'protect', 'front to back', 'teamfight', '5v5'])) labels.push('2 objetos');
  if (containsAny(win, ['baron', 'objetivo', 'teamfight', 'control'])) labels.push('Barón');

  return uniqueValues(labels.length ? labels : ['Nivel 6', '2 objetos', 'Barón']).slice(0, 3).map((label) => ({
    label,
    detail:
      label === 'Nivel 6'
        ? 'La primera ventana fuerte para pelear suele llegar con definitivas.'
        : label === '1 objeto'
          ? 'El equipo empieza a pelear con más seguridad cuando se completa el primer pico.'
          : label === '2 objetos'
            ? 'El carry y la primera línea ya pueden forzar una pelea real.'
            : 'El cierre natural llega alrededor de la visión y del objetivo grande.',
  }));
}

function buildPhases(analysis, coach, advisor, priorities) {
  const phases = Array.isArray(coach?.phases) ? coach.phases : [];
  const fallback = [
    { label: 'Early', detail: 'Gana tiempo y controla visión.', actions: [] },
    { label: 'Mid Game', detail: 'Convierte la ventaja en objetivos.', actions: [] },
    { label: 'Late Game', detail: 'Cierra con carry protegido.', actions: [] },
  ];

  return fallback.map((fallbackPhase, index) => {
    const phase = phases[index] || {};
    return {
      label: fallbackPhase.label,
      detail: phase.detail || fallbackPhase.detail,
      actions: uniqueValues([
        ...(Array.isArray(phase.actions) ? phase.actions : []),
        priorities[index]?.label,
        advisor?.summary?.powerSpike,
        index === 0 ? analysis?.winCondition?.avoid?.[0] : null,
      ]).slice(0, 2),
    };
  });
}

function buildRisks(analysis, coach, advisor) {
  const items = uniqueValues([
    ...(Array.isArray(coach?.alerts) ? coach.alerts : []).map((item) => item?.label),
    ...(Array.isArray(advisor?.loseConditions) ? advisor.loseConditions : []).map((item) => item?.label),
    ...(Array.isArray(analysis?.weaknesses) ? analysis.weaknesses : []).map((item) => item?.label || item),
    ...(Array.isArray(analysis?.winCondition?.avoid) ? analysis.winCondition.avoid.map((item) => toLabel(item)) : []),
  ]).filter(Boolean);

  return (items.length ? items : ['Sin riesgo claro']).slice(0, 3).map((label) => ({
    label,
    detail: buildRiskDetail(label, analysis, coach),
  }));
}

function buildInitiator(selectedChampions) {
  const candidates = selectedChampions.map((champion) => {
    const text = [champion.champion, champion.identity, champion.function, champion.tempo, ...(Array.isArray(champion.strengths) ? champion.strengths : []), ...(Array.isArray(champion.weaknesses) ? champion.weaknesses : [])].filter(Boolean).join(' ').toLowerCase();
    let score = 0;
    const reasons = [];
    if (containsAny(text, ['engage', 'inici', 'start', 'entry', 'hook', 'pick'])) { score += 4; reasons.push('tiene herramientas para empezar'); }
    if (containsAny(text, ['cc', 'stun', 'knock', 'root', 'pull', 'immobil', 'silence'])) { score += 3; reasons.push('aporta control fiable'); }
    if (containsAny(text, ['frontline', 'tank', 'bruiser', 'support', 'engage'])) { score += 2; reasons.push('aguanta la primera línea'); }
    if (String(champion.role || '').toLowerCase() === 'support' || String(champion.role || '').toLowerCase() === 'jungle') { score += 1; reasons.push('suele marcar el ritmo'); }
    return { champion: champion.champion, role: champion.role, score, reason: reasons.join(' y ') || 'encaja con el plan de pelea', why: 'Busco la pieza con más engage, CC y capacidad de entrar sin desordenar la composición.' };
  });

  const best = candidates.sort((a, b) => b.score - a.score || a.champion.localeCompare(b.champion, 'es'))[0];
  if (!best || best.score < 3) return null;
  return best;
}

function buildAction(activeAction, context) {
  const { analysis, coach, advisor, priorities, risks, initiator, phases } = context;
  const topPriority = priorities[0] || null;
  const topRisk = risks[0] || null;
  const powerSpike = advisor?.summary?.powerSpike || coach?.summary?.powerSpike || 'tu ventana de poder';
  const primaryObjective = advisor?.primaryObjective || topPriority?.label || analysis?.winCondition?.label || analysis?.primaryIdentity || 'Jugar alrededor de la identidad';

  if (activeAction === 'risk') {
    return {
      title: topRisk?.label || 'Mayor riesgo castigado',
      text: topRisk?.detail || 'Forzar la pelea equivocada te hace perder la ventaja del draft.',
      why: uniqueValues([topRisk?.label, topRisk?.detail, coach?.summary?.risk, analysis?.coherence?.label, analysis?.winCondition?.avoid?.[0]]).join(' · ') || 'El riesgo sale de la coherencia del draft.',
      chips: uniqueValues([topRisk?.label, advisor?.summary?.risk, analysis?.coherence?.label, analysis?.winCondition?.avoid?.[0]]).map((label) => ({ label, tone: 'danger' })),
    };
  }

  if (activeAction === 'init') {
    return {
      title: initiator?.champion ? `${initiator.champion} debe iniciar` : 'Iniciación por orden',
      text: initiator?.champion ? `${initiator.champion} es tu mejor punto de entrada porque ${initiator.reason}.` : 'La iniciación debe venir del campeón con más engage y control.',
      why: initiator?.why || 'Busco la pieza que mejor abre la pelea sin romper la estructura.',
      chips: uniqueValues([initiator?.champion, initiator?.role, coach?.summary?.identity, analysis?.primaryIdentity]).map((label) => ({ label, tone: 'info' })),
    };
  }

  if (activeAction === 'priority') {
    return {
      title: topPriority?.label || primaryObjective,
      text: topPriority?.detail || `${primaryObjective} es la prioridad inmediata del draft.`,
      why: uniqueValues([topPriority?.label, topPriority?.detail, coach?.summary?.priority, phases[0]?.detail, analysis?.tempoDetail?.label]).join(' · ') || 'La prioridad se ordena por identidad, tempo y ventana de poder.',
      chips: uniqueValues([topPriority?.label, powerSpike, phases[0]?.label, phases[1]?.label]).map((label) => ({ label, tone: 'info' })),
    };
  }

  return {
    title: primaryObjective,
    text: analysis?.winCondition?.detail || 'Tu composición gana jugando a su identidad principal.',
    why: uniqueValues([advisor?.summary?.identity, advisor?.summary?.powerSpike, analysis?.tempoDetail?.label, analysis?.winCondition?.label, coach?.summary?.priority, coach?.summary?.reason]).join(' · ') || 'La respuesta sale del análisis del motor.',
    chips: uniqueValues([primaryObjective, powerSpike, analysis?.tempoDetail?.label, analysis?.coherence?.label]).map((label) => ({ label, tone: 'success' })),
  };
}

function buildActionHints(analysis, coach, advisor, priorities, risks, initiator) {
  return {
    win: advisor?.summary?.reason || coach?.summary?.reason || 'Cómo convertir el plan en victoria',
    risk: risks[0]?.detail || 'Qué castiga más a esta composición',
    init: initiator?.champion ? `${initiator.champion} encaja con la iniciación` : 'Quién abre mejor la pelea',
    priority: priorities[0]?.detail || coach?.summary?.priority || 'Qué priorizar ahora mismo',
  };
}

function buildSignal(analysis, coach, advisor, priorities, risks) {
  const title = advisor?.primaryObjective || coach?.headline || analysis?.primaryIdentity || 'Señal principal';
  const text = advisor?.summary?.reason || coach?.summary?.reason || analysis?.summaryText || 'La aplicación condensa el análisis en una sola idea fácil de seguir.';
  const chips = uniqueValues([coach?.summary?.powerSpike, coach?.summary?.priority, coach?.summary?.risk, priorities[0]?.label, risks[0]?.label]).map((label) => ({ label, tone: 'info' }));
  return { title, text, chips };
}

function buildInsights(analysis, coach, advisor, priorities) {
  const items = [
    ...(Array.isArray(coach?.insights) ? coach.insights : []).slice(0, 2).map((item) => ({ label: item?.label, detail: item?.detail || 'Señal que refuerza la lectura del motor.' })),
    ...(Array.isArray(advisor?.objectivePriority) ? advisor.objectivePriority : []).slice(0, 1).map((item) => ({ label: item?.label, detail: item?.detail || 'Prioridad del plan.' })),
    { label: analysis?.primaryIdentity || 'Juega tu identidad', detail: analysis?.summaryText || 'La lectura general de la composición sigue esta línea.' },
    { label: priorities[0]?.label || 'Prioridad principal', detail: priorities[0]?.detail || 'La recomendación más importante del draft.' },
  ];
  return uniqueByLabel(items).slice(0, 3);
}

function buildVerdictText(analysis, advisor, phases, risks) {
  return [
    analysis?.winCondition?.detail || analysis?.summaryText || 'La composición se entiende como una historia visual.',
    advisor?.summary?.powerSpike ? `Tu ventana más importante llega en ${advisor.summary.powerSpike}.` : null,
    phases[1]?.detail ? `Momento fuerte: ${phases[1].detail}` : null,
    risks[0]?.label ? `Mayor riesgo: ${risks[0].label}.` : null,
  ].filter(Boolean).slice(0, 3).join(' ');
}

function buildTimingText(analysis, advisor, phases) {
  const powerSpike = advisor?.summary?.powerSpike || 'tu ventana de poder';
  return `${analysis?.tempoDetail?.label || 'Timing'}. ${phases[0]?.detail || ''} ${phases[1]?.detail || ''} ${phases[2]?.detail || ''} Pico principal: ${powerSpike}.`;
}

function buildPriorityDetail(label, analysis, index) {
  const normalized = normalizeText(label);
  if (normalized.includes('teamfight') || normalized.includes('5v5')) return 'Convierte la ventaja en pelea ordenada.';
  if (normalized.includes('objetiv') || normalized.includes('objective')) return 'Prioriza dragones, Heraldo o Barón según el momento.';
  if (normalized.includes('pick') || normalized.includes('catch')) return 'Busca visión y castiga errores rápidos.';
  if (normalized.includes('splitpush') || normalized.includes('sidelane')) return 'Abre mapa y obliga respuestas en laterales.';
  if (normalized.includes('poke') || normalized.includes('siege')) return 'Desgasta antes de comprometer la pelea.';
  if (index === 0) return analysis?.winCondition?.detail || 'Debe ser la primera decisión del plan.';
  return 'Se apoya en la condición de victoria general del draft.';
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
  return detailMap.find(([key]) => normalized.includes(key))?.[1] || coach?.summary?.risk || analysis?.winCondition?.avoid?.[0] || 'Puede romper el plan principal.';
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
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function escapeHtml(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function clampWords(text, maxWords = 12) {
  const words = String(text || '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  return words.slice(0, maxWords).join(' ');
}

function computeExecutionEase(selectedChampions) {
  const complexTerms = ['exigente', 'técnico', 'tecnico', 'difícil', 'dificil', 'caótico', 'caotico', 'mecánico', 'mecanico', 'preciso'];
  const complexityHits = selectedChampions.reduce((total, champion) => {
    const text = [champion.champion, champion.identity, champion.function, champion.tempo].filter(Boolean).join(' ').toLowerCase();
    return total + (complexTerms.some((term) => text.includes(term)) ? 1 : 0);
  }, 0);
  return clamp(10 - complexityHits * 2, 1, 10);
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
