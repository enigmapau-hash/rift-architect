const DEFAULT_TITLE = 'Informe ejecutivo';
const DEFAULT_PICK_TITLE = 'Recomendación del último pick';

export function renderAnalysisStory(root, story = {}) {
  if (!root) return;
  root.hidden = false;
  root.innerHTML = buildDashboardHTML(story, 'analysis');
}

export function renderLastPickState(root, story = {}) {
  if (!root) return;
  root.hidden = false;
  root.innerHTML = buildDashboardHTML(story, 'last-pick');
}

export function renderAnalysisEmptyState(root) {
  if (!root) return;
  root.hidden = false;
  root.innerHTML = `
    <section class="analysis-dashboard analysis-hub__shell">
      <article class="analysis-dashboard__empty">
        <p class="eyebrow">Bloque 2 · Informe ejecutivo</p>
        <h4>Selecciona cinco campeones para ver el análisis</h4>
        <p>Primero verás una lectura breve y después el plan, las fortalezas, los riesgos y los bans.</p>
      </article>
    </section>
  `;
}

export function renderLastPickEmptyState(root, story = {}) {
  if (!root) return;
  root.hidden = false;
  root.innerHTML = `
    <section class="analysis-dashboard analysis-hub__shell">
      <article class="analysis-dashboard__empty">
        <p class="eyebrow">Bloque 2 · Último pick</p>
        <h4>No hay una recomendación clara todavía</h4>
        <p>${escapeHtml(summarize(pick(story.summaryText, story.summary, 'Añade cuatro campeones y deja un hueco para ver la recomendación del último slot.')))}</p>
      </article>
    </section>
  `;
}

function buildDashboardHTML(story, mode) {
  const model = buildModel(story, mode);
  const cards = mode === 'last-pick' ? buildLastPickCards(model) : buildAnalysisCards(model);

  return `
    <section class="analysis-dashboard analysis-hub__shell">
      <article class="analysis-dashboard__card" style="grid-column: 1 / -1;">
        ${renderSummary(model)}
      </article>
      <div class="analysis-dashboard__grid" style="grid-column: 1 / -1;">
        ${cards.join('')}
      </div>
    </section>
  `;
}

