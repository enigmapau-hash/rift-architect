const DEFAULT_TITLE = 'Análisis de composición';
const DEFAULT_PICK_TITLE = 'Recomendación del último pick';

export function renderAnalysisStory(root, story = {}) {
  if (!root) return;

  const tags = uniqueText(asArray(story.tags)).slice(0, 4);
  const strengths = normalizeItemList(story.strengths).slice(0, 3);
  const weaknesses = normalizeItemList(story.weaknesses).slice(0, 3);
  const phases = normalizePhaseList(story.phases).slice(0, 3);
  const bans = normalizeBanList(story.bans).slice(0, 3);
  const rules = normalizeRuleList(story.contextual?.rules).slice(0, 3);
  const signals = uniqueText(asArray(story.contextual?.signals)).slice(0, 4);
  const synergies = uniqueText(asArray(story.synergyHighlights)).slice(0, 3);
  const risks = uniqueText(asArray(story.riskHighlights)).slice(0, 3);
  const summaryText = cleanText(story.summaryText) || 'Selecciona cinco campeones para ver un informe claro de la composición.';

  root.hidden = false;
  root.innerHTML = `
    <section class='analysis-report analysis-hub__shell'>
      <header class='analysis-report__hero'>
        <div class='analysis-report__hero-copy'>
          <p class='eyebrow'>Bloque 2 · Informe de composición</p>
          <h4>${escapeHtml(cleanValue(story.title, DEFAULT_TITLE))}</h4>
          <p class='analysis-report__lede'>${escapeHtml(summaryText)}</p>
          ${tags.length ? `<div class='analysis-report__chips'>${tags.map((tag, index) => `<span class='analysis-report__chip story-pill ${index === 0 ? 'is-active' : ''}'>${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
        </div>

        <div class='analysis-report__score ${toneByScore(story.confidence)}'>
          <span class='analysis-report__score-kicker'>Lectura rápida</span>
          <strong>${escapeHtml(cleanValue(story.grade, 'B'))}</strong>
          <span>${escapeHtml(cleanValue(story.scoreBadge, 'Media'))} · ${escapeHtml(String(clamp(story.confidence, 0, 100)))}%</span>
        </div>
      </header>

      <div class='analysis-report__body'>
        ${renderIdentitySection(story)}
        ${renderPlanSection(phases)}
        <div class='analysis-report__split'>
          ${renderListSection('Fortalezas', strengths, 'A favor', 'story-pill--success', 'Sin fortalezas claras')}
          ${renderListSection('Debilidades', weaknesses, 'A vigilar', 'story-pill--danger', 'Sin debilidades claras')}
        </div>
        <div class='analysis-report__split'>
          ${renderBansSection(bans)}
          ${renderSignalsSection(rules, signals, synergies, risks)}
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

  root.hidden = false;
  root.innerHTML = `
    <section class='analysis-report analysis-report--last-pick analysis-hub__shell'>
      <header class='analysis-report__hero'>
        <div class='analysis-report__hero-copy'>
          <p class='eyebrow'>Bloque 2 · Último pick</p>
          <h4>${escapeHtml(cleanValue(story.title, DEFAULT_PICK_TITLE))}</h4>
          <p class='analysis-report__lede'>${escapeHtml(cleanValue(story.summaryText || story.summary, 'Te falta un campeón para cerrar la composición.'))}</p>
          ${tags.length ? `<div class='analysis-report__chips'>${tags.map((tag, index) => `<span class='analysis-report__chip story-pill ${index === 0 ? 'is-active' : ''}'>${escapeHtml(cleanValue(tag))}</span>`).join('')}</div>` : ''}
        </div>

        <div class='analysis-report__score ${toneByScore(bestPick?.score || 0)}'>
          <span class='analysis-report__score-kicker'>Último slot</span>
          <strong>${escapeHtml(cleanValue(story.targetRoleLabel || story.targetRole, 'Sin definir'))}</strong>
          <span>${escapeHtml(cleanValue(story.focus, 'Cerrar el draft'))}</span>
        </div>
      </header>

      <div class='analysis-report__body'>
        <div class='analysis-report__split'>
          ${renderBestPickPanel(bestPick, story)}
          ${renderAlternativesPanel(alternatives)}
        </div>
        <div class='analysis-report__split'>
          ${renderFocusPanel(story, needs)}
          ${renderSignalsSection(
            normalizeRuleList(story.contextual?.rules).slice(0, 3),
            uniqueText(asArray(story.contextual?.signals)).slice(0, 4),
            uniqueText(asArray(story.synergyHighlights)).slice(0, 3),
            uniqueText(asArray(story.riskHighlights)).slice(0, 3)
          )}
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
      <p class='eyebrow'>Bloque 2 · Informe de composición</p>
      <h4>Selecciona cinco campeones para ver el análisis</h4>
      <p>Primero verás una lectura breve y, debajo, el detalle del plan, los riesgos y los bans.</p>
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
  const secondary = uniqueText([story.primaryIdentity, story.identityCopy, ...(asArray(story.secondaryIdentities))]).slice(0, 3);
  const facts = [
    ['Tempo', cleanValue(story.tempo, 'Por definir')],
    ['Dominancia', cleanValue(story.dominance, 'Por definir')],
    ['Lectura', cleanValue(story.identity?.focus || story.focus, 'Composición por cerrar')],
  ];

  return `
    <article class='analysis-hub__card analysis-report__panel'>
      <div class='analysis-report__section-title'>
        <strong>Identidad</strong>
        <span>${escapeHtml(cleanValue(story.identity?.summaryText || story.identityCopy, 'Lectura principal de la composición'))}</span>
      </div>
      <p class='analysis-report__copy'>${escapeHtml(cleanValue(story.primaryIdentity, 'Identidad por cerrar'))}</p>
      <div class='analysis-report__facts'>
        ${facts.map(([label, value]) => `
          <div class='analysis-report__fact'>
            <span>${escapeHtml(label)}</span>
            <strong>${escapeHtml(value)}</strong>
          </div>
        `).join('')}
      </div>
      <div class='analysis-report__list'>
        ${secondary.length
          ? secondary.map((item) => `
              <div class='analysis-report__item analysis-report__item--soft'>
                <div class='analysis-report__item-head'>
                  <strong>${escapeHtml(item)}</strong>
                  <span>Lectura secundaria</span>
                </div>
              </div>
            `).join('')
          : '<div class="analysis-report__empty-inline">Sin lecturas secundarias claras</div>'}
      </div>
    </article>
  `;
}

function renderPlanSection(phases) {
  return `
    <article class='analysis-hub__card analysis-report__panel'>
      <div class='analysis-report__section-title'>
        <strong>Plan de partida</strong>
        <span>Early · Mid · Late</span>
      </div>
      <div class='analysis-report__timeline'>
        ${phases.length
          ? phases.map((phase) => `
              <div class='analysis-report__timeline-row'>
                <div class='analysis-report__item-head'>
                  <strong>${escapeHtml(cleanValue(phase.phase, 'Fase'))}</strong>
                  <span>${escapeHtml(cleanValue(phase.title, 'Prioridad'))}</span>
                </div>
                <p>${escapeHtml(cleanValue(phase.detail, 'Paso a paso del plan.'))}</p>
                ${asArray(phase.actions).length ? `<div class='analysis-report__chips'>${asArray(phase.actions).slice(0, 3).map((action) => `<span class='analysis-report__chip story-pill'>${escapeHtml(cleanValue(action))}</span>`).join('')}</div>` : ''}
              </div>
            `).join('')
          : '<div class="analysis-report__empty-inline">Todavía no hay un plan detallado.</div>'}
      </div>
    </article>
  `;
}

function renderListSection(title, items, summaryLabel, pillClass, emptyLabel) {
  return `
    <article class='analysis-hub__card analysis-report__panel'>
      <div class='analysis-report__section-title'>
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(summaryLabel)}</span>
      </div>
      <div class='analysis-report__list'>
        ${items.length
          ? items.map((item) => `
              <div class='analysis-report__item'>
                <div class='analysis-report__item-head'>
                  <strong>${escapeHtml(cleanValue(item.label, 'Elemento'))}</strong>
                  <span>${escapeHtml(cleanValue(item.badge, summaryLabel))} · ${escapeHtml(String(clamp(item.score, 0, 100)))}%</span>
                </div>
                <div class='analysis-report__bar' aria-hidden='true'>
                  <div class='analysis-report__bar-fill' style='--meter:${clamp(item.score, 0, 100)}%'></div>
                </div>
                <p>${escapeHtml(cleanValue(item.detail, 'Lectura todavía en desarrollo.'))}</p>
                <div class='analysis-report__chips'>
                  <span class='analysis-report__chip story-pill ${pillClass}'>${escapeHtml(emptyLabel)}</span>
                </div>
              </div>
            `).join('')
          : `<div class='analysis-report__empty-inline'>${escapeHtml(emptyLabel)}</div>`}
      </div>
    </article>
  `;
}

function renderBansSection(bans) {
  return `
    <article class='analysis-hub__card analysis-report__panel'>
      <div class='analysis-report__section-title'>
        <strong>Bans inteligentes</strong>
        <span>Lo que rompe el plan</span>
      </div>
      <div class='analysis-report__list'>
        ${bans.length
          ? bans.map((ban) => `
              <div class='analysis-report__item'>
                <div class='analysis-report__item-head'>
                  <strong>${escapeHtml(cleanValue(ban.champion, 'Ban'))}</strong>
                  <span>${escapeHtml(cleanValue(ban.priority, 'ban'))} · ${escapeHtml(String(clamp(ban.score, 0, 100)))}%</span>
                </div>
                <div class='analysis-report__bar' aria-hidden='true'>
                  <div class='analysis-report__bar-fill' style='--meter:${clamp(ban.score, 0, 100)}%'></div>
                </div>
                <p>${escapeHtml(cleanValue(ban.reason, 'Impacto directo sobre tu plan.'))}</p>
                <div class='analysis-report__chips'>
                  ${(asArray(ban.tags).length)
                    ? asArray(ban.tags).slice(0, 3).map((tag) => `<span class='analysis-report__chip story-pill story-pill--danger'>${escapeHtml(cleanValue(tag))}</span>`).join('')
                    : '<span class="analysis-empty">Impacto directo</span>'}
                </div>
              </div>
            `).join('')
          : '<div class="analysis-report__empty-inline">Sin bans calculados</div>'}
      </div>
    </article>
  `;
}

function renderSignalsSection(rules, signals, synergies, risks) {
  return `
    <article class='analysis-hub__card analysis-report__panel'>
      <div class='analysis-report__section-title'>
        <strong>Lectura estratégica</strong>
        <span>Señales y contingencias</span>
      </div>
      <div class='analysis-report__list'>
        ${rules.length
          ? rules.map((rule) => `
              <div class='analysis-report__item'>
                <div class='analysis-report__item-head'>
                  <strong>${escapeHtml(cleanValue(rule.label, 'Regla'))}</strong>
                  <span>${escapeHtml(cleanValue(rule.kind, 'contexto'))}</span>
                </div>
                <p>${escapeHtml(cleanValue(rule.detail, 'Lectura contextual en desarrollo.'))}</p>
              </div>
            `).join('')
          : '<div class="analysis-report__empty-inline">No hay reglas contextuales claras</div>'}
      </div>

      <div class='analysis-report__split analysis-report__split--tight'>
        <div class='analysis-report__mini-panel'>
          <span class='analysis-report__mini-title'>Señales</span>
          ${signals.length ? `<div class='analysis-report__chips'>${signals.map((item) => `<span class='analysis-report__chip story-pill story-pill--coach'>${escapeHtml(item)}</span>`).join('')}</div>` : '<div class="analysis-report__empty-inline">Sin señales claras</div>'}
        </div>
        <div class='analysis-report__mini-panel'>
          <span class='analysis-report__mini-title'>Sinergias / riesgos</span>
          ${synergies.length ? `<div class='analysis-report__chips'>${synergies.map((item) => `<span class='analysis-report__chip story-pill story-pill--success'>${escapeHtml(item)}</span>`).join('')}</div>` : '<div class="analysis-report__empty-inline">Sin sinergias claras</div>'}
          ${risks.length ? `<div class='analysis-report__chips'>${risks.map((item) => `<span class='analysis-report__chip story-pill story-pill--danger'>${escapeHtml(item)}</span>`).join('')}</div>` : '<div class="analysis-report__empty-inline">Sin riesgos claros</div>'}
        </div>
      </div>
    </article>
  `;
}

function renderBestPickPanel(bestPick, story) {
  if (!bestPick) {
    return `
      <article class='analysis-hub__card analysis-report__panel'>
        <div class='analysis-report__section-title'>
          <strong>Mejor último pick</strong>
          <span>Sin recomendación firme</span>
        </div>
        <div class='analysis-report__empty-inline'>Aún no hay una recomendación clara para cerrar el draft.</div>
      </article>
    `;
  }

  const solves = normalizeItemList(bestPick.solves).slice(0, 3);

  return `
    <article class='analysis-hub__card analysis-report__panel'>
      <div class='analysis-report__section-title'>
        <strong>Mejor último pick</strong>
        <span>${escapeHtml(cleanValue(bestPick.role, 'Último slot'))}</span>
      </div>
      <p class='analysis-report__copy'>${escapeHtml(cleanValue(bestPick.champion, 'Sin definir'))}</p>
      <p class='analysis-report__lede'>${escapeHtml(cleanValue(bestPick.problem, 'Cierra el hueco más evidente del draft.'))}</p>
      <div class='analysis-report__chips'>
        ${solves.length ? solves.slice(0, 3).map((item) => `<span class='analysis-report__chip story-pill story-pill--success'>${escapeHtml(cleanValue(item.label || item.champion || item))}</span>`).join('') : '<span class="analysis-empty">Problema resuelto</span>'}
      </div>
      <p class='analysis-report__copy'>${escapeHtml(cleanValue(bestPick.reason || story.focus, 'Pick orientado a cerrar el draft.'))}</p>
    </article>
  `;
}

function renderAlternativesPanel(alternatives) {
  return `
    <article class='analysis-hub__card analysis-report__panel'>
      <div class='analysis-report__section-title'>
        <strong>Alternativas</strong>
        <span>Opciones útiles</span>
      </div>
      <div class='analysis-report__list'>
        ${alternatives.length
          ? alternatives.map((item) => `
              <div class='analysis-report__item'>
                <div class='analysis-report__item-head'>
                  <strong>${escapeHtml(cleanValue(item.champion, 'Alternativa'))}</strong>
                  <span>${escapeHtml(cleanValue(item.role, 'último slot'))} · ${escapeHtml(String(clamp(item.score, 0, 100)))}%</span>
                </div>
                <p>${escapeHtml(cleanValue(item.reason || item.problem, 'Otra opción para resolver el draft.'))}</p>
                <div class='analysis-report__chips'>
                  ${(asArray(item.solves).length ? asArray(item.solves).slice(0, 3).map((solve) => `<span class='analysis-report__chip story-pill story-pill--info'>${escapeHtml(cleanValue(solve))}</span>`).join('') : '<span class="analysis-empty">Alternativa</span>')}
                </div>
              </div>
            `).join('')
          : '<div class="analysis-report__empty-inline">Sin alternativas claras</div>'}
      </div>
    </article>
  `;
}

function renderFocusPanel(story, needs) {
  return `
    <article class='analysis-hub__card analysis-report__panel'>
      <div class='analysis-report__section-title'>
        <strong>Qué resuelve</strong>
        <span>Lectura del último slot</span>
      </div>
      <p class='analysis-report__copy'>${escapeHtml(cleanValue(story.profile?.focus || story.focus, 'Cerrar el hueco del draft'))}</p>
      <p class='analysis-report__lede'>${escapeHtml(cleanValue(story.profile?.summary || story.summary, 'La recomendación prioriza la pieza que más estabiliza la composición.'))}</p>
      <div class='analysis-report__chips'>
        ${needs.length ? needs.map((item) => `<span class='analysis-report__chip story-pill story-pill--coach'>${escapeHtml(item)}</span>`).join('') : '<span class="analysis-empty">Sin necesidades claras</span>'}
      </div>
      <p class='analysis-report__copy'>Último slot: ${escapeHtml(cleanValue(story.targetRoleLabel || story.targetRole, 'Sin definir'))}</p>
    </article>
  `;
}

function asArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function cleanValue(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function cleanText(value) {
  const text = String(value ?? '').trim();
  return text;
}

function normalizeItemList(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      if (typeof item === 'string') {
        return { label: item, badge: '', detail: item, score: 0 };
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
        label: rule.label || rule.title || 'Regla',
        kind: rule.kind || rule.type || 'contexto',
        detail: rule.detail || rule.description || rule.reason || '',
      };
    })
    .filter(Boolean);
}

function uniqueText(values) {
  return [...new Set(asArray(values).map((value) => cleanValue(value)).filter(Boolean))];
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
  const n = Number(value);
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function toneByScore(score = 0) {
  const value = clamp(score, 0, 100);
  if (value >= 80) return 'is-excellent';
  if (value >= 60) return 'is-good';
  if (value >= 40) return 'is-warning';
  return 'is-risk';
}

globalThis.renderAnalysisStory = renderAnalysisStory;
globalThis.renderLastPickState = renderLastPickState;
globalThis.renderAnalysisEmptyState = renderAnalysisEmptyState;
globalThis.renderLastPickEmptyState = renderLastPickEmptyState;
