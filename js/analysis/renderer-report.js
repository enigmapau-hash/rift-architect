const DEFAULT_TITLE = 'Análisis de composición';
const DEFAULT_PICK_TITLE = 'Recomendación del último pick';

export function renderAnalysisStory(root, story = {}) {
  if (!root) return;

  const summaryText = summarizeText(
    story.summaryText || story.identityCopy || story.contextual?.summary || 'Selecciona cinco campeones para ver un informe ejecutivo de la composición.',
    160,
  );
  const tags = uniqueText(asArray(story.tags)).slice(0, 4);
  const strengths = normalizeItemList(story.strengths).slice(0, 3);
  const weaknesses = normalizeItemList(story.weaknesses).slice(0, 3);
  const phases = normalizePhaseList(story.phases).slice(0, 3);
  const bans = normalizeBanList(story.bans).slice(0, 3);
  const rules = normalizeRuleList(story.contextual?.rules).slice(0, 3);
  const signals = uniqueText(asArray(story.contextual?.signals)).slice(0, 4);
  const synergies = uniqueText(asArray(story.synergyHighlights)).slice(0, 3);
  const risks = uniqueText(asArray(story.riskHighlights)).slice(0, 3);
  const confidence = clamp(Number(story.confidence ?? 0), 0, 100);

  root.hidden = false;
  root.innerHTML = `
    <section class='analysis-report analysis-hub__shell'>
      <header class='analysis-report__hero'>
        <div class='analysis-report__hero-copy'>
          <p class='eyebrow'>Bloque 2 · Informe ejecutivo</p>
          <h4>${escapeHtml(cleanValue(story.title, DEFAULT_TITLE))}</h4>
          <p class='analysis-report__lede'>${escapeHtml(summaryText)}</p>
          <div class='analysis-report__priority-strip'>
            ${renderPriorityChip('1', 'Identidad')}
            ${renderPriorityChip('2', 'Plan')}
            ${renderPriorityChip('3', 'Fuerzas')}
            ${renderPriorityChip('4', 'Riesgos')}
          </div>
          ${tags.length ? `<div class='analysis-report__chips'>${tags.map((tag) => renderChip(tag, 'info')).join('')}</div>` : ''}
        </div>

        <aside class='analysis-report__score ${toneByScore(confidence)}'>
          <span class='analysis-report__score-kicker'>Lectura rápida</span>
          <strong>${escapeHtml(cleanValue(story.grade, 'B'))}</strong>
          <span>${escapeHtml(cleanValue(story.scoreBadge, 'Media'))} · ${escapeHtml(String(confidence))}%</span>
          <div class='analysis-report__score-strip'>
            ${renderMiniScore('Identidad', cleanValue(story.primaryIdentity, 'Por definir'))}
            ${renderMiniScore('Tempo', cleanValue(story.tempo, 'Por definir'))}
            ${renderMiniScore('Plan', cleanValue(story.focus || story.identity?.focus, 'Por cerrar'))}
          </div>
        </aside>
      </header>

      <div class='analysis-report__body'>
        ${renderIdentitySection(story)}
        ${renderPlanSection(phases)}
        <div class='analysis-report__split'>
          ${renderListSection({
            step: '3',
            title: 'Fortalezas',
            subtitle: 'A favor del plan',
            items: strengths,
            tone: 'success',
            empty: 'Sin fortalezas claras',
          })}
          ${renderListSection({
            step: '4',
            title: 'Debilidades',
            subtitle: 'A vigilar',
            items: weaknesses,
            tone: 'danger',
            empty: 'Sin debilidades claras',
          })}
        </div>
        <div class='analysis-report__split'>
          ${renderBansSection({ step: '5', bans })}
          ${renderStrategicSection({
            step: '6',
            rules,
            signals,
            synergies,
            risks,
            strategic: story.strategic,
            contextual: story.contextual,
          })}
        </div>
      </div>
    </section>
  `;
}

