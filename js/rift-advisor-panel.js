import { analyzeComposition } from './analyzer.js';

const ROOT_ID = 'advisorView';
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
  renderAdvisor();
}

function mountRoot(storyView) {
  const existing = document.getElementById(ROOT_ID);
  if (existing) {
    state.root = existing;
    return;
  }

  const root = document.createElement('section');
  root.id = ROOT_ID;
  root.className = 'rift-advisor';
  root.setAttribute('aria-live', 'polite');

  const assessmentView = document.getElementById('assessmentView');
  if (assessmentView) {
    assessmentView.insertAdjacentElement('afterend', root);
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
    renderAdvisor();
  });
}

function renderAdvisor() {
  if (!state.root) return;

  const selectedChampions = collectSelectedChampions();
  if (selectedChampions.length < 5) {
    state.root.innerHTML = `
      <article class='rift-advisor__empty'>
        <p class='eyebrow'>Sprint 13 · Rift Advisor</p>
        <h4>Completa los cinco campeones para desbloquear el asesor</h4>
        <p>El asesor mostrará respuestas directas sobre cómo ganar, qué te castiga, quién debe iniciar y qué debes priorizar.</p>
      </article>
    `;
    return;
  }

  const analysis = analyzeComposition(selectedChampions);
  const model = buildAdvisorModel(analysis, selectedChampions, state.activeAction);

  state.root.innerHTML = `
    <section class='rift-advisor__shell'>
      <div class='rift-advisor__header'>
        <div class='rift-advisor__header-copy'>
          <p class='eyebrow'>Sprint 13 · Rift Advisor</p>
          <h4>Copiloto del análisis</h4>
          <p>${escapeHtml(model.summary)}</p>
          <div class='rift-advisor__hero'>
            <span class='story-pill story-pill--info'>${escapeHtml(model.heroBadge)}</span>
            <strong>${escapeHtml(model.heroHeadline)}</strong>
            <p>${escapeHtml(model.heroText)}</p>
          </div>
        </div>

        <div class='rift-advisor__score-card ${toneByScore(model.overall)}'>
          <span class='rift-advisor__score-kicker'>Advisor score</span>
          <strong>${model.grade} · ${model.overall}</strong>
          <span>${escapeHtml(model.scoreBadge)}</span>
        </div>
      </div>

      <div class='rift-advisor__actions' role='tablist' aria-label='Acciones del asesor'>
        ${ACTIONS.map((action) => `
          <button
            class='rift-advisor__action ${action.key === model.activeAction ? 'is-active' : ''}'
            type='button'
            role='tab'
            aria-selected='${action.key === model.activeAction ? 'true' : 'false'}'
            data-advisor-action='${action.key}'
          >
            <span class='rift-advisor__action-icon'>${action.icon}</span>
            <span class='rift-advisor__action-copy'>
              <strong>${escapeHtml(action.label)}</strong>
              <small>${escapeHtml(model.actionHints[action.key] || '')}</small>
            </span>
          </button>
        `).join('')}
      </div>

      <div class='rift-advisor__response-grid'>
        <article class='rift-advisor__response-card'>
          <span class='rift-advisor__card-kicker'>Respuesta contextual</span>
          <strong>${escapeHtml(model.response.title)}</strong>
          <p>${escapeHtml(model.response.text)}</p>
          <details class='rift-advisor__why'>
            <summary>¿Por qué?</summary>
            <p>${escapeHtml(model.response.why)}</p>
          </details>
          <div class='rift-advisor__chip-list'>
            ${model.response.chips.map((chip) => `<span class='story-pill story-pill--${chip.tone}'>${escapeHtml(chip.label)}</span>`).join('')}
          </div>
        </article>

        <article class='rift-advisor__response-card rift-advisor__response-card--compact'>
          <span class='rift-advisor__card-kicker'>Señal principal</span>
          <strong>${escapeHtml(model.signal.title)}</strong>
          <p>${escapeHtml(model.signal.text)}</p>
          <div class='rift-advisor__chip-list'>
            ${model.signal.chips.map((chip) => `<span class='story-pill story-pill--info'>${escapeHtml(chip)}</span>`).join('')}
          </div>
        </article>
      </div>

      <div class='rift-advisor__phase-grid'>
        ${model.phases.map(renderPhaseCard).join('')}
      </div>

      <div class='rift-advisor__evidence-grid'>
        <article class='rift-advisor__evidence-card'>
          <span class='rift-advisor__card-kicker'>Señales que sostienen el consejo</span>
          <div class='rift-advisor__list'>
            ${model.insights.map(renderInsightRow).join('')}
          </div>
        </article>

        <article class='rift-advisor__evidence-card rift-advisor__evidence-card--danger'>
          <span class='rift-advisor__card-kicker'>Alertas a vigilar</span>
          <div class='rift-advisor__list'>
            ${model.alerts.map(renderAlertRow).join('')}
          </div>
        </article>
      </div>
    </section>
  `;

  state.root.querySelectorAll('[data-advisor-action]').forEach((button) => {
    button.addEventListener('click', () => {
      state.activeAction = String(button.dataset.advisorAction || 'win');
      renderAdvisor();
    });
  });
}

