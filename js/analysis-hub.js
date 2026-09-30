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
  root.className = 'analysis-hub';
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
      <article class='analysis-hub__empty'>
        <p class='eyebrow'>Sprint 13 · Analysis Hub</p>
        <h4>Completa los cinco campeones para ver el análisis unificado</h4>
        <p>El hub reúne assessment y advisor en una sola lectura, para entender la composición sin saltar entre paneles.</p>
      </article>
    `;
    return;
  }

  const analysis = analyzeComposition(selectedChampions);
  const model = buildHubModel(analysis, selectedChampions, state.activeAction);

  state.root.innerHTML = `
    <section class='analysis-hub__shell'>
      <div class='analysis-hub__header'>
        <div class='analysis-hub__header-copy'>
          <p class='eyebrow'>Sprint 13 · Analysis Hub</p>
          <h4>${escapeHtml(model.heroHeadline)}</h4>
          <p>${escapeHtml(model.summary)}</p>
          <div class='analysis-hub__verdict'>
            <span class='story-pill story-pill--${toneByGrade(model.grade)}'>${escapeHtml(model.verdictBadge)}</span>
            <strong>${escapeHtml(model.verdictHeadline)}</strong>
            <p>${escapeHtml(model.verdictText)}</p>
          </div>
        </div>

        <div class='analysis-hub__score-card ${scoreTone(model.overall)}'>
          <span class='analysis-hub__score-kicker'>Hub score</span>
          <strong>${model.grade} · ${model.overall}</strong>
          <span>${escapeHtml(model.scoreBadge)}</span>
        </div>
      </div>

      <div class='analysis-hub__grid'>
        <article class='analysis-hub__card analysis-hub__card--assessment'>
          <span class='analysis-hub__card-kicker'>Assessment unificado</span>
          <div class='analysis-hub__chip-list'>
            ${model.signals.map((signal) => `<span class='story-pill story-pill--info'>${escapeHtml(signal)}</span>`).join('')}
          </div>

          <div class='analysis-hub__row-list'>
            ${model.diagnostics.map(renderDiagnosticRow).join('')}
          </div>

          <div class='analysis-hub__coverage-grid'>
            ${model.coverage.map(renderCoverageItem).join('')}
          </div>

          <div class='analysis-hub__improve-list'>
            ${model.improvements.map((item) => `
              <div class='analysis-hub__item ${item.tone}'>
                <strong>${escapeHtml(item.label)}</strong>
                <p>${escapeHtml(item.detail)}</p>
              </div>
            `).join('')}
          </div>
        </article>

        <article class='analysis-hub__card analysis-hub__card--advisor'>
          <span class='analysis-hub__card-kicker'>Rift Advisor</span>
          <div class='analysis-hub__actions' role='tablist' aria-label='Acciones del asesor'>
            ${ACTIONS.map((action) => `
              <button
                class='analysis-hub__action ${action.key === model.activeAction ? 'is-active' : ''}'
                type='button'
                role='tab'
                aria-selected='${action.key === model.activeAction ? 'true' : 'false'}'
                data-hub-action='${action.key}'
              >
                <span class='analysis-hub__action-icon'>${action.icon}</span>
                <span class='analysis-hub__action-copy'>
                  <strong>${escapeHtml(action.label)}</strong>
                  <small>${escapeHtml(model.actionHints[action.key] || '')}</small>
                </span>
              </button>
            `).join('')}
          </div>

          <div class='analysis-hub__response-grid'>
            <article class='analysis-hub__response-card'>
              <span class='analysis-hub__card-kicker'>Respuesta contextual</span>
              <strong>${escapeHtml(model.response.title)}</strong>
              <p>${escapeHtml(model.response.text)}</p>
              <details class='analysis-hub__why'>
                <summary>¿Por qué?</summary>
                <p>${escapeHtml(model.response.why)}</p>
              </details>
              <div class='analysis-hub__chip-list'>
                ${model.response.chips.map((chip) => `<span class='story-pill story-pill--${chip.tone}'>${escapeHtml(chip.label)}</span>`).join('')}
              </div>
            </article>

            <article class='analysis-hub__response-card analysis-hub__response-card--compact'>
              <span class='analysis-hub__card-kicker'>Señal principal</span>
              <strong>${escapeHtml(model.signal.title)}</strong>
              <p>${escapeHtml(model.signal.text)}</p>
              <div class='analysis-hub__chip-list'>
                ${model.signal.chips.map((chip) => `<span class='story-pill story-pill--info'>${escapeHtml(chip)}</span>`).join('')}
              </div>
            </article>
          </div>

          <div class='analysis-hub__phase-grid'>
            ${model.phases.map(renderPhaseCard).join('')}
          </div>

          <div class='analysis-hub__evidence-grid'>
            <article class='analysis-hub__evidence-card'>
              <span class='analysis-hub__card-kicker'>Señales que sostienen el consejo</span>
              <div class='analysis-hub__list'>
                ${model.insights.map(renderInsightRow).join('')}
              </div>
            </article>

            <article class='analysis-hub__evidence-card analysis-hub__evidence-card--danger'>
              <span class='analysis-hub__card-kicker'>Alertas a vigilar</span>
              <div class='analysis-hub__list'>
                ${model.alerts.map(renderAlertRow).join('')}
              </div>
            </article>
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
      return { role, champion, identity, function: functionText, tempo, strengths: [], weaknesses: [] };
    })
    .filter((champion) => champion.champion);
}