export function renderLastPickState(root, story = {}) {
  if (!root) return;

  const tags = uniqueText(asArray(story.tags)).slice(0, 4);
  const bestPick = story.bestPick || null;
  const alternatives = normalizeItemList(story.alternatives).slice(0, 3);
  const needs = uniqueText(asArray(story.profile?.needs)).slice(0, 4);
  const rules = normalizeRuleList(story.contextual?.rules).slice(0, 3);
  const signals = uniqueText(asArray(story.contextual?.signals)).slice(0, 4);
  const synergies = uniqueText(asArray(story.synergyHighlights)).slice(0, 3);
  const risks = uniqueText(asArray(story.riskHighlights)).slice(0, 3);
  const confidence = clamp(Number(bestPick?.score ?? story.confidence ?? 0), 0, 100);

  root.hidden = false;
  root.innerHTML = `
    <section class='analysis-report analysis-report--last-pick analysis-hub__shell'>
      <header class='analysis-report__hero'>
        <div class='analysis-report__hero-copy'>
          <p class='eyebrow'>Bloque 2 · Último pick</p>
          <h4>${escapeHtml(cleanValue(story.title, DEFAULT_PICK_TITLE))}</h4>
          <p class='analysis-report__lede'>${escapeHtml(cleanValue(story.summaryText || story.summary, 'Te falta un campeón para cerrar la composición.'))}</p>
          <div class='analysis-report__priority-strip'>
            ${renderPriorityChip('1', 'Cierre')}
            ${renderPriorityChip('2', 'Encaje')}
            ${renderPriorityChip('3', 'Alternativas')}
          </div>
          ${tags.length ? `<div class='analysis-report__chips'>${tags.map((tag) => renderChip(tag, 'info')).join('')}</div>` : ''}
        </div>

        <aside class='analysis-report__score ${toneByScore(confidence)}'>
          <span class='analysis-report__score-kicker'>Último slot</span>
          <strong>${escapeHtml(cleanValue(story.targetRoleLabel || story.targetRole, 'Sin definir'))}</strong>
          <span>${escapeHtml(cleanValue(story.focus, 'Cerrar el draft'))}</span>
          <div class='analysis-report__score-strip'>
            ${renderMiniScore('Score', String(confidence))}
            ${renderMiniScore('Rol', cleanValue(story.targetRoleLabel || story.targetRole, 'Sin definir'))}
            ${renderMiniScore('Objetivo', cleanValue(story.focus, 'Cierre'))}
          </div>
        </aside>
      </header>

      <div class='analysis-report__body'>
        <div class='analysis-report__split'>
          ${renderBestPickSection({ bestPick, story })}
          ${renderAlternativesSection(alternatives)}
        </div>
        <div class='analysis-report__split'>
          ${renderFocusSection({ story, needs })}
          ${renderStrategicSection({
            step: '4',
            rules,
            signals,
            synergies,
            risks,
            strategic: story.strategic,
            contextual: story.contextual,
          })}
        </div>
      </div>
    </section>
  `;
}

export function renderAnalysisEmptyState(root) {
  if (!root) return;

  root.hidden = false;
  root.innerHTML = `
    <article class='analysis-report__empty'>
      <p class='eyebrow'>Bloque 2 · Informe ejecutivo</p>
      <h4>Selecciona cinco campeones para ver el análisis</h4>
      <p>Primero verás una lectura breve y, debajo, el plan, las fuerzas, los riesgos y los bans.</p>
    </article>
  `;
}

export function renderLastPickEmptyState(root, story = {}) {
  if (!root) return;

  root.hidden = false;
  root.innerHTML = `
    <article class='analysis-report__empty'>
      <p class='eyebrow'>Bloque 2 · Último pick</p>
      <h4>No hay una recomendación clara todavía</h4>
      <p>${escapeHtml(cleanValue(story.summaryText || story.summary, 'Añade cuatro campeones y deja un hueco para ver la recomendación del último slot.'))}</p>
    </article>
  `;
}

