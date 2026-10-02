const DEFAULT_TITLE = 'Informe ejecutivo';
const DEFAULT_PICK_TITLE = 'Recomendación del último pick';

export function renderAnalysisStory(root, story = {}) {
  if (!root) return;
  root.hidden = false;
  root.innerHTML = buildAnalysisDashboard(story, 'analysis');
}

export function renderLastPickState(root, story = {}) {
  if (!root) return;
  root.hidden = false;
  root.innerHTML = buildAnalysisDashboard(story, 'last-pick');
}

export function renderAnalysisEmptyState(root) {
  if (!root) return;
  root.hidden = false;
  root.innerHTML = `
    <section class="analysis-dashboard analysis-hub__shell">
      <article class="analysis-dashboard__empty">
        <p class="eyebrow">Bloque 2 · Informe ejecutivo</p>
        <h4>Selecciona cinco campeones para ver el análisis</h4>
        <p>Primero verás un resumen ejecutivo y después el plan, las fortalezas, los riesgos y los bans.</p>
      </article>
    </section>
  `;
}

export function renderLastPickEmptyState(root, story = {}) {
  if (!root) return;
  const summary = summarizeText(
    pickText(story.summaryText, story.summary, 'Añade cuatro campeones y deja un hueco para ver la recomendación del último slot.'),
    150,
  );

  root.hidden = false;
  root.innerHTML = `
    <section class="analysis-dashboard analysis-hub__shell">
      <article class="analysis-dashboard__empty">
        <p class="eyebrow">Bloque 2 · Último pick</p>
        <h4>No hay una recomendación clara todavía</h4>
        <p>${escapeHtml(summary)}</p>
      </article>
    </section>
  `;
}

function buildAnalysisDashboard(story, mode) {
  const tags = uniqueText(asArray(story.tags)).slice(0, 5);
  const confidence = clamp(Number(story.confidence ?? 0), 0, 100);
  const primaryTitle = mode === 'last-pick'
    ? pickText(story.title, DEFAULT_PICK_TITLE)
    : pickText(story.title, DEFAULT_TITLE);

  const summaryText = summarizeText(
    mode === 'last-pick'
      ? pickText(
        story.summaryText,
        story.summary,
        'Te falta un campeón para cerrar la composición.',
      )
      : pickText(
        story.summaryText,
        story.identityCopy,
        story.contextual?.summary,
        'Selecciona cinco campeones para ver un informe ejecutivo de la composición.',
      ),
    160,
  );

  if (mode === 'last-pick') {
    return renderLastPickDashboard(story, {
      title: primaryTitle,
      summaryText,
      tags,
      confidence,
    });
  }

  return renderExecutiveDashboard(story, {
    title: primaryTitle,
    summaryText,
    tags,
    confidence,
  });
}