function buildHubModel(analysis, selectedChampions, activeAction) {
  const coach = analysis?.coach || {};
  const advisor = analysis?.advisor || {};
  const priorities = buildPriorities(analysis, coach, advisor);
  const risks = buildRisks(analysis, coach, advisor);
  const phases = buildPhases(analysis, coach, advisor);
  const initiator = findInitiator(selectedChampions);
  const assessment = buildAssessment(analysis, selectedChampions, priorities, risks, phases);
  const response = buildAction(activeAction, { analysis, coach, advisor, priorities, risks, initiator, phases });
  const signal = buildSignal(analysis, coach, advisor, priorities, risks);

  return {
    summary: analysis?.summaryText || 'Una sola lectura reúne salud, calidad y decisiones accionables para entender la composición de un vistazo.',
    heroHeadline: analysis?.primaryIdentity || 'Tu composición',
    verdictHeadline: assessment.verdictHeadline,
    verdictText: assessment.verdictText,
    verdictBadge: assessment.verdictBadge,
    grade: assessment.grade,
    overall: assessment.overall,
    scoreBadge: assessment.badge,
    diagnostics: assessment.diagnostics,
    coverage: assessment.coverage,
    improvements: assessment.improvements,
    signals: assessment.signals,
    actionHints: buildActionHints(analysis, coach, advisor, priorities, risks, initiator),
    response,
    signal,
    phases,
    insights: buildInsights(analysis, coach, advisor, priorities),
    alerts: risks,
    activeAction,
  };
}