function renderIdentitySection(story) {
  const primaryIdentity = cleanValue(story.primaryIdentity, 'Identidad por cerrar');
  const summary = summarizeText(story.identityCopy || story.summaryText || story.contextual?.summary || primaryIdentity, 120);
  const secondary = uniqueText([...(asArray(story.secondaryIdentities)), cleanValue(story.identity?.focus, ''), cleanValue(story.identity?.dominance, '')]).filter(Boolean).filter((value) => value !== primaryIdentity).slice(0, 3);

  const facts = [
    ['Tempo', cleanValue(story.tempo, 'Por definir')],
    ['Dominancia', cleanValue(story.dominance, 'Por definir')],
    ['Lectura', cleanValue(story.identity?.focus || story.focus, 'Composición por cerrar')],
  ];

  return `
    <article class='analysis-hub__card analysis-report__panel analysis-report__panel--featured'>
      <div class='analysis-report__section-header'>
        <span class='analysis-report__section-step'>1</span>
        <div class='analysis-report__section-title'>
          <strong>Identidad</strong>
          <span class='analysis-report__section-subtitle'>Qué tipo de plan es y cómo se lee</span>
        </div>
      </div>
      <p class='analysis-report__copy analysis-report__copy--lead'>${escapeHtml(primaryIdentity)}</p>
      <p class='analysis-report__copy'>${escapeHtml(summary)}</p>
      <div class='analysis-report__facts'>
        ${facts.map(([label, value]) => `
          <div class='analysis-report__fact'>
            <span>${escapeHtml(label)}</span>
            <strong>${escapeHtml(value)}</strong>
          </div>
        `).join('')}
      </div>
      <div class='analysis-report__chips'>
        ${secondary.length
          ? secondary.map((item) => renderChip(item, 'muted')).join('')
          : '<div class="analysis-report__empty-note">Sin lecturas secundarias claras</div>'}
      </div>
    </article>
  `;
}

function renderPlanSection(phases) {
  return `
    <article class='analysis-hub__card analysis-report__panel'>
      <div class='analysis-report__section-header'>
        <span class='analysis-report__section-step'>2</span>
        <div class='analysis-report__section-title'>
          <strong>Plan de partida</strong>
          <span class='analysis-report__section-subtitle'>Early · Mid · Late</span>
        </div>
      </div>
      <div class='analysis-report__timeline'>
        ${phases.length
          ? phases.map((phase, index) => {
            const actions = uniqueText(asArray(phase.actions)).slice(0, 3);
            return `
              <article class='analysis-report__item'>
                <div class='analysis-report__item-head'>
                  <strong>${escapeHtml(cleanValue(phase.phase, `Fase ${index + 1}`))}</strong>
                  <span>${escapeHtml(cleanValue(phase.title, 'Prioridad'))}</span>
                </div>
                <p>${escapeHtml(summarizeText(cleanValue(phase.detail, 'Paso a paso del plan.'), 110))}</p>
                ${actions.length ? `<div class='analysis-report__chips'>${actions.map((action) => renderChip(action, 'coach')).join('')}</div>` : ''}
              </article>
            `;
          }).join('')
          : '<div class="analysis-report__empty-note">Todavía no hay un plan detallado.</div>'}
      </div>
    </article>
  `;
}

function renderListSection({ step, title, subtitle, items, tone, empty }) {
  const panelClass = tone === 'success'
    ? 'analysis-report__panel--featured'
    : tone === 'danger'
      ? 'analysis-report__panel--accent'
      : '';

  return `
    <article class='analysis-hub__card analysis-report__panel ${panelClass}'>
      <div class='analysis-report__section-header'>
        <span class='analysis-report__section-step'>${escapeHtml(step)}</span>
        <div class='analysis-report__section-title'>
          <strong>${escapeHtml(title)}</strong>
          <span class='analysis-report__section-subtitle'>${escapeHtml(subtitle)}</span>
        </div>
      </div>
      <div class='analysis-report__list'>
        ${items.length
          ? items.map((item) => `
              <article class='analysis-report__item'>
                <div class='analysis-report__item-head'>
                  <strong>${escapeHtml(cleanValue(item.label, 'Elemento'))}</strong>
                  <span>${escapeHtml(cleanValue(item.badge, subtitle))} · ${escapeHtml(String(clamp(item.score, 0, 100)))}%</span>
                </div>
                <div class='analysis-report__bar' aria-hidden='true'>
                  <div class='analysis-report__bar-fill' style='--meter:${clamp(item.score, 0, 100)}%'></div>
                </div>
                <p>${escapeHtml(summarizeText(cleanValue(item.detail, 'Lectura todavía en desarrollo.'), 96))}</p>
              </article>
            `).join('')
          : `<div class='analysis-report__empty-note'>${escapeHtml(empty)}</div>`}
      </div>
    </article>
  `;
}