function collectSelectedChampions() {
  return [...document.querySelectorAll(SELECTOR)]
    .map((slot) => {
      const role = String(slot.dataset.role || 'top');
      const name = slot.querySelector('.slot__name')?.textContent?.trim() || '';
      const identity = slot.querySelector('.slot__meta')?.textContent?.trim() || '';
      const functionText = slot.querySelector('.champion-item__sub')?.textContent?.trim() || '';
      return { role, champion: name, identity, function: functionText, tempo: '', strengths: [], weaknesses: [] };
    })
    .filter((champion) => champion.champion);
}

function buildAdvisorModel(analysis, selectedChampions, activeAction) {
  const coach = analysis?.coach || {};
  const advisor = analysis?.advisor || {};
  const assistant = analysis?.assistant || {};
  const phases = buildPhases(coach, advisor, analysis);
  const priorities = buildPriorities(coach, advisor, analysis);
  const risks = buildRisks(coach, advisor, analysis);
  const insights = buildInsights(coach, advisor, analysis);
  const initiator = findInitiator(selectedChampions, analysis);
  const action = buildAction(activeAction, { analysis, coach, advisor, assistant, priorities, risks, initiator, phases });
  const signal = buildSignal(coach, advisor, analysis, action);
  const summary = analysis?.summaryText || 'El asesor convierte el análisis en respuestas directas y fáciles de leer.';
  const heroHeadline = analysis?.primaryIdentity || 'Tu composición';
  const heroText = assistant?.summary?.reason || advisor?.summary?.reason || 'Gana con una sola idea clara y sin perder el hilo del draft.';
  const heroBadge = advisor?.summary?.powerSpike || coach?.summary?.powerSpike || 'Consejo directo';
  const score = clamp(
    Math.round(
      [analysis?.confidence, analysis?.coherence?.score, phases.length ? 25 : 0, priorities.length ? 25 : 0, risks.length ? 25 : 0].reduce((sum, value) => sum + Number(value || 0), 0) / 4
    ),
    0,
    100
  );

  return {
    summary,
    heroHeadline,
    heroText,
    heroBadge,
    grade: gradeFromScore(score),
    overall: score,
    scoreBadge: score >= 85 ? 'Respuesta muy clara' : score >= 70 ? 'Respuesta sólida' : 'Respuesta a pulir',
    actionHints: buildActionHints(analysis, coach, advisor, assistant, priorities, risks, initiator),
    response: action,
    signal,
    phases,
    insights,
    alerts: risks,
    activeAction,
  };
}

function buildAction(actionKey, context) {
  const { analysis, coach, advisor, assistant, priorities, risks, initiator, phases } = context;
  const topPriority = priorities[0] || null;
  const topRisk = risks[0] || null;
  const powerSpike = advisor?.summary?.powerSpike || coach?.summary?.powerSpike || 'tu ventana de poder';
  const primaryObjective = advisor?.primaryObjective || topPriority?.label || analysis?.winCondition?.label || 'Jugar alrededor de la identidad';
  const reasons = [];

  if (analysis?.coherence?.label) reasons.push(analysis.coherence.label);
  if (analysis?.winCondition?.detail) reasons.push(analysis.winCondition.detail);
  if (analysis?.summaryText) reasons.push(analysis.summaryText);

  switch (actionKey) {
    case 'risk':
      return {
        title: topRisk?.label || 'Mayor error castigado',
        text: topRisk?.detail || 'Forzar la pelea equivocada te hace perder la ventaja del draft.',
        why: buildRiskWhy(topRisk, analysis, coach),
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
          : 'La iniciación debe venir del campeón con más engage, CC y capacidad de no exponer al carry.',
        why: initiator?.why || 'Busco la pieza que mejor abre la pelea sin romper la estructura del equipo.',
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
        why: buildPriorityWhy(topPriority, analysis, coach, phases),
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
        text: buildWinText(analysis, coach, advisor, assistant, powerSpike, topPriority),
        why: buildWinWhy(analysis, coach, advisor, assistant, reasons),
        chips: uniqueValues([
          primaryObjective,
          powerSpike,
          analysis?.tempoDetail?.label,
          analysis?.coherence?.label,
        ]).map((label) => ({ label, tone: 'success' })),
      };
  }
}