function buildAssessment(analysis, selectedChampions, priorities, risks, phases) {
  const metrics = Array.isArray(analysis?.metrics) ? analysis.metrics : [];
  const confidence = clamp(Math.round(Number(analysis?.confidence) || 0), 0, 100);
  const coherence = clamp(Math.round(Number(analysis?.coherence?.score) || 0), 0, 100);
  const signalCoverage = clamp(
    Math.round([analysis?.primaryIdentity, analysis?.tempoDetail?.label, analysis?.winCondition?.label, priorities[0]?.label, risks[0]?.label, phases[0]?.label].filter(Boolean).length * 16.5),
    0,
    100
  );
  const executionEase = computeExecutionEase(selectedChampions);
  const frontline = metricScore(metrics, 'Frontline');
  const scaling = metricScore(metrics, 'Escalado');
  const overall = clamp(Math.round((confidence + coherence + signalCoverage + executionEase * 10 + frontline * 10 + scaling * 10) / 6), 0, 100);
  const grade = gradeFromScore(overall);

  return {
    grade,
    overall,
    badge: overall >= 85 ? 'Lectura muy fiable' : overall >= 70 ? 'Lectura sólida' : 'Lectura mejorable',
    verdictBadge: overall >= 85 ? 'Assessment claro' : overall >= 70 ? 'Assessment estable' : 'Assessment frágil',
    verdictHeadline: buildVerdictHeadline(analysis, overall),
    verdictText: buildVerdictText(analysis, priorities, risks, phases),
    diagnostics: [
      {
        label: 'Identidad',
        score: Math.max(1, Math.round(confidence / 10)),
        detail: analysis?.primaryIdentity || 'Sin identidad clara',
        why: analysis?.summaryText || 'La identidad manda el resto del análisis.',
      },
      {
        label: 'Coherencia',
        score: Math.max(1, Math.round(coherence / 10)),
        detail: analysis?.coherence?.label || 'Coherencia aceptable',
        why: analysis?.coherence?.detail || 'La coherencia mide si las piezas encajan bien entre sí.',
      },
      {
        label: 'Win condition',
        score: Math.max(1, Math.round((Number(analysis?.winCondition?.score) || 60) / 10)),
        detail: analysis?.winCondition?.label || 'Condición de victoria disponible',
        why: analysis?.winCondition?.detail || 'La composición necesita un camino claro para ganar.',
      },
      {
        label: 'Tempo',
        score: Math.max(1, Math.round((Number(analysis?.tempoDetail?.confidence) || 60) / 10)),
        detail: analysis?.tempoDetail?.label || 'Tempo estable',
        why: analysis?.tempoDetail?.detail || 'El tempo marca cuándo debes pelear y cuándo no.',
      },
      {
        label: 'Ejecución',
        score: executionEase,
        detail: executionEase >= 8 ? 'Más sencilla de ejecutar' : executionEase >= 5 ? 'Exige coordinación' : 'Muy exigente de ejecutar',
        why: 'Cuanto más compleja es la composición, más castiga los errores de timing y posicionamiento.',
      },
    ],
    coverage: [
      {
        label: 'Lectura del motor',
        score: Math.max(1, Math.round(confidence / 10)),
        detail: 'Qué tan sólida es la conclusión global.',
      },
      {
        label: 'Coherencia',
        score: Math.max(1, Math.round(coherence / 10)),
        detail: 'Cuánto encajan identidad, sinergia y plan.',
      },
      {
        label: 'Señales útiles',
        score: Math.max(1, Math.round(signalCoverage / 10)),
        detail: 'Cuántas piezas relevantes llegan al hub.',
      },
      {
        label: 'Escalado / frontline',
        score: clamp(Math.max(frontline, scaling), 1, 10),
        detail: 'Si puedes pelear o necesitas más tiempo.',
      },
    ],
    improvements: buildImprovements(analysis, risks),
    signals: uniqueValues([
      analysis?.primaryIdentity,
      analysis?.winCondition?.label,
      priorities[0]?.label,
      phases[1]?.label,
    ]).slice(0, 4),
  };
}

function buildVerdictHeadline(analysis, overall) {
  const identity = analysis?.primaryIdentity || 'Composición';
  if (overall >= 88) return `${identity} muy consistente`;
  if (overall >= 72) return `${identity} bastante estable`;
  if (overall >= 56) return `${identity} jugable pero irregular`;
  return `${identity} necesita ajustes`;
}

function buildVerdictText(analysis, priorities, risks, phases) {
  const lines = [analysis?.summaryText || 'La composición se entiende como una historia visual.'];
  lines.push(
    analysis?.winCondition?.detail ||
      (analysis?.primaryIdentity ? `Tu plan natural gira alrededor de ${analysis.primaryIdentity}.` : 'Todavía falta una condición de victoria muy clara.')
  );

  if (priorities[0]) lines.push(`Prioridad principal: ${priorities[0].label}.`);
  if (risks[0]) lines.push(`Mayor riesgo: ${risks[0].label}.`);
  if (phases[1]) lines.push(`Momento fuerte: ${phases[1].label}.`);

  return lines.slice(0, 3).join(' ');
}