function buildModel(story, mode) {
  const confidence = clamp(Number(story.confidence ?? story.bestPick?.score ?? 0), 0, 100);
  const grade = pick(story.grade, confidence >= 85 ? 'A' : confidence >= 70 ? 'B' : confidence >= 55 ? 'C' : 'D');
  const scoreBadge = pick(story.scoreBadge, confidence >= 80 ? 'Muy fuerte' : confidence >= 65 ? 'Fuerte' : confidence >= 50 ? 'Media' : 'Baja');
  const title = pick(story.title, mode === 'last-pick' ? DEFAULT_PICK_TITLE : DEFAULT_TITLE);

  const primaryIdentity = pick(story.primaryIdentity, story.identity?.primaryIdentity, 'Identidad por cerrar');
  const tempo = pick(story.tempo, story.identity?.tempo, 'Por cerrar');
  const dominance = pick(story.dominance, story.identity?.dominance, 'Por cerrar');
  const focus = pick(story.strategic?.focus, story.identity?.focus, story.contextual?.headline, 'Por cerrar');
  const winLabel = pick(story.contextual?.victory?.label, story.contextual?.matchup?.label, story.strategic?.headline, focus);
  const summaryText = summarize(
    pick(
      mode === 'last-pick'
        ? story.summaryText || story.summary || story.bestPick?.reason || story.strategic?.summary
        : story.summaryText || story.identityCopy || story.contextual?.summary || story.strategic?.summary,
      mode === 'last-pick'
        ? 'Añade cuatro campeones y deja un hueco para ver la recomendación del último slot.'
        : 'Selecciona cinco campeones para ver un informe ejecutivo de la composición.'
    ),
    mode === 'last-pick' ? 150 : 170,
  );

  const knowledge = story.knowledgeV3 || {};
  const strategic = story.strategic || {};
  const phases = normalizePhases(story.phases);
  const strengths = normalizeRanked(story.strengths, 'Fortaleza');
  const weaknesses = normalizeRanked(story.weaknesses, 'Debilidad');
  const bans = normalizeBans(story.bans);
  const strategicClaims = normalizeClaims(strategic.claims).slice(0, 4);
  const knowledgeClaims = normalizeClaims(knowledge.claims).slice(0, 4);

  return {
    mode,
    title,
    summaryText,
    confidence,
    grade,
    scoreBadge,
    primaryIdentity,
    tempo,
    dominance,
    focus,
    winLabel,
    knowledge,
    strategic,
    phases,
    strengths,
    weaknesses,
    bans,
    strategicClaims,
    knowledgeClaims,
    bestPick: normalizeBestPick(story.bestPick),
    alternatives: normalizeAlternatives(story.alternatives),
    needs: uniqueText(Array.isArray(story.profile?.needs) ? story.profile.needs : []).slice(0, 4),
    identityTokens: uniqueText([primaryIdentity, tempo, dominance, story.identity?.focus, ...(Array.isArray(story.secondaryIdentities) ? story.secondaryIdentities : [])]).slice(0, 4),
    summaryTokens: uniqueText([primaryIdentity, tempo, focus, winLabel, scoreBadge, ...(Array.isArray(story.tags) ? story.tags : [])]).slice(0, 5),
    heroMetrics: mode === 'last-pick'
      ? [
          { label: 'Rol', value: pick(story.targetRoleLabel, story.targetRole, 'Por cerrar') },
          { label: 'Objetivo', value: pick(story.focus, focus, 'Cierre') },
          { label: 'Score', value: `${String(confidence)}%` },
        ]
      : [
          { label: 'Identidad', value: primaryIdentity },
          { label: 'Tempo', value: tempo },
          { label: 'Plan', value: focus },
        ],
    strategicTokens: uniqueText([
      pick(strategic.focus, ''),
      pick(strategic.dominantWindow, strategic.metrics?.dominantWindow, ''),
      pick(strategic.execution?.label, ''),
      pick(strategic.contingency?.label, ''),
      pick(strategic.adaptation?.label, ''),
      ...(Array.isArray(strategic.signals) ? strategic.signals : []),
    ]).slice(0, 6),
    knowledgeTokens: uniqueText([
      pick(knowledge.primaryStyle?.label, knowledge.style?.label, ''),
      pick(knowledge.matchup?.label, ''),
      pick(knowledge.macro?.label, ''),
      pick(knowledge.vision?.label, ''),
      pick(knowledge.tempo?.label, ''),
      pick(knowledge.objectives?.label, ''),
      pick(knowledge.victory?.label, ''),
      pick(knowledge.defeat?.label, ''),
      pick(knowledge.mistake?.label, ''),
      ...(Array.isArray(knowledge.tags) ? knowledge.tags : []),
    ]).slice(0, 6),
    dependencyClaims: normalizeClaims([
      ...(Array.isArray(strategic.dependencies) ? strategic.dependencies : []),
      ...(Array.isArray(strategic.cascades) ? strategic.cascades : []),
      ...(Array.isArray(strategic.conflicts) ? strategic.conflicts : []),
      ...(Array.isArray(strategic.risks) ? strategic.risks : []),
    ]).slice(0, 4),
    riskClaims: normalizeClaims([
      ...(Array.isArray(strategic.risks) ? strategic.risks : []),
      ...(Array.isArray(strategic.conflicts) ? strategic.conflicts : []),
    ]).slice(0, 4),
    signalTokens: uniqueText([
      ...(Array.isArray(strategic.signals) ? strategic.signals : []),
      ...(Array.isArray(story.synergyHighlights) ? story.synergyHighlights : []),
      ...(Array.isArray(story.riskHighlights) ? story.riskHighlights : []),
    ]).slice(0, 6),
  };
}

function renderSummary(model) {
  return `
    <div class="analysis-dashboard__hero">
      <div class="analysis-dashboard__hero-copy">
        <p class="eyebrow">${escapeHtml(model.mode === 'last-pick' ? 'Bloque 2 · Último pick' : 'Bloque 2 · Informe ejecutivo')}</p>
        <h4>${escapeHtml(model.title)}</h4>
        <p class="analysis-dashboard__lede">${escapeHtml(model.summaryText)}</p>
        ${model.summaryTokens.length ? `<div class="analysis-dashboard__tokens">${renderTokens(model.summaryTokens, 'info')}</div>` : ''}
      </div>

      <aside class="analysis-dashboard__score ${scoreTone(model.confidence)}">
        <span class="analysis-dashboard__score-label">Lectura rápida</span>
        <strong class="analysis-dashboard__score-value">${escapeHtml(model.grade)}</strong>
        <span class="analysis-dashboard__score-note">${escapeHtml(model.scoreBadge)} · ${escapeHtml(String(model.confidence))}%</span>
        <div class="analysis-dashboard__score-grid">
          ${renderMetric(model.heroMetrics[0])}
          ${renderMetric(model.heroMetrics[1])}
          ${renderMetric(model.heroMetrics[2])}
        </div>
      </aside>
    </div>
  `;
}