function renderBansSection({ step, bans }) {
  return `
    <article class='analysis-hub__card analysis-report__panel analysis-report__panel--accent'>
      <div class='analysis-report__section-header'>
        <span class='analysis-report__section-step'>${escapeHtml(step)}</span>
        <div class='analysis-report__section-title'>
          <strong>Bans prioritarios</strong>
          <span class='analysis-report__section-subtitle'>Lo que más rompe el plan</span>
        </div>
      </div>
      <div class='analysis-report__list'>
        ${bans.length
          ? bans.map((ban) => `
              <article class='analysis-report__item'>
                <div class='analysis-report__item-head'>
                  <strong>${escapeHtml(cleanValue(ban.champion, 'Ban'))}</strong>
                  <span>${escapeHtml(cleanValue(ban.priority, 'ban'))} · ${escapeHtml(String(clamp(ban.score, 0, 100)))}%</span>
                </div>
                <div class='analysis-report__bar' aria-hidden='true'>
                  <div class='analysis-report__bar-fill' style='--meter:${clamp(ban.score, 0, 100)}%'></div>
                </div>
                <p>${escapeHtml(summarizeText(cleanValue(ban.reason, 'Impacto directo sobre tu plan.'), 100))}</p>
                ${asArray(ban.tags).length ? `<div class='analysis-report__chips'>${asArray(ban.tags).slice(0, 3).map((tag) => renderChip(tag, 'danger')).join('')}</div>` : ''}
              </article>
            `).join('')
          : '<div class="analysis-report__empty-note">Sin bans calculados</div>'}
      </div>
    </article>
  `;
}

function renderStrategicSection({ step, rules, signals, synergies, risks, strategic = {}, contextual = {} }) {
  const lead = summarizeText(contextual.summary || strategic.summary || strategic.focus || 'Lectura contextual del draft.', 130);

  return `
    <article class='analysis-hub__card analysis-report__panel analysis-report__panel--accent'>
      <div class='analysis-report__section-header'>
        <span class='analysis-report__section-step'>${escapeHtml(step)}</span>
        <div class='analysis-report__section-title'>
          <strong>Lectura estratégica</strong>
          <span class='analysis-report__section-subtitle'>Señales, reglas y contingencias</span>
        </div>
      </div>
      <p class='analysis-report__copy'>${escapeHtml(lead)}</p>
      <div class='analysis-report__list'>
        ${rules.length
          ? rules.map((rule) => `
              <article class='analysis-report__item'>
                <div class='analysis-report__item-head'>
                  <strong>${escapeHtml(cleanValue(rule.label, 'Regla'))}</strong>
                  <span>${escapeHtml(cleanValue(rule.kind, 'contexto'))}</span>
                </div>
                <p>${escapeHtml(summarizeText(cleanValue(rule.detail, 'Lectura contextual en desarrollo.'), 96))}</p>
              </article>
            `).join('')
          : '<div class="analysis-report__empty-note">No hay reglas contextuales claras</div>'}
      </div>
      <div class='analysis-report__mini-grid'>
        <div class='analysis-report__mini-panel'>
          <span class='analysis-report__mini-title'>Señales</span>
          ${signals.length ? `<div class='analysis-report__chips'>${signals.map((item) => renderChip(item, 'coach')).join('')}</div>` : '<div class="analysis-report__empty-note">Sin señales claras</div>'}
        </div>
        <div class='analysis-report__mini-panel'>
          <span class='analysis-report__mini-title'>Sinergias / riesgos</span>
          ${synergies.length ? `<div class='analysis-report__chips'>${synergies.map((item) => renderChip(item, 'success')).join('')}</div>` : '<div class="analysis-report__empty-note">Sin sinergias claras</div>'}
          ${risks.length ? `<div class='analysis-report__chips'>${risks.map((item) => renderChip(item, 'danger')).join('')}</div>` : '<div class="analysis-report__empty-note">Sin riesgos claros</div>'}
        </div>
      </div>
    </article>
  `;
}