function buildWinText(analysis, coach, advisor, assistant, powerSpike, topPriority) {
  const texts = [
    advisor?.summary?.reason,
    assistant?.summary?.reason,
    analysis?.winCondition?.detail,
    topPriority?.detail,
  ].filter(Boolean);

  const sentence = texts[0] || 'Tu composición gana jugando a su identidad principal.';
  return `${sentence} Tu ventana más importante llega en ${powerSpike}.`;
}

function buildWinWhy(analysis, coach, advisor, assistant, reasons) {
  const pieces = [
    advisor?.summary?.identity,
    advisor?.summary?.powerSpike,
    analysis?.tempoDetail?.label,
    analysis?.winCondition?.label,
    ...reasons.slice(0, 2),
  ].filter(Boolean);

  return uniqueValues(pieces).join(' · ') || 'La respuesta sale del análisis del motor y del conocimiento del draft.';
}

function buildRiskWhy(risk, analysis, coach) {
  const parts = [
    risk?.label,
    risk?.detail,
    coach?.summary?.risk,
    analysis?.coherence?.label,
    analysis?.winCondition?.avoid?.[0],
  ].filter(Boolean);

  return uniqueValues(parts).join(' · ') || 'El riesgo principal se deduce del plan de victoria y de la coherencia del draft.';
}

function buildPriorityWhy(priority, analysis, coach, phases) {
  const parts = [
    priority?.label,
    priority?.detail,
    coach?.summary?.priority,
    phases[0]?.detail,
    analysis?.tempoDetail?.label,
  ].filter(Boolean);

  return uniqueValues(parts).join(' · ') || 'La prioridad se ordena por identidad, tempo y ventana de poder.';
}

function buildSignal(coach, advisor, analysis, action) {
  const title = coach?.headline || advisor?.primaryObjective || analysis?.primaryIdentity || 'Señal principal';
  const text = coach?.summary?.reason || advisor?.summary?.reason || analysis?.summaryText || 'La aplicación condensa el análisis en una sola idea fácil de seguir.';
  const chips = uniqueValues([
    coach?.summary?.powerSpike,
    coach?.summary?.priority,
    coach?.summary?.risk,
    action?.chips?.[0]?.label,
  ]).map((label) => ({ label, tone: 'info' }));

  return { title, text, chips };
}

function buildActionHints(analysis, coach, advisor, assistant, priorities, risks, initiator) {
  return {
    win: advisor?.summary?.reason || assistant?.summary?.reason || 'Cómo convertir el plan en victoria',
    risk: risks[0]?.detail || 'Qué castiga más a esta composición',
    init: initiator?.champion ? `${initiator.champion} encaja con la iniciación` : 'Quién abre mejor la pelea',
    priority: priorities[0]?.detail || coach?.summary?.priority || 'Qué priorizar ahora mismo',
  };
}