function buildAnalysisCards(model) {
  return [
    renderCard(1, 'identity', 'Identidad', 'Qué plan representa y cómo se lee', 4, `
      <p class="analysis-dashboard__lead">${escapeHtml(model.primaryIdentity)}</p>
      <div class="analysis-dashboard__metric-grid">
        ${renderMetric({ label: 'Tempo', value: model.tempo })}
        ${renderMetric({ label: 'Dominancia', value: model.dominance })}
        ${renderMetric({ label: 'Lectura', value: model.focus })}
      </div>
      <div class="analysis-dashboard__tokens">${renderTokens(model.identityTokens, 'muted')}</div>
    `),
    renderCard(2, 'plan', 'Plan de partida', 'Qué hace cada fase y cuándo debe jugar', 4, `
      ${model.phases.length ? renderStack(model.phases.map(renderPhaseItem), 'coach') : renderNote('Todavía no hay un plan detallado.')}
    `),
    renderCard(3, 'knowledge', 'Knowledge Layer', 'Identidad, macro, visión y condición de victoria', 4, `
      <p class="analysis-dashboard__lead">${escapeHtml(pick(model.knowledge.lead, model.knowledge.summary, 'La capa de conocimiento todavía no tiene una lectura dominante.'))}</p>
      <div class="analysis-dashboard__metric-grid">
        ${renderMetric({ label: 'Estilo', value: pick(model.knowledge.primaryStyle?.label, model.knowledge.style?.label, 'Por cerrar') })}
        ${renderMetric({ label: 'Matchup', value: pick(model.knowledge.matchup?.label, 'Por cerrar') })}
        ${renderMetric({ label: 'Victoria', value: pick(model.knowledge.victory?.label, 'Por cerrar') })}
      </div>
      <div class="analysis-dashboard__tokens">${renderTokens(model.knowledgeTokens, 'info')}</div>
      ${model.knowledgeClaims.length ? renderStack(model.knowledgeClaims.map((claim) => renderClaim(claim, 'muted')), 'muted') : renderNote('Sin reglas explícitas por ahora.')}
    `),
    renderCard(4, 'strengths', 'Fortalezas', 'A favor del plan', 4, renderRankedStack(model.strengths, 'success', 'Sin fortalezas claras')),
    renderCard(5, 'weaknesses', 'Debilidades', 'A vigilar', 4, renderRankedStack(model.weaknesses, 'danger', 'Sin debilidades claras')),
    renderCard(6, 'bans', 'Bans prioritarios', 'Lo que más rompe el plan', 4, model.bans.length ? renderStack(model.bans.map(renderBan), 'danger') : renderNote('Sin bans calculados.')),
    renderCard(7, 'timeline', 'Plan por fases', 'Early · Mid · Late', 6, model.phases.length ? renderStack(model.phases.map(renderPhaseItem), 'coach') : renderNote('Todavía no hay un plan por fases.')),
    renderCard(8, 'signals', 'Lectura estratégica', 'Dependencias, señales, sinergias y riesgos', 6, `
      <div class="analysis-dashboard__mini-grid">
        ${renderMiniPanel('Dependencias', model.dependencyClaims, 'Sin dependencias claras.')}
        ${renderMiniPanel('Señales', model.signalTokens, 'Sin señales destacadas.')}
        ${renderMiniPanel('Sinergias', model.knowledgeTokens.slice(0, 3), 'Sin sinergias claras.')}
        ${renderMiniPanel('Riesgos', model.riskClaims, 'Sin riesgos claros.')}
      </div>
    `),
  ];
}