function renderExecutiveDashboard(story, meta) {
  const strengths = normalizeItemList(story.strengths).slice(0, 3);
  const weaknesses = normalizeItemList(story.weaknesses).slice(0, 3);
  const phases = normalizePhaseList(story.phases).slice(0, 3);
  const bans = normalizeBanList(story.bans).slice(0, 3);
  const rules = normalizeRuleList(story.contextual?.rules).slice(0, 4);
  const signals = uniqueText(asArray(story.contextual?.signals)).slice(0, 4);
  const synergies = uniqueText(asArray(story.synergyHighlights)).slice(0, 3);
  const risks = uniqueText(asArray(story.riskHighlights)).slice(0, 3);
  const secondary = uniqueText([
    ...asArray(story.secondaryIdentities),
    pickText(story.identity?.focus, ''),
    pickText(story.identity?.dominance, ''),
  ])
    .filter(Boolean)
    .filter((value) => value !== pickText(story.primaryIdentity, ''))
    .slice(0, 3);

  const primaryIdentity = pickText(story.primaryIdentity, 'Identidad por cerrar');
  const tempo = pickText(story.tempo, 'Por definir');
  const dominance = pickText(story.dominance, 'Por definir');
  const focus = pickText(story.identity?.focus, story.focus, 'Composición por cerrar');
  const grade = pickText(story.grade, 'B');
  const scoreBadge = pickText(story.scoreBadge, 'Media');
  const scoreTone = scoreToneClass(meta.confidence);

  return `
    <section class="analysis-dashboard analysis-hub__shell">
      <header class="analysis-dashboard__hero">
        <div class="analysis-dashboard__hero-copy">
          <p class="eyebrow">Bloque 2 · Informe ejecutivo</p>
          <h4>${escapeHtml(meta.title)}</h4>
          <p class="analysis-dashboard__lede">${escapeHtml(meta.summaryText)}</p>
          <div class="analysis-dashboard__tokens">
            ${renderToken('1 · Identidad', 'info')}
            ${renderToken('2 · Plan', 'info')}
            ${renderToken('3 · Fortalezas', 'success')}
            ${renderToken('4 · Riesgos', 'danger')}
          </div>
          ${meta.tags.length ? `<div class="analysis-dashboard__tokens">${meta.tags.map((tag) => renderToken(tag, 'muted')).join('')}</div>` : ''}
        </div>

        <aside class="analysis-dashboard__score ${scoreTone}">
          <span class="analysis-dashboard__score-label">Lectura rápida</span>
          <strong class="analysis-dashboard__score-value">${escapeHtml(grade)}</strong>
          <span class="analysis-dashboard__score-note">${escapeHtml(scoreBadge)} · ${escapeHtml(String(meta.confidence))}%</span>
          <div class="analysis-dashboard__score-grid">
            ${renderMetric('Identidad', primaryIdentity)}
            ${renderMetric('Tempo', tempo)}
            ${renderMetric('Plan', focus)}
          </div>
        </aside>
      </header>

      <div class="analysis-dashboard__grid">
        ${renderIdentityCard({
          primaryIdentity,
          tempo,
          dominance,
          focus,
          secondary,
        })}
        ${renderPlanCard(phases)}
        ${renderListCard({
          spanClass: 'analysis-dashboard__card--strengths',
          step: '3',
          title: 'Fortalezas',
          subtitle: 'A favor del plan',
          items: strengths,
          tone: 'success',
          empty: 'Sin fortalezas claras',
        })}
        ${renderListCard({
          spanClass: 'analysis-dashboard__card--weaknesses',
          step: '4',
          title: 'Debilidades',
          subtitle: 'A vigilar',
          items: weaknesses,
          tone: 'danger',
          empty: 'Sin debilidades claras',
        })}
        ${renderBansCard({ bans })}
        ${renderStrategyCard({
          rules,
          signals,
          synergies,
          risks,
          strategic: story.strategic,
          contextual: story.contextual,
        })}
      </div>
    </section>
  `;
}

function renderLastPickDashboard(story, meta) {
  const bestPick = normalizePick(story.bestPick);
  const alternatives = normalizeItemList(story.alternatives).slice(0, 3);
  const needs = uniqueText(asArray(story.profile?.needs)).slice(0, 4);
  const rules = normalizeRuleList(story.contextual?.rules).slice(0, 4);
  const signals = uniqueText(asArray(story.contextual?.signals)).slice(0, 4);
  const synergies = uniqueText(asArray(story.synergyHighlights)).slice(0, 3);
  const risks = uniqueText(asArray(story.riskHighlights)).slice(0, 3);
  const targetRole = pickText(story.targetRoleLabel, story.targetRole, 'Sin definir');
  const focus = pickText(story.focus, 'Cerrar el draft');
  const scoreTone = scoreToneClass(meta.confidence);

  return `
    <section class="analysis-dashboard analysis-hub__shell">
      <header class="analysis-dashboard__hero">
        <div class="analysis-dashboard__hero-copy">
          <p class="eyebrow">Bloque 2 · Último pick</p>
          <h4>${escapeHtml(meta.title)}</h4>
          <p class="analysis-dashboard__lede">${escapeHtml(meta.summaryText)}</p>
          <div class="analysis-dashboard__tokens">
            ${renderToken('1 · Cierre', 'info')}
            ${renderToken('2 · Encaje', 'info')}
            ${renderToken('3 · Alternativas', 'muted')}
          </div>
          ${meta.tags.length ? `<div class="analysis-dashboard__tokens">${meta.tags.map((tag) => renderToken(tag, 'muted')).join('')}</div>` : ''}
        </div>

        <aside class="analysis-dashboard__score ${scoreTone}">
          <span class="analysis-dashboard__score-label">Último slot</span>
          <strong class="analysis-dashboard__score-value">${escapeHtml(targetRole)}</strong>
          <span class="analysis-dashboard__score-note">${escapeHtml(focus)}</span>
          <div class="analysis-dashboard__score-grid">
            ${renderMetric('Score', String(bestPick.score ?? meta.confidence ?? 0))}
            ${renderMetric('Rol', targetRole)}
            ${renderMetric('Objetivo', focus)}
          </div>
        </aside>
      </header>

      <div class="analysis-dashboard__grid">
        ${renderBestPickCard({ bestPick, story })}
        ${renderAlternativesCard(alternatives)}
        ${renderFocusCard({ needs })}
        ${renderStrategyCard({
          rules,
          signals,
          synergies,
          risks,
          strategic: story.strategic,
          contextual: story.contextual,
        })}
      </div>
    </section>
  `;
}