function buildPriorities(coach, advisor, analysis) {
  const items = uniqueValues([
    ...(asArray(advisor?.objectivePriority) || []).map((item) => item?.label),
    ...(asArray(coach?.priorities) || []).map((item) => item?.label),
    analysis?.winCondition?.label,
    analysis?.primaryIdentity,
  ]).slice(0, 4);

  const labels = items.length ? items : ['Jugar alrededor de la identidad'];

  return labels.map((label, index) => ({
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

function buildRisks(coach, advisor, analysis) {
  const risks = uniqueValues([
    ...(asArray(coach?.alerts) || []).map((item) => item?.label),
    ...(asArray(advisor?.loseConditions) || []).map((item) => item?.label),
    ...(Array.isArray(analysis?.weaknesses) ? analysis.weaknesses : []),
    ...(Array.isArray(analysis?.winCondition?.avoid) ? analysis.winCondition.avoid : []),
  ]).slice(0, 3);

  const labels = risks.length ? risks : ['Sin riesgo claro'];

  return labels.map((label) => ({
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

function buildPhases(coach, advisor, analysis) {
  const phases = Array.isArray(coach?.phases) ? coach.phases : [];
  const labels = ['Early', 'Mid Game', 'Late Game'];
  const fallbackDetails = {
    'Early': 'Gana tiempo y no regales peleas largas.',
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

function findInitiator(selectedChampions, analysis) {
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
      why: `Busco la pieza con más engage, CC y capacidad de entrar sin desordenar la composición. ${analysis?.coherence?.label || ''}`.trim(),
    };
  });

  const best = candidates.sort((a, b) => b.score - a.score || a.champion.localeCompare(b.champion, 'es'))[0];
  if (!best || best.score < 3) return null;
  return best;
}

function renderPhaseCard(phase) {
  return `
    <article class='rift-advisor__phase-card'>
      <span class='rift-advisor__card-kicker'>${escapeHtml(phase.label)}</span>
      <strong>${escapeHtml(phase.detail)}</strong>
      <div class='rift-advisor__chip-list'>
        ${phase.actions.map((action) => `<span class='story-pill story-pill--info'>${escapeHtml(action)}</span>`).join('')}
      </div>
    </article>
  `;
}

function renderInsightRow(item) {
  return `
    <div class='rift-advisor__row'>
      <strong>${escapeHtml(item.label)}</strong>
      <p>${escapeHtml(item.detail)}</p>
    </div>
  `;
}

function renderAlertRow(item) {
  return `
    <div class='rift-advisor__row rift-advisor__row--danger'>
      <strong>${escapeHtml(item.label)}</strong>
      <p>${escapeHtml(item.detail)}</p>
    </div>
  `;
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

function buildAlertRows(coach) {
  return uniqueValues((Array.isArray(coach?.alerts) ? coach.alerts : []).map((item) => item?.label))
    .filter(Boolean)
    .slice(0, 3)
    .map((label) => ({
      label,
      detail: coach?.alerts?.find?.((item) => item?.label === label)?.detail || 'Alerta que puede romper el plan.',
    }));
}

function buildAlertRowsFromAdvisor(advisor) {
  return uniqueValues((Array.isArray(advisor?.loseConditions) ? advisor.loseConditions : []).map((item) => item?.label))
    .filter(Boolean)
    .slice(0, 3)
    .map((label) => ({
      label,
      detail: advisor?.loseConditions?.find?.((item) => item?.label === label)?.detail || 'Riesgo principal del draft.',
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

function buildInsights(coach, advisor, analysis) {
  const fromCoach = buildInsightRows(coach);
  const fromAdvisor = buildInsightRowsFromAdvisor(advisor);
  const fromAnalysis = uniqueValues([
    analysis?.primaryIdentity,
    analysis?.tempoDetail?.label,
    analysis?.coherence?.label,
  ])
    .filter(Boolean)
    .slice(0, 1)
    .map((label) => ({
      label,
      detail: 'Encaja con la lectura general de la composición.',
    }));

  return uniqueByLabel([...fromCoach, ...fromAdvisor, ...fromAnalysis]).slice(0, 3);
}

function buildRisks(coach, advisor, analysis) {
  const fromCoach = buildAlertRows(coach);
  const fromAdvisor = buildAlertRowsFromAdvisor(advisor);
  const fromAnalysis = uniqueValues([
    analysis?.winCondition?.avoid?.[0],
    analysis?.coherence?.conflicts?.[0]?.label,
    analysis?.weaknesses?.[0],
  ])
    .filter(Boolean)
    .slice(0, 1)
    .map((label) => ({
      label,
      detail: 'Puede romper el plan principal.',
    }));

  return uniqueByLabel([...fromCoach, ...fromAdvisor, ...fromAnalysis]).slice(0, 3);
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

function buildWhySource(action, analysis, coach, advisor, assistant) {
  const parts = [
    action?.why,
    coach?.summary?.reason,
    advisor?.summary?.reason,
    assistant?.summary?.reason,
    analysis?.summaryText,
  ].filter(Boolean);

  return uniqueValues(parts).join(' · ') || 'La respuesta sale del análisis determinista y del knowledge layer.';
}

function buildActionHintsFallback(action, analysis, coach, advisor) {
  return action?.detail || advisor?.summary?.reason || coach?.summary?.reason || analysis?.summaryText || '';
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

function gradeFromScore(score) {
  if (score >= 95) return 'A+';
  if (score >= 88) return 'A';
  if (score >= 80) return 'B+';
  if (score >= 72) return 'B';
  if (score >= 64) return 'C+';
  if (score >= 56) return 'C';
  return 'D';
}
