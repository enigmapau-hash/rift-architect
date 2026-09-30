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
  if (!state.expandedCard) state.expandedCard = null;

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
        ${renderDetailCard(CARD_ORDER[0], model.verdict, state.expandedCard === 'verdict')}
        ${renderDetailCard(CARD_ORDER[1], model.plan, state.expandedCard === 'plan')}
        ${renderDetailCard(CARD_ORDER[2], model.risks, state.expandedCard === 'risks')}
        ${renderDetailCard(CARD_ORDER[3], model.timing, state.expandedCard === 'timing')}
        ${renderDetailCard(CARD_ORDER[4], model.advisor, state.expandedCard === 'advisor')}
      </div>
    </section>
  `;

  bindHubInteractions();
}

function bindHubInteractions() {
  state.root.querySelectorAll('details[data-hub-card]').forEach((details) => {
    details.addEventListener('toggle', () => {
      const cardId = String(details.dataset.hubCard || '');
      if (details.open) {
        state.expandedCard = cardId;
        state.root.querySelectorAll('details[data-hub-card]').forEach((other) => {
          if (other !== details) other.open = false;
        });
      } else if (state.expandedCard === cardId) {
        state.expandedCard = null;
      }
    });
  });

  state.root.querySelectorAll('[data-hub-action]').forEach((button) => {
    button.addEventListener('click', () => {
      state.activeAction = String(button.dataset.hubAction || 'win');
      state.expandedCard = 'advisor';
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
  const phases = buildPhases(analysis, coach, advisor);
  const initiator = buildInitiator(selectedChampions);
  const metrics = buildMetrics(analysis, selectedChampions);
  const execution = computeExecutionEase(selectedChampions);
  const confidence = Number(analysis?.confidence) || 0;
  const coherence = Number(analysis?.coherence?.score) || 0;
  const overall = clamp(Math.round((confidence + coherence + execution * 10) / 3), 0, 100);
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
    verdict: {
      summary: `${grade} · ${analysis?.coherence?.label || 'Lectura clara'}`,
      badge: analysis?.winCondition?.label || 'Veredicto',
      line: clampWords(analysis?.winCondition?.detail || analysis?.summaryText || 'La composición se entiende como una historia visual.', 10),
      text: buildVerdictText(analysis, advisor, phases, risks),
      metrics,
      chips: uniqueValues([analysis?.primaryIdentity, analysis?.winCondition?.label, analysis?.tempoDetail?.label]).slice(0, 3),
    },
    plan: {
      summary: clampWords(primaryObjective, 6),
      badge: primaryObjective === analysis?.primaryIdentity ? 'Juega tu identidad' : 'Plan claro',
      line: clampWords(analysis?.winCondition?.detail || advisor?.summary?.reason || 'El plan debe seguir la identidad principal.', 10),
      text: buildPlanText(analysis, advisor, phases, priorities),
      phases: phases.slice(0, 3),
      chips: uniqueValues([primaryObjective, powerSpike, initiator?.champion]).slice(0, 3),
    },
    risks: {
      summary: risks[0]?.label || 'Sin riesgo claro',
      badge: risks.length ? 'Vigilar' : 'Sin riesgo',
      line: clampWords(risks[0]?.detail || 'No hay una debilidad crítica evidente.', 10),
      text: clampWords(buildRiskOverview(risks), 18),
      items: risks,
    },
    timing: {
      summary: `${powerSpike} · ${phases[1]?.label || 'Mid Game'}`,
      badge: 'Timing',
      line: clampWords(buildTimingText(analysis, advisor, phases), 10),
      text: buildTimingText(analysis, advisor, phases),
      windows: phases,
      chips: uniqueValues([phases[0]?.label, phases[1]?.label, phases[2]?.label, powerSpike]).slice(0, 3),
    },
    advisor: {
      summary: clampWords(response.title, 6),
      badge: 'IA',
      line: clampWords(response.text, 12),
      text: clampWords(response.text, 18),
      why: clampWords(response.why, 22),
      chips: response.chips,
      insights: buildInsights(analysis, coach, advisor, priorities),
      actionHints: buildActionHints(analysis, coach, advisor, priorities, risks, initiator),
      signal,
      response,
      activeAction,
    },
    activeAction,
  };
}

function renderDetailCard(card, model, open) {
  return `
    <details class="analysis-hub__card analysis-hub__card--${card.id}" data-hub-card="${card.id}" ${open ? 'open' : ''}>
      <summary class="analysis-hub__summary">
        <div class="analysis-hub__summary-head">
          <div class="analysis-hub__summary-copy">
            <span class="analysis-hub__card-kicker">${card.icon} ${escapeHtml(card.title)}</span>
            <strong>${escapeHtml(model.summary)}</strong>
            <p class="analysis-hub__summary-line">${escapeHtml(model.line)}</p>
          </div>
          <span class="analysis-hub__card-badge">${escapeHtml(model.badge)}</span>
        </div>
        <div class="analysis-hub__summary-footer">
          <span class="analysis-hub__summary-hint analysis-hub__summary-hint--closed">Ver más</span>
          <span class="analysis-hub__summary-hint analysis-hub__summary-hint--open">Ocultar</span>
          <span class="analysis-hub__summary-chevron" aria-hidden="true">▾</span>
        </div>
      </summary>
      <div class="analysis-hub__body">
        ${renderCardBody(card.id, model)}
      </div>
    </details>
  `;
}

function renderCardBody(cardId, model) {
  switch (cardId) {
    case 'verdict':
      return `
        <p class="analysis-hub__lead">${escapeHtml(model.text)}</p>
        <div class="analysis-hub__chip-list">
          ${model.chips.map((chip) => `<span class="story-pill story-pill--info">${escapeHtml(chip)}</span>`).join('')}
        </div>
        <details class="analysis-hub__why">
          <summary>Ver análisis técnico</summary>
          <div class="analysis-hub__metric-list">${model.metrics.map(renderMetricRow).join('')}</div>
        </details>
      `;
    case 'plan':
      return `
        <p class="analysis-hub__lead">${escapeHtml(model.text)}</p>
        <div class="analysis-hub__chip-list">
          ${model.chips.map((chip) => `<span class="story-pill story-pill--info">${escapeHtml(chip)}</span>`).join('')}
        </div>
        <details class="analysis-hub__why">
          <summary>Ver plan por fases</summary>
          <div class="analysis-hub__list">${model.phases.map(renderPhaseRow).join('')}</div>
        </details>
      `;
    case 'risks':
      return `
        <p class="analysis-hub__lead">${escapeHtml(model.text)}</p>
        <div class="analysis-hub__chip-list">
          ${model.items.slice(0, 2).map((item) => `<span class="story-pill story-pill--warning">${escapeHtml(item.label)}</span>`).join('')}
        </div>
        <details class="analysis-hub__why">
          <summary>Ver riesgos completos</summary>
          <div class="analysis-hub__list">${model.items.map(renderLineRow).join('')}</div>
        </details>
      `;
    case 'timing':
      return `
        <p class="analysis-hub__lead">${escapeHtml(model.text)}</p>
        <div class="analysis-hub__chip-list">
          ${model.chips.map((chip) => `<span class="story-pill story-pill--info">${escapeHtml(chip)}</span>`).join('')}
        </div>
        <details class="analysis-hub__why">
          <summary>Ver ventanas de poder</summary>
          <div class="analysis-hub__list">${model.windows.map(renderPhaseRow).join('')}</div>
        </details>
      `;
    case 'advisor':
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
                <small>${escapeHtml(model.actionHints[action.key] || '')}</small>
              </span>
            </button>
          `).join('')}
        </div>

        <p class="analysis-hub__lead">${escapeHtml(model.response.text)}</p>

        <article class="analysis-hub__response-card analysis-hub__response-card--compact">
          <span class="analysis-hub__card-kicker">Respuesta contextual</span>
          <strong>${escapeHtml(model.response.title)}</strong>
          <p>${escapeHtml(model.why)}</p>
        </article>

        <div class="analysis-hub__chip-list">
          ${model.chips.map((chip) => `<span class="story-pill story-pill--${chip.tone}">${escapeHtml(chip.label)}</span>`).join('')}
        </div>

        <details class="analysis-hub__why">
          <summary>Ver apoyo de la IA</summary>
          <div class="analysis-hub__list">
            ${model.insights.map(renderLineRow).join('')}
          </div>
          <div class="analysis-hub__signal">
            <strong>${escapeHtml(model.signal.title)}</strong>
            <p>${escapeHtml(model.signal.text)}</p>
          </div>
        </details>
      `;
    default:
      return '';
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

function buildPriorities(analysis, coach, advisor) {
  const items = uniqueValues([
    ...(Array.isArray(advisor?.objectivePriority) ? advisor.objectivePriority : []).map((item) => item?.label),
    ...(Array.isArray(coach?.priorities) ? coach.priorities : []).map((item) => item?.label),
    analysis?.winCondition?.label,
    analysis?.primaryIdentity,
  ]).filter(Boolean);

  return (items.length ? items : ['Jugar alrededor de la identidad']).slice(0, 4).map((label, index) => ({
    label,
    detail: buildPriorityDetail(label, analysis, index),
    weight: Math.max(1, 5 - index),
  }));
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

function buildRisks(analysis, coach, advisor) {
  const items = uniqueValues([
    ...(Array.isArray(coach?.alerts) ? coach.alerts : []).map((item) => item?.label),
    ...(Array.isArray(advisor?.loseConditions) ? advisor.loseConditions : []).map((item) => item?.label),
    ...(Array.isArray(analysis?.weaknesses) ? analysis?.weaknesses : []).map((item) => item?.label || item),
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

function buildPhases(analysis, coach, advisor) {
  const phases = Array.isArray(coach?.phases) ? coach.phases : [];
  const labels = ['Early', 'Mid Game', 'Late Game'];
  const fallbackDetails = {
    Early: 'Gana tiempo y no regales peleas largas.',
    'Mid Game': 'Convierte la ventaja en objetivos y visión.',
    'Late Game': 'Cierra con carry protegido y pelea ordenada.',
  };

  return labels.map((label, index) => {
    const phase = phases[index] || {};
    return {
      label,
      detail: phase.detail || fallbackDetails[label],
      actions: uniqueValues([
        ...(Array.isArray(phase.actions) ? phase.actions : []),
        advisor?.summary?.priority,
        advisor?.summary?.powerSpike,
        index === 0 ? analysis?.winCondition?.avoid?.[0] : null,
      ]).slice(0, 3),
    };
  });
}

function buildInitiator(selectedChampions) {
  const candidates = selectedChampions.map((champion) => {
    const text = [champion.champion, champion.identity, champion.function, champion.tempo, ...(Array.isArray(champion.strengths) ? champion.strengths : []), ...(Array.isArray(champion.weaknesses) ? champion.weaknesses : [])].filter(Boolean).join(' ').toLowerCase();
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

function buildMetrics(analysis, selectedChampions) {
  const execution = computeExecutionEase(selectedChampions);
  return [
    { label: 'Identidad', score: clamp(Math.round(Number(analysis?.confidence) || 0), 0, 100), detail: analysis?.primaryIdentity || 'Sin definir' },
    { label: 'Coherencia', score: clamp(Math.round(Number(analysis?.coherence?.score) || 0), 0, 100), detail: analysis?.coherence?.label || 'Sin definir' },
    { label: 'Victoria', score: clamp(Math.round(Number(analysis?.winCondition?.score) || 0), 0, 100), detail: analysis?.winCondition?.label || 'Sin definir' },
    { label: 'Tempo', score: clamp(Math.round(Number(analysis?.tempoDetail?.confidence) || 0), 0, 100), detail: analysis?.tempoDetail?.label || 'Sin definir' },
    { label: 'Ejecución', score: execution * 10, detail: execution >= 8 ? 'Más sencilla' : execution >= 5 ? 'Exige coordinación' : 'Muy exigente' },
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
        why: uniqueValues([topRisk?.label, coach?.summary?.risk, analysis?.coherence?.label, analysis?.winCondition?.avoid?.[0]]).join(' · ') || 'El riesgo sale de la coherencia del draft.',
        chips: uniqueValues([topRisk?.label, advisor?.summary?.risk, analysis?.coherence?.label, analysis?.winCondition?.avoid?.[0]]).map((label) => ({ label, tone: 'danger' })),
      };
    case 'init':
      return {
        title: initiator?.champion ? `${initiator.champion} debe iniciar` : 'Iniciación por orden',
        text: initiator?.champion ? `${initiator.champion} es tu mejor punto de entrada porque ${initiator.reason}.` : 'La iniciación debe venir del campeón con más engage y control.',
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
        why: uniqueValues([advisor?.summary?.identity, advisor?.summary?.powerSpike, analysis?.tempoDetail?.label, analysis?.winCondition?.label, coach?.summary?.priority, coach?.summary?.reason]).join(' · ') || 'La respuesta sale del análisis del motor.',
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
  const fromCoach = buildInsightRows(coach);
  const fromAdvisor = buildInsightRowsFromAdvisor(advisor);
  const fromAnalysis = uniqueValues([analysis?.primaryIdentity, analysis?.tempoDetail?.label, analysis?.coherence?.label, priorities[0]?.label])
    .filter(Boolean)
    .slice(0, 1)
    .map((label) => ({ label, detail: 'Encaja con la lectura general de la composición.' }));

  return uniqueByLabel([...fromCoach, ...fromAdvisor, ...fromAnalysis]).slice(0, 3);
}

function buildInsightRows(coach) {
  return uniqueValues([
    ...(Array.isArray(coach?.insights) ? coach.insights : []).map((item) => item?.label),
    coach?.summary?.priority,
    coach?.summary?.powerSpike,
  ])
    .filter(Boolean)
    .slice(0, 3)
    .map((label) => ({
      label,
      detail: coach?.insights?.find?.((item) => item?.label === label)?.detail || 'Señal que refuerza la lectura del motor.',
    }));
}

function buildInsightRowsFromAdvisor(advisor) {
  return uniqueValues((Array.isArray(advisor?.objectivePriority) ? advisor.objectivePriority : []).map((item) => item?.label))
    .filter(Boolean)
    .slice(0, 3)
    .map((label) => ({
      label,
      detail: advisor?.objectivePriority?.find?.((item) => item?.label === label)?.detail || 'Prioridad del plan.',
    }));
}

function buildVerdictText(analysis, advisor, phases, risks) {
  return [
    analysis?.winCondition?.detail || analysis?.summaryText || 'La composición se entiende como una historia visual.',
    advisor?.summary?.powerSpike ? `Tu ventana más importante llega en ${advisor.summary.powerSpike}.` : null,
    phases[1]?.detail ? `Momento fuerte: ${phases[1].detail}` : null,
    risks[0]?.label ? `Mayor riesgo: ${risks[0].label}.` : null,
  ].filter(Boolean).slice(0, 3).join(' ');
}

function buildPlanText(analysis, advisor, phases, priorities) {
  return [
    advisor?.summary?.reason || analysis?.winCondition?.detail || 'Sigue la identidad principal del draft.',
    priorities[0]?.detail ? `Primera prioridad: ${priorities[0].detail}` : null,
    phases[0]?.detail ? `Early: ${phases[0].detail}` : null,
  ].filter(Boolean).slice(0, 3).join(' ');
}

function buildRiskOverview(risks) {
  if (!risks.length) return 'No hay una debilidad crítica evidente.';
  return risks.map((item) => `${item.label}: ${item.detail}`).join(' ');
}

function buildTimingText(analysis, advisor, phases) {
  return [
    advisor?.summary?.powerSpike ? `Tu ventana más importante llega en ${advisor.summary.powerSpike}.` : null,
    phases[1]?.detail ? `Mid Game: ${phases[1].detail}` : null,
    analysis?.tempoDetail?.detail || null,
  ].filter(Boolean).slice(0, 3).join(' ');
}

function buildIntent(analysis) {
  return analysis?.primaryIdentity || 'Tu composición';
}

function renderMetricRow(metric) {
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

function containsAny(text, terms = []) {
  const normalized = normalizeText(text);
  return terms.some((term) => normalized.includes(normalizeText(term)));
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueValues(values = []) {
  return [...new Set(values.filter(Boolean))];
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

function computeExecutionEase(selectedChampions) {
  const complexTerms = ['exigente', 'técnico', 'tecnico', 'difícil', 'dificil', 'caótico', 'caotico', 'mecánico', 'mecanico', 'preciso'];
  const complexityHits = selectedChampions.reduce((total, champion) => {
    const text = [champion.champion, champion.identity, champion.function, champion.tempo].filter(Boolean).join(' ').toLowerCase();
    return total + (complexTerms.some((term) => text.includes(term)) ? 1 : 0);
  }, 0);

  return clamp(10 - complexityHits * 2, 1, 10);
}