function renderIdentityCard({ primaryIdentity, tempo, dominance, focus, secondary }) {
  const facts = [
    ['Tempo', tempo],
    ['Dominancia', dominance],
    ['Lectura', focus],
  ];

  return `
    <article class="analysis-dashboard__card analysis-dashboard__card--identity">
      <div class="analysis-dashboard__section-head">
        <span class="analysis-dashboard__section-step">1</span>
        <div class="analysis-dashboard__section-title">
          <strong>Identidad</strong>
          <span class="analysis-dashboard__section-subtitle">Qué plan representa y cómo se lee</span>
        </div>
      </div>
      <p class="analysis-dashboard__lead">${escapeHtml(primaryIdentity)}</p>
      <div class="analysis-dashboard__metric-grid">
        ${facts.map(([label, value]) => renderFact(label, value)).join('')}
      </div>
      ${secondary.length ? `<div class="analysis-dashboard__tokens">${secondary.map((item) => renderToken(item, 'muted')).join('')}</div>` : '<div class="analysis-dashboard__note">Sin lecturas secundarias claras.</div>'}
    </article>
  `;
}

function renderPlanCard(phases) {
  return `
    <article class="analysis-dashboard__card analysis-dashboard__card--plan">
      <div class="analysis-dashboard__section-head">
        <span class="analysis-dashboard__section-step">2</span>
        <div class="analysis-dashboard__section-title">
          <strong>Plan de partida</strong>
          <span class="analysis-dashboard__section-subtitle">Early · Mid · Late</span>
        </div>
      </div>
      <div class="analysis-dashboard__stack">
        ${phases.length
          ? phases.map((phase, index) => renderPhaseItem(phase, index)).join('')
          : '<div class="analysis-dashboard__note">Todavía no hay un plan detallado.</div>'}
      </div>
    </article>
  `;
}

function renderListCard({ spanClass, step, title, subtitle, items, tone, empty }) {
  return `
    <article class="analysis-dashboard__card ${spanClass}">
      <div class="analysis-dashboard__section-head">
        <span class="analysis-dashboard__section-step">${escapeHtml(step)}</span>
        <div class="analysis-dashboard__section-title">
          <strong>${escapeHtml(title)}</strong>
          <span class="analysis-dashboard__section-subtitle">${escapeHtml(subtitle)}</span>
        </div>
      </div>
      <div class="analysis-dashboard__stack">
        ${items.length ? items.map((item) => renderListItem(item, tone)).join('') : `<div class="analysis-dashboard__note">${escapeHtml(empty)}</div>`}
      </div>
    </article>
  `;
}

function renderBansCard({ bans }) {
  return `
    <article class="analysis-dashboard__card analysis-dashboard__card--bans">
      <div class="analysis-dashboard__section-head">
        <span class="analysis-dashboard__section-step">5</span>
        <div class="analysis-dashboard__section-title">
          <strong>Bans prioritarios</strong>
          <span class="analysis-dashboard__section-subtitle">Lo que más rompe el plan</span>
        </div>
      </div>
      <div class="analysis-dashboard__stack">
        ${bans.length ? bans.map((ban) => renderBanItem(ban)).join('') : '<div class="analysis-dashboard__note">Sin bans calculados.</div>'}
      </div>
    </article>
  `;
}