function renderBestPickSection({ bestPick, story }) {
  if (!bestPick) {
    return `
      <article class='analysis-hub__card analysis-report__panel analysis-report__panel--featured'>
        <div class='analysis-report__section-header'>
          <span class='analysis-report__section-step'>1</span>
          <div class='analysis-report__section-title'>
            <strong>Mejor último pick</strong>
            <span class='analysis-report__section-subtitle'>Sin recomendación firme</span>
          </div>
        </div>
        <div class='analysis-report__empty-note'>Aún no hay una recomendación clara para cerrar el draft.</div>
      </article>
    `;
  }

  const solves = uniqueText(asArray(bestPick.solves)).slice(0, 3);

  return `
    <article class='analysis-hub__card analysis-report__panel analysis-report__panel--featured'>
      <div class='analysis-report__section-header'>
        <span class='analysis-report__section-step'>1</span>
        <div class='analysis-report__section-title'>
          <strong>Mejor último pick</strong>
          <span class='analysis-report__section-subtitle'>El cierre más sólido</span>
        </div>
      </div>
      <p class='analysis-report__copy analysis-report__copy--lead'>${escapeHtml(cleanValue(bestPick.champion, 'Sin definir'))}</p>
      <p class='analysis-report__copy'>${escapeHtml(summarizeText(cleanValue(bestPick.problem, 'Cierra el hueco más evidente del draft.'), 110))}</p>
      <div class='analysis-report__chips'>
        ${solves.length ? solves.map((item) => renderChip(item, 'success')).join('') : '<span class="analysis-report__empty-note">Problema resuelto</span>'}
      </div>
      <p class='analysis-report__copy'>${escapeHtml(summarizeText(cleanValue(bestPick.reason || story.focus, 'Pick orientado a cerrar el draft.'), 110))}</p>
    </article>
  `;
}

function renderAlternativesSection(alternatives) {
  return `
    <article class='analysis-hub__card analysis-report__panel'>
      <div class='analysis-report__section-header'>
        <span class='analysis-report__section-step'>2</span>
        <div class='analysis-report__section-title'>
          <strong>Alternativas</strong>
          <span class='analysis-report__section-subtitle'>Opciones útiles si cambias el cierre</span>
        </div>
      </div>
      <div class='analysis-report__list'>
        ${alternatives.length
          ? alternatives.map((item) => `
              <article class='analysis-report__item'>
                <div class='analysis-report__item-head'>
                  <strong>${escapeHtml(cleanValue(item.champion, 'Alternativa'))}</strong>
                  <span>${escapeHtml(cleanValue(item.role, 'último slot'))} · ${escapeHtml(String(clamp(item.score, 0, 100)))}%</span>
                </div>
                <p>${escapeHtml(summarizeText(cleanValue(item.reason || item.problem, 'Otra opción para resolver el draft.'), 100))}</p>
                ${asArray(item.solves).length ? `<div class='analysis-report__chips'>${asArray(item.solves).slice(0, 3).map((solve) => renderChip(solve, 'info')).join('')}</div>` : ''}
              </article>
            `).join('')
          : '<div class="analysis-report__empty-note">Sin alternativas claras</div>'}
      </div>
    </article>
  `;
}

function renderFocusSection({ story, needs }) {
  return `
    <article class='analysis-hub__card analysis-report__panel'>
      <div class='analysis-report__section-header'>
        <span class='analysis-report__section-step'>3</span>
        <div class='analysis-report__section-title'>
          <strong>Qué resuelve</strong>
          <span class='analysis-report__section-subtitle'>Lectura del último slot</span>
        </div>
      </div>
      <p class='analysis-report__copy analysis-report__copy--lead'>${escapeHtml(cleanValue(story.profile?.focus || story.focus, 'Cerrar el hueco del draft'))}</p>
      <p class='analysis-report__copy'>${escapeHtml(summarizeText(cleanValue(story.profile?.summary || story.summary, 'La recomendación prioriza la pieza que más estabiliza la composición.'), 110))}</p>
      <div class='analysis-report__chips'>
        ${needs.length ? needs.map((item) => renderChip(item, 'coach')).join('') : '<span class="analysis-report__empty-note">Sin necesidades claras</span>'}
      </div>
      <p class='analysis-report__copy'>Último slot: ${escapeHtml(cleanValue(story.targetRoleLabel || story.targetRole, 'Sin definir'))}</p>
    </article>
  `;
}