function buildLastPickCards(model) {
  return [
    renderCard(1, 'best-pick', 'Mejor pick', 'La opción que cierra mejor el draft', 4, `
      <div class="analysis-dashboard__best-pick">
        <strong class="analysis-dashboard__best-pick-name">${escapeHtml(pick(model.bestPick.champion, model.bestPick.name, 'Sin recomendación'))}</strong>
        <span class="analysis-dashboard__best-pick-score">${escapeHtml(model.bestPick.role || 'Último slot')}</span>
      </div>
      <p class="analysis-dashboard__lead">${escapeHtml(pick(model.bestPick.reason, model.bestPick.detail, 'Añade cuatro campeones y deja un hueco para ver la recomendación.'))}</p>
      <div class="analysis-dashboard__metric-grid">
        ${renderMetric({ label: 'Rol', value: pick(model.bestPick.roleLabel, model.bestPick.role, 'Por cerrar') })}
        ${renderMetric({ label: 'Score', value: model.bestPick.score != null ? `${String(clamp(Number(model.bestPick.score), 0, 100))}%` : 'Por cerrar' })}
        ${renderMetric({ label: 'Encaje', value: pick(model.bestPick.fit, 'Por cerrar') })}
      </div>
    `),
    renderCard(2, 'alternatives', 'Alternativas', 'Opciones útiles si el pick principal no sale', 4, model.alternatives.length ? renderStack(model.alternatives.map(renderAlternative), 'muted') : renderNote('Sin alternativas claras todavía.')),
    renderCard(3, 'focus', 'Necesidades', 'Qué le falta a la composición para cerrarse', 4, `
      <div class="analysis-dashboard__metric-grid">
        ${renderMetric({ label: 'Objetivo', value: pick(model.focus, 'Por cerrar') })}
        ${renderMetric({ label: 'Rol', value: pick(model.heroMetrics[0]?.value, 'Por cerrar') })}
        ${renderMetric({ label: 'Urgencia', value: pick(model.scoreBadge, 'Media') })}
      </div>
      <div class="analysis-dashboard__tokens">${renderTokens(model.needs, 'coach')}</div>
    `),
    renderCard(4, 'strategy', 'Apoyo estratégico', 'La lectura del motor para cerrar el draft', 12, `
      <p class="analysis-dashboard__lead">${escapeHtml(pick(model.strategic.summary, model.strategic.focus, 'Lectura estratégica todavía en desarrollo.'))}</p>
      ${model.strategicTokens.length ? `<div class="analysis-dashboard__tokens">${renderTokens(model.strategicTokens, 'info')}</div>` : ''}
      ${model.strategicClaims.length ? renderStack(model.strategicClaims.map((claim) => renderClaim(claim, 'coach')), 'coach') : renderNote('Sin soporte estratégico claro.')}
    `),
  ];
}

function renderCard(step, variant, title, subtitle, span, body) {
  return `
    <article class="analysis-dashboard__card analysis-dashboard__card--${escapeHtml(variant)}" style="grid-column: span ${span};">
      <div class="analysis-dashboard__section-head">
        <span class="analysis-dashboard__section-step">${escapeHtml(step)}</span>
        <div class="analysis-dashboard__section-title">
          <strong>${escapeHtml(title)}</strong>
          <span class="analysis-dashboard__section-subtitle">${escapeHtml(subtitle)}</span>
        </div>
      </div>
      ${body}
    </article>
  `;
}

function renderMetric(metric = {}) {
  return `
    <article class="analysis-dashboard__metric">
      <span class="analysis-dashboard__metric-label">${escapeHtml(metric.label || 'Dato')}</span>
      <strong class="analysis-dashboard__metric-value">${escapeHtml(pick(metric.value, 'Por cerrar'))}</strong>
    </article>
  `;
}

function renderStack(items = []) {
  if (!items.length) return '';
  return `<div class="analysis-dashboard__stack">${items.join('')}</div>`;
}

function renderNote(text) {
  return `<p class="analysis-dashboard__note">${escapeHtml(text)}</p>`;
}

function renderTokens(values = [], tone = 'info') {
  const list = uniqueText(Array.isArray(values) ? values : []).slice(0, 6);
  return list.map((value) => `<span class="analysis-dashboard__token analysis-dashboard__token--${escapeHtml(tone)}">${escapeHtml(value)}</span>`).join('');
}

function renderClaim(claim = {}, tone = 'muted') {
  return `
    <article class="analysis-dashboard__item analysis-dashboard__item--${escapeHtml(tone)}">
      <div class="analysis-dashboard__item-head">
        <strong>${escapeHtml(pick(claim.label, claim.title, 'Lectura'))}</strong>
        ${claim.kind ? `<span>${escapeHtml(claim.kind)}</span>` : ''}
      </div>
      <p>${escapeHtml(summarize(pick(claim.detail, claim.summary, claim.text, ''), 110) || 'Sin detalle adicional.')}</p>
      ${Array.isArray(claim.evidence) && claim.evidence.length ? `<div class="analysis-dashboard__tokens">${renderTokens(claim.evidence, tone)}</div>` : ''}
    </article>
  `;
}