function renderStrategyCard({ rules, signals, synergies, risks, strategic = {}, contextual = {} }) {
  const lead = summarizeText(
    pickText(contextual?.summary, strategic?.summary, strategic?.focus, 'Lectura contextual del draft.'),
    130,
  );

  return `
    <article class="analysis-dashboard__card analysis-dashboard__card--strategy">
      <div class="analysis-dashboard__section-head">
        <span class="analysis-dashboard__section-step">6</span>
        <div class="analysis-dashboard__section-title">
          <strong>Lectura estratégica</strong>
          <span class="analysis-dashboard__section-subtitle">Dependencias, señales, sinergias y riesgos</span>
        </div>
      </div>
      <p class="analysis-dashboard__lead">${escapeHtml(lead)}</p>
      <div class="analysis-dashboard__mini-grid">
        ${renderMiniPanel('Dependencias', rules, 'Reglas, prioridades y constraints')}
        ${renderMiniPanel('Señales', signals, 'Pistas del plan y del tempo')}
        ${renderMiniPanel('Sinergias', synergies, 'Relaciones que suman valor')}
        ${renderMiniPanel('Riesgos', risks, 'Lo que exige más cuidado')}
      </div>
    </article>
  `;
}

function renderBestPickCard({ bestPick, story }) {
  const label = pickText(bestPick.champion, bestPick.name, bestPick.label, bestPick.title, 'Sin recomendación');
  const detail = summarizeText(
    pickText(bestPick.reason, bestPick.detail, bestPick.summary, story.summaryText, 'La recomendación todavía no está cerrada.'),
    120,
  );
  const score = clamp(Number(bestPick.score ?? story.confidence ?? 0), 0, 100);
  const tags = uniqueText(asArray(bestPick.tags)).slice(0, 3);

  return `
    <article class="analysis-dashboard__card analysis-dashboard__card--best-pick">
      <div class="analysis-dashboard__section-head">
        <span class="analysis-dashboard__section-step">1</span>
        <div class="analysis-dashboard__section-title">
          <strong>Último pick recomendado</strong>
          <span class="analysis-dashboard__section-subtitle">La pieza que mejor cierra la composición</span>
        </div>
      </div>
      <div class="analysis-dashboard__best-pick">
        <strong class="analysis-dashboard__best-pick-name">${escapeHtml(label)}</strong>
        <span class="analysis-dashboard__best-pick-score">${escapeHtml(String(score))}%</span>
      </div>
      <p class="analysis-dashboard__lead">${escapeHtml(detail)}</p>
      ${tags.length ? `<div class="analysis-dashboard__tokens">${tags.map((tag) => renderToken(tag, 'info')).join('')}</div>` : ''}
    </article>
  `;
}

function renderAlternativesCard(alternatives) {
  return `
    <article class="analysis-dashboard__card analysis-dashboard__card--alternatives">
      <div class="analysis-dashboard__section-head">
        <span class="analysis-dashboard__section-step">2</span>
        <div class="analysis-dashboard__section-title">
          <strong>Alternativas útiles</strong>
          <span class="analysis-dashboard__section-subtitle">Opciones que siguen el plan</span>
        </div>
      </div>
      <div class="analysis-dashboard__stack">
        ${alternatives.length ? alternatives.map((item) => renderListItem(item, 'muted')).join('') : '<div class="analysis-dashboard__note">Sin alternativas relevantes.</div>'}
      </div>
    </article>
  `;
}

function renderFocusCard({ needs }) {
  return `
    <article class="analysis-dashboard__card analysis-dashboard__card--focus">
      <div class="analysis-dashboard__section-head">
        <span class="analysis-dashboard__section-step">3</span>
        <div class="analysis-dashboard__section-title">
          <strong>Encaje del draft</strong>
          <span class="analysis-dashboard__section-subtitle">Qué necesita la composición</span>
        </div>
      </div>
      <div class="analysis-dashboard__stack">
        ${needs.length ? needs.map((need) => `<div class="analysis-dashboard__focus-item">${escapeHtml(need)}</div>`).join('') : '<div class="analysis-dashboard__note">Todavía no hay necesidades detectadas.</div>'}
      </div>
    </article>
  `;
}

function renderPhaseItem(phase, index) {
  const label = pickText(phase.phase, phase.label, `Fase ${index + 1}`);
  const title = pickText(phase.title, phase.kind, 'Prioridad');
  const detail = summarizeText(pickText(phase.detail, phase.description, phase.summary, 'Paso a paso del plan.'), 110);
  const actions = uniqueText(asArray(phase.actions)).slice(0, 3);

  return `
    <article class="analysis-dashboard__item">
      <div class="analysis-dashboard__item-head">
        <strong>${escapeHtml(label)}</strong>
        <span>${escapeHtml(title)}</span>
      </div>
      <p>${escapeHtml(detail)}</p>
      ${actions.length ? `<div class="analysis-dashboard__tokens">${actions.map((action) => renderToken(action, 'coach')).join('')}</div>` : ''}
    </article>
  `;
}