function buildImprovements(analysis, risks) {
  const weaknesses = Array.isArray(analysis?.weaknesses) ? analysis.weaknesses : [];
  const top = uniqueValues([
    toLabel(weaknesses[0]),
    toLabel(risks[0]),
    toLabel(risks[1]),
    toLabel(analysis?.winCondition?.avoid?.[0]),
  ]).slice(0, 3);

  if (!top.length) {
    return [
      {
        label: 'Sin mejora clara',
        detail: 'El draft ya tiene una base bastante coherente.',
        tone: 'is-good',
      },
    ];
  }

  return top.map((label, index) => ({
    label,
    detail: buildRiskDetail(label, analysis),
    tone: index === 0 ? 'is-mid' : 'is-low',
  }));
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
    ...(Array.isArray(analysis?.weaknesses) ? analysis.weaknesses.map((item) => item?.label) : []),
    ...(Array.isArray(analysis?.winCondition?.avoid) ? analysis.winCondition.avoid.map((item) => toLabel(item)) : []),
  ]).filter(Boolean);

  return (items.length ? items : ['Sin riesgo claro']).slice(0, 3).map((label) => ({
    label,
    detail: buildRiskDetail(label, analysis, coach),
  }));
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

function findInitiator(selectedChampions) {
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

function buildAction(activeAction, context) {
  const { analysis, coach, advisor, priorities, risks, initiator, phases } = context;
  const topPriority = priorities[0] || null;
  const topRisk = risks[0] || null;
  const powerSpike = advisor?.summary?.powerSpike || coach?.summary?.powerSpike || 'tu ventana de poder';
  const primaryObjective = advisor?.primaryObjective || topPriority?.label || analysis?.winCondition?.label || 'Jugar alrededor de la identidad';

  switch (activeAction) {
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
        text: buildWinText(analysis, powerSpike, topPriority),
        why: buildWinWhy(analysis, coach, advisor),
        chips: uniqueValues([
          primaryObjective,
          powerSpike,
          analysis?.tempoDetail?.label,
          analysis?.coherence?.label,
        ]).map((label) => ({ label, tone: 'success' })),
      };
  }
}

function buildWinText(analysis, powerSpike, topPriority) {
  const texts = [
    analysis?.winCondition?.detail,
    analysis?.summaryText,
    topPriority?.detail,
  ].filter(Boolean);

  const sentence = texts[0] || 'Tu composición gana jugando a su identidad principal.';
  return `${sentence} Tu ventana más importante llega en ${powerSpike}.`;
}