function renderRankedStack(items = [], tone = 'muted', emptyLabel = 'Sin datos') {
  if (!items.length) return renderNote(emptyLabel);
  return renderStack(items.map((item) => renderRanked(item, tone)));
}

function renderRanked(item = {}, tone = 'muted') {
  const score = Number.isFinite(Number(item.score)) ? clamp(Number(item.score), 0, 100) : null;
  return `
    <article class="analysis-dashboard__item analysis-dashboard__item--${escapeHtml(tone)}">
      <div class="analysis-dashboard__item-head">
        <strong>${escapeHtml(pick(item.label, item.title, item.name, 'Elemento'))}</strong>
        ${pick(item.badge, item.priority, item.kind, '') ? `<span>${escapeHtml(pick(item.badge, item.priority, item.kind, ''))}</span>` : ''}
      </div>
      ${score != null ? `<div class="analysis-dashboard__bar" aria-hidden="true"><div class="analysis-dashboard__bar-fill analysis-dashboard__bar-fill--${escapeHtml(tone)}" style="--meter:${score}%"></div></div>` : ''}
      <p>${escapeHtml(summarize(pick(item.detail, item.summary, item.text, ''), 100) || 'Sin detalle adicional.')}</p>
    </article>
  `;
}

function renderBan(item = {}, index = 0) {
  return `
    <article class="analysis-dashboard__item analysis-dashboard__item--danger">
      <div class="analysis-dashboard__item-head">
        <strong>${escapeHtml(pick(item.champion, item.name, `Ban ${index + 1}`))}</strong>
        <span>Ban ${index + 1}</span>
      </div>
      <p>${escapeHtml(summarize(pick(item.reason, item.detail, item.summary, 'Impacto directo sobre el plan.'), 110))}</p>
    </article>
  `;
}

function renderPhaseItem(phase = {}) {
  return `
    <article class="analysis-dashboard__item analysis-dashboard__item--coach">
      <div class="analysis-dashboard__item-head">
        <strong>${escapeHtml(pick(phase.label, phase.phase, phase.title, 'Fase'))}</strong>
        ${pick(phase.title, '') ? `<span>${escapeHtml(phase.title)}</span>` : ''}
      </div>
      <p>${escapeHtml(summarize(pick(phase.detail, phase.description, phase.summary, ''), 120) || 'Paso a paso del plan.')}</p>
      ${Array.isArray(phase.actions) && phase.actions.length ? `<div class="analysis-dashboard__tokens">${renderTokens(phase.actions, 'coach')}</div>` : ''}
    </article>
  `;
}

function renderMiniPanel(title, values = [], emptyLabel = 'Sin datos') {
  const list = Array.isArray(values) ? values.slice(0, 3) : [];
  return `
    <article class="analysis-dashboard__mini-panel">
      <span class="analysis-dashboard__mini-title">${escapeHtml(title)}</span>
      ${list.length ? `<div class="analysis-dashboard__tokens">${renderTokens(list, 'info')}</div>` : `<p class="analysis-dashboard__mini-subtitle">${escapeHtml(emptyLabel)}</p>`}
    </article>
  `;
}

function renderAlternative(item = {}) {
  return `
    <article class="analysis-dashboard__item analysis-dashboard__item--muted">
      <div class="analysis-dashboard__item-head">
        <strong>${escapeHtml(pick(item.label, item.name, item.champion, 'Alternativa'))}</strong>
        ${item.score != null ? `<span>${escapeHtml(String(clamp(Number(item.score), 0, 100)))}%</span>` : ''}
      </div>
      <p>${escapeHtml(summarize(pick(item.detail, item.reason, item.summary, ''), 100) || 'Encaje contextual.')}</p>
    </article>
  `;
}

function normalizeRanked(items = [], fallbackLabel = 'Elemento') {
  if (!Array.isArray(items)) return [];
  return items.map((item, index) => {
    if (!item) return null;
    if (typeof item === 'string') return cleanText(item) ? { label: cleanText(item), detail: '', badge: '', score: null } : null;
    const score = Number.isFinite(Number(item.score ?? item.value ?? item.weight)) ? Number(item.score ?? item.value ?? item.weight) : null;
    return {
      label: pick(item.label, item.title, item.name, `${fallbackLabel} ${index + 1}`),
      detail: pick(item.detail, item.summary, item.text, item.reason, ''),
      badge: pick(item.badge, item.priority, item.kind, ''),
      score,
      tags: uniqueText([...(Array.isArray(item.tags) ? item.tags : []), ...(Array.isArray(item.evidence) ? item.evidence : [])]),
    };
  }).filter(Boolean);
}