function renderListItem(item, tone) {
  const label = pickText(item.label, item.name, item.champion, item.title, 'Elemento');
  const badge = pickText(item.badge, item.priority, item.kind, '');
  const score = clamp(Number(item.score ?? item.value ?? 0), 0, 100);
  const detail = summarizeText(pickText(item.detail, item.description, item.summary, label), 92);
  const tags = uniqueText(asArray(item.tags)).slice(0, 3);

  return `
    <article class="analysis-dashboard__item analysis-dashboard__item--${tone}">
      <div class="analysis-dashboard__item-head">
        <strong>${escapeHtml(label)}</strong>
        <span>${escapeHtml(badge || tone)} · ${escapeHtml(String(score))}%</span>
      </div>
      <div class="analysis-dashboard__bar" aria-hidden="true">
        <div class="analysis-dashboard__bar-fill analysis-dashboard__bar-fill--${tone}" style="--meter:${score}%"></div>
      </div>
      <p>${escapeHtml(detail)}</p>
      ${tags.length ? `<div class="analysis-dashboard__tokens">${tags.map((tag) => renderToken(tag, tone)).join('')}</div>` : ''}
    </article>
  `;
}

function renderBanItem(ban) {
  const champion = pickText(ban.champion, ban.name, ban.label, 'Ban');
  const priority = pickText(ban.priority, ban.kind, 'ban');
  const score = clamp(Number(ban.score ?? ban.value ?? 0), 0, 100);
  const reason = summarizeText(pickText(ban.reason, ban.detail, ban.summary, 'Impacto directo sobre tu plan.'), 100);
  const tags = uniqueText(asArray(ban.tags)).slice(0, 3);

  return `
    <article class="analysis-dashboard__item analysis-dashboard__item--danger">
      <div class="analysis-dashboard__item-head">
        <strong>${escapeHtml(champion)}</strong>
        <span>${escapeHtml(priority)} · ${escapeHtml(String(score))}%</span>
      </div>
      <div class="analysis-dashboard__bar" aria-hidden="true">
        <div class="analysis-dashboard__bar-fill analysis-dashboard__bar-fill--danger" style="--meter:${score}%"></div>
      </div>
      <p>${escapeHtml(reason)}</p>
      ${tags.length ? `<div class="analysis-dashboard__tokens">${tags.map((tag) => renderToken(tag, 'danger')).join('')}</div>` : ''}
    </article>
  `;
}

function renderMiniPanel(title, values, subtitle) {
  const items = uniqueText(asArray(values)).slice(0, 3);

  return `
    <article class="analysis-dashboard__mini-panel">
      <div class="analysis-dashboard__mini-title">${escapeHtml(title)}</div>
      <p class="analysis-dashboard__mini-subtitle">${escapeHtml(subtitle)}</p>
      ${items.length ? `<div class="analysis-dashboard__tokens">${items.map((item) => renderToken(item, 'muted')).join('')}</div>` : '<div class="analysis-dashboard__note">Sin datos claros.</div>'}
    </article>
  `;
}

function renderFact(label, value) {
  return `
    <div class="analysis-dashboard__metric">
      <span class="analysis-dashboard__metric-label">${escapeHtml(label)}</span>
      <strong class="analysis-dashboard__metric-value">${escapeHtml(summarizeText(value, 42))}</strong>
    </div>
  `;
}

function renderMetric(label, value) {
  return `
    <div class="analysis-dashboard__metric">
      <span class="analysis-dashboard__metric-label">${escapeHtml(label)}</span>
      <strong class="analysis-dashboard__metric-value">${escapeHtml(summarizeText(value, 42))}</strong>
    </div>
  `;
}

function renderToken(label, tone = 'muted') {
  const className = `analysis-dashboard__token analysis-dashboard__token--${tone}`;
  return `<span class="${className}">${escapeHtml(String(label))}</span>`;
}