function buildWinWhy(analysis, coach, advisor) {
  const pieces = [
    advisor?.summary?.identity,
    advisor?.summary?.powerSpike,
    analysis?.tempoDetail?.label,
    analysis?.winCondition?.label,
    coach?.summary?.priority,
    coach?.summary?.reason,
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

function buildSignal(analysis, coach, advisor, priorities, risks) {
  const title = advisor?.primaryObjective || coach?.headline || analysis?.primaryIdentity || 'Señal principal';
  const text = advisor?.summary?.reason || coach?.summary?.reason || analysis?.summaryText || 'La aplicación condensa el análisis en una sola idea fácil de seguir.';
  const chips = uniqueValues([
    coach?.summary?.powerSpike,
    coach?.summary?.priority,
    coach?.summary?.risk,
    priorities[0]?.label,
    risks[0]?.label,
  ]).map((label) => ({ label, tone: 'info' }));

  return { title, text, chips };
}

function buildActionHints(analysis, coach, advisor, priorities, risks, initiator) {
  return {
    win: advisor?.summary?.reason || coach?.summary?.reason || 'Cómo convertir el plan en victoria',
    risk: risks[0]?.detail || 'Qué castiga más a esta composición',
    init: initiator?.champion ? `${initiator.champion} encaja con la iniciación` : 'Quién abre mejor la pelea',
    priority: priorities[0]?.detail || coach?.summary?.priority || 'Qué priorizar ahora mismo',
  };
}

function buildInsights(analysis, coach, advisor, priorities) {
  const fromCoach = buildInsightRows(coach);
  const fromAdvisor = buildInsightRowsFromAdvisor(advisor);
  const fromAnalysis = uniqueValues([
    analysis?.primaryIdentity,
    analysis?.tempoDetail?.label,
    analysis?.coherence?.label,
    priorities[0]?.label,
  ])
    .filter(Boolean)
    .slice(0, 1)
    .map((label) => ({
      label,
      detail: 'Encaja con la lectura general de la composición.',
    }));

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

function buildRisks(analysis, coach, advisor) {
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

function findInitiator(selectedChampions) {
  const candidates = selectedChampions.map((champion) => {
    const text = [
      champion.champion,
      champion.identity,
      champion.function,
      champion.tempo,
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

function renderPhaseCard(phase) {
  return `
    <article class='analysis-hub__phase-card'>
      <span class='analysis-hub__card-kicker'>${escapeHtml(phase.label)}</span>
      <strong>${escapeHtml(phase.detail)}</strong>
      <div class='analysis-hub__chip-list'>
        ${phase.actions.map((action) => `<span class='story-pill story-pill--info'>${escapeHtml(action)}</span>`).join('')}
      </div>
    </article>
  `;
}

function renderInsightRow(item) {
  return `
    <div class='analysis-hub__row'>
      <strong>${escapeHtml(item.label)}</strong>
      <p>${escapeHtml(item.detail)}</p>
    </div>
  `;
}

function renderAlertRow(item) {
  return `
    <div class='analysis-hub__row analysis-hub__row--danger'>
      <strong>${escapeHtml(item.label)}</strong>
      <p>${escapeHtml(item.detail)}</p>
    </div>
  `;
}

function renderDiagnosticRow(item) {
  return `
    <div class='analysis-hub__diagnostic ${scoreTone(item.score * 10)}'>
      <div class='analysis-hub__diagnostic-copy'>
        <strong>${escapeHtml(item.label)}</strong>
        <p>${escapeHtml(item.detail)}</p>
        <details class='analysis-hub__why'>
          <summary>¿Por qué?</summary>
          <p>${escapeHtml(item.why)}</p>
        </details>
      </div>
      <span>${item.score}/10</span>
    </div>
  `;
}

function renderCoverageItem(item) {
  return `
    <div class='analysis-hub__coverage ${scoreTone(item.score * 10)}'>
      <strong>${escapeHtml(item.label)}</strong>
      <span>${item.score}/10</span>
      <p>${escapeHtml(item.detail)}</p>
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
    return toLabel(
      value.label ?? value.name ?? value.title ?? value.text ?? value.value ?? value.detail ?? value.summary ?? value.reason ?? value.description ?? value.item ?? '',
      fallback
    );
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

function scoreTone(score) {
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

function metricScore(metrics, label) {
  const target = normalizeText(label);
  const match = (Array.isArray(metrics) ? metrics : []).find((metric) => normalizeText(metric?.label || metric?.key || '') === target);
  if (match) return clamp(Math.round(Number(match.score) || 0), 1, 10);

  const fuzzy = (Array.isArray(metrics) ? metrics : []).find((metric) => normalizeText(metric?.label || metric?.key || '').includes(target) || target.includes(normalizeText(metric?.label || metric?.key || '')));
  if (fuzzy) return clamp(Math.round(Number(fuzzy.score) || 0), 1, 10);

  return 5;
}

function computeExecutionEase(selectedChampions) {
  const complexTerms = ['exigente', 'técnico', 'tecnico', 'difícil', 'dificil', 'caótico', 'caotico', 'mecánico', 'mecanico', 'preciso'];
  const complexityHits = selectedChampions.reduce((total, champion) => {
    const text = [champion.champion, champion.identity, champion.function, champion.tempo].filter(Boolean).join(' ').toLowerCase();
    return total + (complexTerms.some((term) => text.includes(term)) ? 1 : 0);
  }, 0);

  const ease = 10 - complexityHits * 2;
  return clamp(ease, 1, 10);
}