function normalizePhases(items = []) {
  if (!Array.isArray(items)) return [];
  return items.map((item, index) => {
    if (!item) return null;
    if (typeof item === 'string') return cleanText(item) ? { label: cleanText(item), detail: '', title: '', actions: [] } : null;
    return {
      label: pick(item.label, item.phase, item.title, `Fase ${index + 1}`),
      title: pick(item.title, item.name, ''),
      detail: pick(item.detail, item.description, item.summary, ''),
      actions: uniqueText(Array.isArray(item.actions) ? item.actions : []),
    };
  }).filter(Boolean);
}

function normalizeBans(items = []) {
  if (!Array.isArray(items)) return [];
  return items.map((item, index) => {
    if (!item) return null;
    if (typeof item === 'string') return cleanText(item) ? { champion: cleanText(item), reason: '' } : null;
    return { champion: pick(item.champion, item.name, `Ban ${index + 1}`), reason: pick(item.reason, item.detail, item.summary, '') };
  }).filter(Boolean);
}

function normalizeClaims(items = []) {
  if (!Array.isArray(items)) return [];
  return items.map((item) => {
    if (!item) return null;
    if (typeof item === 'string') {
      const text = cleanText(item);
      return text ? { label: text, detail: text, kind: '', priority: '', evidence: [] } : null;
    }
    const label = pick(item.label, item.title, item.name, '');
    const detail = pick(item.detail, item.summary, item.text, item.reason, '');
    if (!label && !detail) return null;
    return {
      label: label || detail,
      detail: detail || label,
      kind: pick(item.kind, ''),
      priority: pick(item.priority, ''),
      evidence: uniqueText(Array.isArray(item.evidence) ? item.evidence : []),
    };
  }).filter(Boolean);
}

function normalizeBestPick(item = null) {
  if (!item || typeof item !== 'object') return {};
  return {
    champion: pick(item.champion, item.name, ''),
    name: pick(item.name, item.champion, ''),
    role: pick(item.role, item.roleLabel, ''),
    roleLabel: pick(item.roleLabel, item.role, ''),
    reason: pick(item.reason, item.detail, item.summary, ''),
    detail: pick(item.detail, item.reason, ''),
    fit: pick(item.fit, item.tags?.[0], ''),
    score: Number.isFinite(Number(item.score)) ? Number(item.score) : null,
  };
}

function normalizeAlternatives(items = []) {
  if (!Array.isArray(items)) return [];
  return items.map((item) => {
    if (!item) return null;
    if (typeof item === 'string') return cleanText(item) ? { label: cleanText(item), detail: '', score: null } : null;
    return {
      label: pick(item.label, item.name, item.champion, ''),
      detail: pick(item.detail, item.reason, item.summary, ''),
      score: Number.isFinite(Number(item.score)) ? Number(item.score) : null,
    };
  }).filter(Boolean);
}

function scoreTone(score = 0) {
  const value = Number(score) || 0;
  if (value >= 80) return 'analysis-dashboard__score--high';
  if (value >= 65) return 'analysis-dashboard__score--medium';
  if (value >= 50) return 'analysis-dashboard__score--low';
  return 'analysis-dashboard__score--critical';
}

function pick(...values) {
  for (const value of values) {
    const text = stringify(value);
    if (text) return text;
  }
  return '';
}

function stringify(value) {
  if (value == null) return '';
  if (Array.isArray(value)) return uniqueText(value).join(' · ');
  if (typeof value === 'object') return pick(value.label, value.title, value.name, value.headline, value.summary, value.detail, value.text, value.value, value.focus, value.role, value.kind, value.badge);
  const text = cleanText(value);
  if (!text) return '';
  const normalized = normalize(text);
  if (!normalized || ['sindefinir', 'undefined', 'null', 'nan'].includes(normalized)) return '';
  return text;
}

function uniqueText(values = []) {
  const seen = new Set();
  const result = [];
  for (const value of Array.isArray(values) ? values : [values]) {
    const text = stringify(value);
    if (!text) continue;
    const key = normalize(text);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(text);
  }
  return result;
}

function normalize(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function cleanText(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function summarize(value, limit = 160) {
  const text = cleanText(value);
  if (!text) return '';
  return text.length <= limit ? text : `${text.slice(0, limit - 1).trimEnd()}…`;
}

function clamp(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, number));
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