function scoreToneClass(score) {
  if (score >= 80) return 'analysis-dashboard__score--high';
  if (score >= 60) return 'analysis-dashboard__score--medium';
  if (score >= 40) return 'analysis-dashboard__score--low';
  return 'analysis-dashboard__score--critical';
}

function normalizeItemList(items = []) {
  return asArray(items)
    .map((item) => {
      if (!item) return null;
      if (typeof item === 'string') {
        return {
          label: item,
          detail: item,
          score: 70,
          badge: '',
          tags: [],
        };
      }

      return {
        label: pickText(item.label, item.name, item.champion, item.title, 'Elemento'),
        detail: pickText(item.detail, item.description, item.summary, ''),
        score: Number(item.score ?? item.value ?? item.importance ?? 70),
        badge: pickText(item.badge, item.priority, item.kind, ''),
        tags: asArray(item.tags),
      };
    })
    .filter(Boolean);
}

function normalizePhaseList(phases = []) {
  return asArray(phases)
    .map((phase, index) => {
      if (!phase) return null;
      if (typeof phase === 'string') {
        return {
          phase: `Fase ${index + 1}`,
          title: 'Prioridad',
          detail: phase,
          actions: [],
        };
      }

      return {
        phase: pickText(phase.phase, phase.label, phase.name, `Fase ${index + 1}`),
        title: pickText(phase.title, phase.kind, phase.label, 'Prioridad'),
        detail: pickText(phase.detail, phase.description, phase.summary, ''),
        actions: asArray(phase.actions),
      };
    })
    .filter(Boolean);
}

function normalizeBanList(bans = []) {
  return asArray(bans)
    .map((ban) => {
      if (!ban) return null;
      if (typeof ban === 'string') {
        return {
          champion: ban,
          priority: 'ban',
          score: 70,
          reason: ban,
          tags: [],
        };
      }

      return {
        champion: pickText(ban.champion, ban.name, ban.label, 'Ban'),
        priority: pickText(ban.priority, ban.kind, 'ban'),
        score: Number(ban.score ?? ban.value ?? ban.importance ?? 70),
        reason: pickText(ban.reason, ban.detail, ban.summary, ''),
        tags: asArray(ban.tags),
      };
    })
    .filter(Boolean);
}

function normalizeRuleList(rules = []) {
  return asArray(rules)
    .map((rule, index) => {
      if (!rule) return null;
      if (typeof rule === 'string') {
        return {
          label: `Regla ${index + 1}`,
          detail: rule,
          score: 65,
          badge: 'regla',
        };
      }

      return {
        label: pickText(rule.label, rule.name, rule.title, `Regla ${index + 1}`),
        detail: pickText(rule.detail, rule.description, rule.summary, ''),
        score: Number(rule.score ?? rule.value ?? 65),
        badge: pickText(rule.kind, rule.priority, 'regla'),
      };
    })
    .filter(Boolean);
}

function normalizePick(pick = {}) {
  if (!pick || typeof pick === 'string') {
    return {
      champion: pickText(pick, 'Sin recomendación'),
      score: 0,
      reason: '',
      tags: [],
    };
  }

  return {
    champion: pickText(pick.champion, pick.name, pick.label, pick.title, 'Sin recomendación'),
    score: Number(pick.score ?? pick.value ?? pick.importance ?? 0),
    reason: pickText(pick.reason, pick.detail, pick.summary, ''),
    tags: asArray(pick.tags),
  };
}

function pickText(...values) {
  for (const value of values) {
    const text = cleanText(value);
    if (text) return text;
  }
  return '';
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
}

function uniqueText(values = []) {
  const seen = new Set();
  const output = [];

  for (const value of values) {
    const text = cleanText(value);
    if (!text) continue;
    const key = normalizeKey(text);
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(text);
  }

  return output;
}

function summarizeText(value, maxChars = 120) {
  const text = cleanText(value);
  if (!text) return '';
  if (text.length <= maxChars) return text;

  const shortened = text.slice(0, maxChars - 1);
  const lastSpace = shortened.lastIndexOf(' ');
  return `${shortened.slice(0, Math.max(24, lastSpace > 0 ? lastSpace : shortened.length)).trim()}…`;
}

function cleanText(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function normalizeKey(value) {
  return cleanText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function clamp(value, min, max) {
  const numeric = Number.isFinite(value) ? value : 0;
  return Math.min(max, Math.max(min, numeric));
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
