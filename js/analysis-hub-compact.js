import { analyzeComposition } from './analyzer.js';

const ROOT_ID = 'analysisHubView';
const SELECTOR = '#compositionGrid .slot.is-filled';

const ACTIONS = [
  { key: 'win', icon: '🎯', label: '¿Cómo gano?' },
  { key: 'risk', icon: '⚠️', label: '¿Qué me castiga?' },
  { key: 'init', icon: '🛡️', label: '¿Quién inicia?' },
  { key: 'priority', icon: '🏆', label: '¿Qué priorizo?' },
];

const CARD_ORDER = [
  { id: 'verdict', icon: '📊', title: 'Veredicto' },
  { id: 'plan', icon: '🎯', title: 'Plan de partida' },
  { id: 'risks', icon: '⚠️', title: 'Riesgos' },
  { id: 'timing', icon: '⏱️', title: 'Timing' },
  { id: 'advisor', icon: '🤖', title: 'Advisor' },
];

const state = {
  root: null,
  observer: null,
  scheduled: false,
  activeAction: 'win',
  expandedCard: null,
  bound: false,
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

      <div class="analysis-hub__metric-strip">
        ${model.metrics.map(renderMetricCard).join('')}
      </div>

      <div class="analysis-hub__cards">
        ${CARD_ORDER.map((card) => renderCard(card, model, state.expandedCard === card.id)).join('')}
      </div>
    </section>
  `;

  if (!state.bound) {
    state.root.addEventListener('click', handleHubClick);
    state.bound = true;
  }
}

function handleHubClick(event) {
  const toggle = event.target.closest('[data-hub-card]');
  if (toggle) {
    const cardId = String(toggle.dataset.hubCard || '');
    state.expandedCard = state.expandedCard === cardId ? null : cardId;
    renderHub();
    return;
  }

  const action = event.target.closest('[data-hub-action]');
  if (action) {
    state.activeAction = String(action.dataset.hubAction || 'win');
    renderHub();
  }
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
    summary: clampWords(analysis?.summaryText || advisor?.summary?.reason || 'La lectura unificada resume identidad, plan y riesgos.', 14),
    score: {
      grade,
      overall,
      badge: overall >= 85 ? 'Alta confianza' : overall >= 70 ? 'Confianza media-alta' : 'Necesita ajustes',
    },
    metrics,
    sections: {
      verdict: {
        summary: `${grade} · ${analysis?.coherence?.label || 'Lectura clara'}`,
        badge: overall >= 85 ? 'Draft muy sólido' : overall >= 70 ? 'Draft estable' : 'Draft mejorable',
        lead: buildVerdictText(analysis, advisor, phases, risks),
        chips: uniqueValues([analysis?.primaryIdentity, analysis?.winCondition?.label, analysis?.tempoDetail?.label]).slice(0, 3),
        metrics,
        diagnostics: [
          { label: 'Identidad', score: Math.max(1, Math.round(confidence / 10)), detail: analysis?.primaryIdentity || 'Sin definir' },
          { label: 'Coherencia', score: Math.max(1, Math.round(coherence / 10)), detail: analysis?.coherence?.label || 'Sin definir' },
          { label: 'Win condition', score: Math.max(1, Math.round((Number(analysis?.winCondition?.score) || 60) / 10)), detail: analysis?.winCondition?.label || 'Sin definir' },
        ],
      },
      plan: {
        summary: primaryObjective,
        badge: primaryObjective === analysis?.primaryIdentity ? 'Juega tu identidad' : 'Plan claro',
        lead: analysis?.winCondition?.detail || advisor?.summary?.reason || 'El plan debe seguir la identidad principal.',
        chips: uniqueValues([primaryObjective, powerSpike, initiator?.champion]).slice(0, 3),
        phases: phases.slice(0, 3),
      },
      risks: {
        summary: risks[0]?.label || 'Sin riesgo claro',
        badge: risks.length ? 'Vigilar' : 'Sin riesgo',
        lead: risks[0]?.detail || 'No hay una debilidad crítica evidente.',
        items: risks,
      },
      timing: {
        summary: `${powerSpike} · ${phases[1]?.label || 'Mid Game'}`,
        badge: 'Timing',
        lead: buildTimingText(analysis, advisor, phases),
        chips: uniqueValues([phases[0]?.label, phases[1]?.label, phases[2]?.label, powerSpike]).slice(0, 3),
        windows: phases,
      },
      advisor: {
        summary: response.title,
        badge: 'IA',
        lead: response.text,
        why: response.why,
        chips: response.chips,
        insights: buildInsights(analysis, coach, advisor, priorities),
        actionHints: buildActionHints(analysis, coach, advisor, priorities, risks, initiator),
        signal,
        response,
      },
    },
    activeAction,
  };
}

function renderCard(card, model, isOpen) {
  const section = model.sections[card.id];
  const bodyId = `hub-card-body-${card.id}`;

  return `
    <section class="analysis-hub__card analysis-hub__card--${card.id} ${isOpen ? 'is-open' : ''}">
      <button
        class="analysis-hub__card-toggle"
        type="button"
        data-hub-card="${card.id}"
        aria-expanded="${isOpen ? 'true' : 'false'}"
        aria-controls="${bodyId}"
      >
        <div class="analysis-hub__card-title-block">
          <span class="analysis-hub__card-kicker">${card.icon} ${escapeHtml(card.title)}</span>
          <strong>${escapeHtml(section.summary)}</strong>
        </div>
        <div class="analysis-hub__card-meta">
          <span class="analysis-hub__card-badge">${escapeHtml(section.badge)}</span>
          <span class="analysis-hub__toggle-hint">${isOpen ? 'Ocultar' : 'Ver más'}</span>
        </div>
      </button>
      <div id="${bodyId}" class="analysis-hub__card-body" ${isOpen ? '' : 'hidden'}>
        ${renderCardBody(card.id, model)}
      </div>
    </section>
  `;
}

function renderCardBody(cardId, model) {
  switch (cardId) {
    case 'verdict':
      return renderVerdictBody(model);
    case 'plan':
      return renderPlanBody(model);
    case 'risks':
      return renderRiskBody(model);
    case 'timing':
      return renderTimingBody(model);
    case 'advisor':
      return renderAdvisorBody(model);
    default:
      return '';
  }
}

function renderVerdictBody(model) {
  const section = model.sections.verdict;
  return `
    <p class="analysis-hub__lead">${escapeHtml(section.lead)}</p>
    <div class="analysis-hub__chip-list">${section.chips.map((chip) => `<span class="story-pill story-pill--info">${escapeHtml(chip)}</span>`).join('')}</div>
    <div class="analysis-hub__metric-list">${section.metrics.map(renderMetricCard).join('')}</div>
    <div class="analysis-hub__row-list">${section.diagnostics.map(renderLineRow).join('')}</div>
  `;
}

function renderPlanBody(model) {
  const section = model.sections.plan;
  return `
    <p class="analysis-hub__lead">${escapeHtml(section.lead)}</p>
    <div class="analysis-hub__chip-list">${section.chips.map((chip) => `<span class="story-pill story-pill--info">${escapeHtml(chip)}</span>`).join('')}</div>
    <div class="analysis-hub__list">${section.phases.map(renderPhaseRow).join('')}</div>
  `;
}

function renderRiskBody(model) {
  const section = model.sections.risks;
  return `
    <p class="analysis-hub__lead">${escapeHtml(section.lead)}</p>
    <div class="analysis-hub__list">${section.items.map(renderLineRow).join('')}</div>
  `;
}

function renderTimingBody(model) {
  const section = model.sections.timing;
  return `
    <p class="analysis-hub__lead">${escapeHtml(section.lead)}</p>
    <div class="analysis-hub__chip-list">${section.chips.map((chip) => `<span class="story-pill story-pill--info">${escapeHtml(chip)}</span>`).join('')}</div>
    <div class="analysis-hub__list">${section.windows.map(renderPhaseRow).join('')}</div>
  `;
}

function renderAdvisorBody(model) {
  const section = model.sections.advisor;
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
            <small>${escapeHtml(section.actionHints[action.key] || '')}</small>
          </span>
        </button>
      `).join('')}
    </div>

    <article class="analysis-hub__response-card analysis-hub__response-card--compact">
      <span class="analysis-hub__card-kicker">Respuesta contextual</span>
      <strong>${escapeHtml(section.response.title)}</strong>
      <p>${escapeHtml(section.response.text)}</p>
      <details class="analysis-hub__why">
        <summary>¿Por qué?</summary>
        <p>${escapeHtml(section.why)}</p>
      </details>
    </article>

    <div class="analysis-hub__chip-list">${section.chips.map((chip) => `<span class="story-pill story-pill--${chip.tone}">${escapeHtml(chip.label)}</span>`).join('')}</div>
    <div class="analysis-hub__list">${section.insights.map(renderLineRow).join('')}</div>
    <div class="analysis-hub__signal">
      <strong>${escapeHtml(section.signal.title)}</strong>
      <p>${escapeHtml(section.signal.text)}</p>
    </div>
  `;
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
    { label: 'Ejecución', score: execution, detail: execution >= 80 ? 'Más sencilla' : execution >= 50 ? 'Exige coordinación' : 'Muy exigente' },
  ];
}

function buildAction(activeAction, context) {
  const { analysis, coach, advisor, priorities, risks, initiator, phases } = context;
  const topPriority = priorities[0] || null;
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
        chips: uniqueValues([topRisk?.label, advisor?.summary?.risk, analysis?.coherence?.label, analysis?.winCondition?.avoid?.[0]]).map((label) => ({ label, tone: 'danger' })),
      };
    case 'init':
      return {
        title: initiator?.champion ? `${initiator.champion} debe iniciar` : 'Iniciación por orden',
        text: initiator?.champion
          ? `${initiator.champion} es tu mejor punto de entrada porque ${initiator.reason}.`
          : 'La iniciación debe venir del campeón con más engage y control.',
        why: initiator?.why || 'Busco la pieza que mejor abre la pelea sin romper la estructura.',
        chips: uniqueValues([initiator?.champion, initiator?.role, coach?.summary?.identity, analysis?.primaryIdentity]).map((label) => ({ label, tone: 'info' })),
      };
    case 'priority':
      return {
        title: topPriority?.label || primaryObjective,
        text: topPriority?.detail || `${primaryObjective} es la prioridad inmediata del draft.`,
        why: uniqueValues([topPriority?.label, topPriority?.detail, coach?.summary?.priority, phases[0]?.detail, analysis?.tempoDetail?.label]).join(' · ') || 'La prioridad se ordena por identidad, tempo y ventana de poder.',
        chips: uniqueValues([topPriority?.label, powerSpike, phases[0]?.label, phases[1]?.label]).map((label) => ({ label, tone: 'info' })),
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
        chips: uniqueValues([primaryObjective, powerSpike, analysis?.tempoDetail?.label, analysis?.coherence?.label]).map((label) => ({ label, tone: 'success' })),
      };
  }
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

function buildPriorities(analysis, coach, advisor) {
  const items = uniqueValues([
    ...(asArray(advisor?.objectivePriority) || []).map((item) => item?.label),
    ...(asArray(coach?.priorities) || []).map((item) => item?.label),
    analysis?.winCondition?.label,
    analysis?.primaryIdentity,
  ]).filter(Boolean);

  return (items.length ? items : ['Jugar alrededor de la identidad']).slice(0, 4).map((label, index) => ({
    label,
    detail: buildPriorityDetail(label, analysis, index),
    weight: Math.max(1, 5 - index),
  }));
}

function buildRisks(analysis, coach, advisor) {
  const items = uniqueValues([
    ...(asArray(coach?.alerts) || []).map((item) => item?.label),
    ...(asArray(advisor?.loseConditions) || []).map((item) => item?.label),
    ...(Array.isArray(analysis?.weaknesses) ? analysis.weaknesses.map((item) => item?.label || item) : []),
    ...(Array.isArray(analysis?.winCondition?.avoid) ? analysis.winCondition.avoid.map((item) => toLabel(item)) : []),
  ]).filter(Boolean);

  return items.slice(0, 3).map((label) => ({
    label,
    detail: buildRiskDetail(label, analysis, coach),
  }));
}

function buildPhases(analysis, coach, advisor, priorities) {
  const phases = Array.isArray(coach?.phases) ? coach.phases : [];
  const labels = ['Early', 'Mid Game', 'Late Game'];
  const fallback = {
    Early: 'Gana tiempo y no regales peleas largas.',
    'Mid Game': 'Convierte la ventaja en objetivos y visión.',
    'Late Game': 'Cierra con carry protegido y pelea ordenada.',
  };

  return labels.map((label, index) => {
    const phase = phases[index] || {};
    return {
      label,
      detail: phase.detail || fallback[label],
      actions: uniqueValues([
        ...(Array.isArray(phase.actions) ? phase.actions : []),
        advisor?.summary?.priority,
        advisor?.summary?.powerSpike,
        index === 0 ? analysis?.winCondition?.avoid?.[0] : null,
        priorities[index]?.label,
      ]).slice(0, 3),
    };
  });
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

function buildTimingText(analysis, advisor, phases) {
  const windows = phases.map((phase) => phase.detail).filter(Boolean);
  return uniqueValues([
    advisor?.summary?.powerSpike ? `Tu pico más claro llega en ${advisor.summary.powerSpike}.` : null,
    windows[0],
    windows[1],
    analysis?.tempoDetail?.detail,
  ])
    .filter(Boolean)
    .slice(0, 2)
    .join(' ');
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