function renderPriorityChip(step, label) {
  return `<span class='analysis-report__priority-chip'>${escapeHtml(step)} · ${escapeHtml(label)}</span>`;
}

function renderMiniScore(label, value) {
  return `<span>${escapeHtml(label)} · ${escapeHtml(cleanValue(value, '—'))}</span>`;
}

function renderChip(text, tone = 'muted') {
  const iconMap = {
    success: '✓',
    danger: '⚠',
    coach: '›',
    info: '◆',
    muted: '•',
  };

  const suffixMap = {
    success: 'story-pill--success',
    danger: 'story-pill--danger',
    coach: 'story-pill--coach',
    info: 'story-pill--info',
    muted: 'story-pill--muted',
  };

  const icon = iconMap[tone] || iconMap.muted;
  const toneClass = suffixMap[tone] || suffixMap.muted;
  return `<span class='analysis-report__chip story-pill ${toneClass}'>${escapeHtml(icon)} ${escapeHtml(cleanText(text))}</span>`;
}

function asArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function cleanValue(value, fallback = '') {
  const text = cleanText(value);
  return text || fallback;
}

function cleanText(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function summarizeText(value, maxLength = 120) {
  const text = cleanText(value);
  if (!text) return '';
  if (text.length <= maxLength) return text;

  const sentenceEnd = text.search(/[.!?](?:\s|$)/);
  if (sentenceEnd > 0 && sentenceEnd < maxLength) {
    return text.slice(0, sentenceEnd + 1).trim();
  }

  const clipped = text.slice(0, maxLength).replace(/\s+\S*$/, '').trim();
  return `${clipped || text.slice(0, maxLength).trim()}…`;
}

function uniqueText(values = []) {
  const seen = new Set();
  const result = [];

  for (const value of values) {
    const text = cleanText(value);
    if (!text) continue;
    const key = normalizeKey(text);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(text);
  }

  return result;
}

function normalizeKey(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function normalizeItemList(items) {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => {
      if (typeof item === 'string') {
        return { label: item, badge: '', detail: item, score: 0, solves: [], role: '', champion: item };
      }

      if (!item || typeof item !== 'object') return null;

      return {
        label: item.label || item.champion || item.name || 'Elemento',
        badge: item.badge || item.summaryLabel || item.priority || '',
        detail: item.detail || item.reason || item.problem || item.summary || '',
        score: Number(item.score ?? item.value ?? 0) || 0,
        solves: asArray(item.solves),
        role: item.role || '',
        champion: item.champion || item.label || item.name || '',
      };
    })
    .filter(Boolean);
}

function normalizePhaseList(phases) {
  if (!Array.isArray(phases)) return [];

  return phases
    .map((phase, index) => {
      if (typeof phase === 'string') {
        return { phase: `Fase ${index + 1}`, title: phase, detail: phase, actions: [] };
      }

      if (!phase || typeof phase !== 'object') return null;

      return {
        phase: phase.phase || phase.label || `Fase ${index + 1}`,
        title: phase.title || phase.summary || '',
        detail: phase.detail || phase.description || '',
        actions: asArray(phase.actions),
      };
    })
    .filter(Boolean);
}

function normalizeBanList(bans) {
  return normalizeItemList(bans).map((item) => ({
    champion: item.champion || item.label,
    priority: item.badge || 'ban',
    reason: item.detail,
    score: item.score,
    tags: item.solves,
  }));
}

function normalizeRuleList(rules) {
  if (!Array.isArray(rules)) return [];

  return rules
    .map((rule) => {
      if (typeof rule === 'string') {
        return { label: rule, kind: 'contexto', detail: rule };
      }

      if (!rule || typeof rule !== 'object') return null;

      return {
        label: rule.label || rule.name || 'Regla',
        kind: rule.kind || rule.type || 'contexto',
        detail: rule.detail || rule.description || rule.summary || '',
      };
    })
    .filter(Boolean);
}

function toneByScore(score) {
  const value = clamp(Number(score ?? 0), 0, 100);
  if (value >= 80) return 'is-great';
  if (value >= 65) return 'is-good';
  if (value >= 45) return 'is-mid';
  return 'is-low';
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
