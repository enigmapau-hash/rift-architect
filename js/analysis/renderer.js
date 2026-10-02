export function renderAnalysisStory(root, story = {}) {
  if (!root) return;

  const tags = uniqueText(Array.isArray(story.tags) ? story.tags : []).slice(0, 4);
  const summaryText = cleanText(story.summaryText) || 'Selecciona cinco campeones para ver el análisis completo de la composición.';

  root.hidden = false;
  root.innerHTML = `
    <section class="analysis-hub__shell analysis-hub__shell--cards">
      <header class="analysis-hub__hero">
        <div class="analysis-hub__hero-copy">
          <p class="eyebrow">Bloque 2 · Pantalla principal</p>
          <h4>${escapeHtml(cleanValue(story.title, 'Análisis de composición'))}</h4>
          <p>${escapeHtml(summaryText)}</p>
          ${tags.length ? `<div class="analysis-hub__flow-mini">${tags.map((tag, index) => `<span class="analysis-hub__flow-mini-item ${index === 0 ? 'is-active' : ''}">${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
        </div>

        <div class="analysis-hub__score-card ${toneByScore(story.confidence)}">
          <span class="analysis-hub__score-kicker">Lectura rápida</span>
          <strong>${escapeHtml(cleanValue(story.grade, 'B'))}</strong>
          <span>${escapeHtml(cleanValue(story.scoreBadge, 'Media'))} · ${escapeHtml(String(clamp(story.confidence, 0, 100)))}%</span>
        </div>
      </header>

      <div class="analysis-hub__grid">
        ${renderIdentityCard(story)}
        ${renderContextualCard(story)}
        ${renderPlanCard(story)}
        ${renderBanCard(story)}
        ${renderListCard('Fortalezas', story.strengths, 'Apoya el plan', 'story-pill--success', 'A favor')}
        ${renderListCard('Debilidades', story.weaknesses, 'A vigilar', 'story-pill--danger', 'Riesgo')}
        ${renderDualCard(story)}
      </div>
    </section>
  `;
}

export function renderLastPickState(root, story = {}) {
  if (!root) return;

  const bestPick = story.bestPick || null;
  const alternatives = Array.isArray(story.alternatives) ? story.alternatives : [];

  root.hidden = false;
  root.innerHTML = `
    <section class="analysis-hub__shell analysis-hub__shell--cards">
      <header class="analysis-hub__hero">
        <div class="analysis-hub__hero-copy">
          <p class="eyebrow">Bloque 2 · Último pick</p>
          <h4>${escapeHtml(cleanValue(story.title, 'Recomendación del último pick'))}</h4>
          <p>${escapeHtml(cleanValue(story.summaryText || story.summary, 'Te falta un campeón para cerrar la composición.'))}</p>
          ${(Array.isArray(story.tags) && story.tags.length)
            ? `<div class="analysis-hub__flow-mini">${story.tags.slice(0, 4).map((tag, index) => `<span class="analysis-hub__flow-mini-item ${index === 0 ? 'is-active' : ''}">${escapeHtml(cleanValue(tag))}</span>`).join('')}</div>`
            : ''}
        </div>

        <div class="analysis-hub__score-card ${toneByScore(bestPick?.score || 0)}">
          <span class="analysis-hub__score-kicker">Último slot</span>
          <strong>${escapeHtml(cleanValue(story.targetRoleLabel || story.targetRole, 'Sin definir'))}</strong>
          <span>${escapeHtml(cleanValue(story.focus, 'Cerrar el draft'))}</span>
        </div>
      </header>

      <div class="analysis-hub__grid">
        ${renderBestPickCard(bestPick, story)}
        ${renderRecommendationListCard('Alternativas', alternatives)}
        ${renderLastPickContextCard(story)}
      </div>
    </section>
  `;
}

export function renderAnalysisEmptyState(root) {
  if (!root) return;

  root.hidden = false;
  root.innerHTML = `
    <article class="analysis-hub__empty">
      <p class="eyebrow">Bloque 2 · Pantalla principal</p>
      <h4>Selecciona cinco campeones para ver el análisis</h4>
      <p>Primero verás un resumen corto. La lectura completa aparecerá cuando la composición esté cerrada.</p>
    </article>
  `;
}

export function renderLastPickEmptyState(root, story = {}) {
  if (!root) return;

  root.hidden = false;
  root.innerHTML = `
    <article class="analysis-hub__empty">
      <p class="eyebrow">Bloque 2 · Último pick</p>
      <h4>No hay una recomendación clara todavía</h4>
      <p>${escapeHtml(cleanValue(story.summaryText || story.summary, 'Añade cuatro campeones y deja un hueco para ver el último pick recomendado.'))}</p>
    </article>
  `;
}

function renderIdentityCard(model) {
  const secondaryIdentities = uniqueText(Array.isArray(model.secondaryIdentities) ? model.secondaryIdentities : []).slice(0, 3);
  return `
    <article class="analysis-hub__card analysis-hub__card--assessment">
      <span class="analysis-hub__card-kicker">Identidad</span>
      <strong class="analysis-hub__card-title">${escapeHtml(cleanValue(model.primaryIdentity, 'Identidad por cerrar'))}</strong>
      <p class="analysis-hub__card-copy">${escapeHtml(cleanText(model.identityCopy) || cleanText(model.summaryText) || 'La lectura todavía necesita más datos.')}</p>
      <div class="analysis-hub__chip-list">
        ${secondaryIdentities.length
          ? secondaryIdentities.map((item) => `<span class="story-pill story-pill--info">${escapeHtml(item)}</span>`).join('')
          : '<span class="analysis-empty">Lectura en progreso</span>'}
      </div>
      <div class="analysis-hub__profile-bar" aria-hidden="true">
        <div class="analysis-hub__profile-fill" style="--meter:${clamp(model.confidence, 0, 100)}%"></div>
      </div>
      <p class="analysis-hub__card-foot">Tempo: ${escapeHtml(cleanValue(model.tempo, 'Por definir'))} · Dominancia: ${escapeHtml(cleanValue(model.dominance, 'Por definir'))}</p>
    </article>
  `;
}

function renderContextualCard(model) {
  const contextual = model.contextual || {};
  const rules = normalizeRuleList(contextual.rules).slice(0, 3);
  const signals = uniqueText(Array.isArray(contextual.signals) ? contextual.signals : []).slice(0, 4);

  return `
    <article class="analysis-hub__card analysis-hub__card--assessment">
      <span class="analysis-hub__card-kicker">Lectura contextual</span>
      <strong class="analysis-hub__card-title">${escapeHtml(cleanValue(contextual.headline, 'Narrativa adaptativa'))}</strong>
      <p class="analysis-hub__card-copy">${escapeHtml(cleanText(contextual.lead) || cleanText(contextual.summary) || 'La lectura contextual aparecerá aquí.')}</p>
      <div class="analysis-hub__chip-list">
        ${signals.length
          ? signals.map((item) => `<span class="story-pill story-pill--coach">${escapeHtml(item)}</span>`).join('')
          : '<span class="analysis-empty">Sin señales claras</span>'}
      </div>
      <div class="analysis-hub__list">
        ${rules.length
          ? rules.map((rule) => `
              <article class="analysis-hub__profile-row">
                <div class="analysis-hub__profile-head">
                  <strong>${escapeHtml(cleanValue(rule.label, 'Regla'))}</strong>
                  <span>${escapeHtml(cleanValue(rule.kind, 'contexto'))}</span>
                </div>
                <p>${escapeHtml(cleanValue(rule.detail, 'Lectura contextual en desarrollo.'))}</p>
              </article>
            `).join('')
          : '<p class="analysis-empty">No hay reglas contextuales claras</p>'}
      </div>
    </article>
  `;
}

function renderBanCard(model) {
  const bans = normalizeBanList(model.bans).slice(0, 3);

  return `
    <article class="analysis-hub__card analysis-hub__card--assessment">
      <span class="analysis-hub__card-kicker">Bans inteligentes</span>
      <strong class="analysis-hub__card-title">${escapeHtml(cleanValue(model.banFocus, 'Quita lo que rompe el plan'))}</strong>
      <p class="analysis-hub__card-copy">${escapeHtml(cleanText(model.banSummary) || 'Los mejores bans cortan la entrada, la visión o la respuesta global del rival.')}</p>
      <div class="analysis-hub__list">
        ${bans.length
          ? bans.map((item) => `
              <article class="analysis-hub__profile-row">
                <div class="analysis-hub__profile-head">
                  <strong>${escapeHtml(cleanValue(item.champion, 'Ban'))}</strong>
                  <span>${escapeHtml(cleanValue(item.priority, 'ban'))} · ${escapeHtml(String(clamp(item.score, 0, 100)))}%</span>
                </div>
                <div class="analysis-hub__profile-bar" aria-hidden="true">
                  <div class="analysis-hub__profile-fill" style="--meter:${clamp(item.score, 0, 100)}%"></div>
                </div>
                <p>${escapeHtml(cleanValue(item.reason, 'Impacto directo sobre tu plan.'))}</p>
                <div class="analysis-hub__chip-list">
                  ${(Array.isArray(item.tags) && item.tags.length)
                    ? item.tags.slice(0, 3).map((tag) => `<span class="story-pill story-pill--danger">${escapeHtml(cleanValue(tag))}</span>`).join('')
                    : '<span class="analysis-empty">Impacto directo</span>'}
                </div>
              </article>
            `).join('')
          : '<p class="analysis-empty">Sin bans calculados</p>'}
      </div>
    </article>
  `;
}

function renderBestPickCard(bestPick, story) {
  if (!bestPick) {
    return `
      <article class="analysis-hub__card analysis-hub__card--assessment">
        <span class="analysis-hub__card-kicker">Mejor pick</span>
        <p class="analysis-empty">Aún no hay una recomendación firme para cerrar el draft.</p>
      </article>
    `;
  }

  const solves = uniqueText(Array.isArray(bestPick.solves) ? bestPick.solves : []).slice(0, 3);

  return `
    <article class="analysis-hub__card analysis-hub__card--assessment">
      <span class="analysis-hub__card-kicker">Mejor último pick</span>
      <strong class="analysis-hub__card-title">${escapeHtml(cleanValue(bestPick.champion, 'Sin definir'))}</strong>
      <p class="analysis-hub__card-copy">${escapeHtml(cleanValue(bestPick.problem, 'Cierra el hueco más evidente del draft.'))}</p>
      <div class="analysis-hub__chip-list">
        ${solves.length
          ? solves.map((item) => `<span class="story-pill story-pill--success">${escapeHtml(item)}</span>`).join('')
          : '<span class="analysis-empty">Problema resuelto</span>'}
      </div>
      <div class="analysis-hub__profile-bar" aria-hidden="true">
        <div class="analysis-hub__profile-fill" style="--meter:${clamp(bestPick.score, 0, 100)}%"></div>
      </div>
      <p class="analysis-hub__card-foot">${escapeHtml(cleanValue(bestPick.reason || story.focus, 'Pick orientado a cerrar el draft.'))}</p>
    </article>
  `;
}

function renderRecommendationListCard(title, items) {
  const normalized = Array.isArray(items) ? items : [];

  return `
    <article class="analysis-hub__card">
      <span class="analysis-hub__card-kicker">${escapeHtml(title)}</span>
      <div class="analysis-hub__list">
        ${normalized.length
          ? normalized.slice(0, 3).map((item) => `
              <article class="analysis-hub__profile-row">
                <div class="analysis-hub__profile-head">
                  <strong>${escapeHtml(cleanValue(item.champion, 'Alternativa'))}</strong>
                  <span>${escapeHtml(cleanValue(item.role, 'último slot'))} · ${escapeHtml(String(clamp(item.score, 0, 100)))}%</span>
                </div>
                <p>${escapeHtml(cleanValue(item.reason || item.problem, 'Otra opción para resolver el draft.'))}</p>
                <div class="analysis-hub__chip-list">
                  ${(Array.isArray(item.solves) && item.solves.length)
                    ? item.solves.slice(0, 3).map((solve) => `<span class="story-pill story-pill--info">${escapeHtml(cleanValue(solve))}</span>`).join('')
                    : '<span class="analysis-empty">Alternativa</span>'}
                </div>
              </article>
            `).join('')
          : '<p class="analysis-empty">Sin alternativas claras</p>'}
      </div>
    </article>
  `;
}

function renderLastPickContextCard(model) {
  const profile = model.profile || {};
  const needs = uniqueText(Array.isArray(profile.needs) ? profile.needs : []).slice(0, 4);

  return `
    <article class="analysis-hub__card analysis-hub__card--assessment">
      <span class="analysis-hub__card-kicker">Qué resuelve</span>
      <strong class="analysis-hub__card-title">${escapeHtml(cleanValue(profile.focus || model.focus, 'Cerrar el hueco del draft'))}</strong>
      <p class="analysis-hub__card-copy">${escapeHtml(cleanValue(profile.summary || model.summary, 'La recomendación prioriza la pieza que más estabiliza la composición.'))}</p>
      <div class="analysis-hub__chip-list">
        ${needs.length ? needs.map((item) => `<span class="story-pill story-pill--coach">${escapeHtml(item)}</span>`).join('') : '<span class="analysis-empty">Sin necesidades claras</span>'}
      </div>
      <p class="analysis-hub__card-foot">Último slot: ${escapeHtml(cleanValue(model.targetRoleLabel || model.targetRole, 'Sin definir'))}</p>
    </article>
  `;
}

function renderListCard(title, items, summaryLabel, pillClass, emptyLabel) {
  const normalized = normalizeItemList(items).slice(0, 3);

  return `
    <article class="analysis-hub__card">
      <span class="analysis-hub__card-kicker">${escapeHtml(title)}</span>
      <div class="analysis-hub__list">
        ${normalized.length
          ? normalized.map((item) => `
              <article class="analysis-hub__profile-row">
                <div class="analysis-hub__profile-head">
                  <strong>${escapeHtml(cleanValue(item.label, 'Elemento'))}</strong>
                  <span>${escapeHtml(cleanValue(item.badge, summaryLabel))} · ${escapeHtml(String(clamp(item.score, 0, 100)))}%</span>
                </div>
                <div class="analysis-hub__profile-bar" aria-hidden="true">
                  <div class="analysis-hub__profile-fill" style="--meter:${clamp(item.score, 0, 100)}%"></div>
                </div>
                <p>${escapeHtml(cleanValue(item.detail, 'Lectura todavía en desarrollo.'))}</p>
                <div class="analysis-hub__chip-list"><span class="story-pill ${pillClass}">${escapeHtml(emptyLabel)}</span></div>
              </article>
            `).join('')
          : `<p class="analysis-empty">${escapeHtml(emptyLabel)}</p>`}
      </div>
    </article>
  `;
}

function renderPlanCard(model) {
  const phases = normalizePhaseList(model.phases).slice(0, 3);

  return `
    <article class="analysis-hub__card analysis-hub__card--assessment">
      <span class="analysis-hub__card-kicker">Plan</span>
      <div class="analysis-hub__timeline-grid">
        ${phases.length
          ? phases.map((phase) => `
              <article class="analysis-hub__timeline-row">
                <div class="analysis-hub__profile-head">
                  <strong>${escapeHtml(cleanValue(phase.phase, 'Fase'))}</strong>
                  <span>${escapeHtml(cleanValue(phase.title, 'Prioridad'))}</span>
                </div>
                <p>${escapeHtml(cleanValue(phase.detail, 'La ejecución se completará cuando la composición esté cerrada.'))}</p>
                ${Array.isArray(phase.actions) && phase.actions.length ? `<div class="analysis-hub__chip-list">${phase.actions.slice(0, 3).map((action) => `<span class="story-pill story-pill--info">${escapeHtml(cleanValue(action))}</span>`).join('')}</div>` : ''}
              </article>
            `).join('')
          : '<p class="analysis-empty">Plan todavía en desarrollo</p>'}
      </div>
    </article>
  `;
}

function renderDualCard(model) {
  const synergies = uniqueText(Array.isArray(model.synergies) ? model.synergies : []).slice(0, 3);
  const risks = uniqueText(Array.isArray(model.risks) ? model.risks : []).slice(0, 3);

  return `
    <article class="analysis-hub__card analysis-hub__card--assessment">
      <span class="analysis-hub__card-kicker">Sinergias y riesgos</span>
      <div class="analysis-hub__evidence-grid">
        <article class="analysis-hub__evidence-card">
          <span class="analysis-hub__card-kicker">Sinergias</span>
          <p class="analysis-hub__evidence-text">${escapeHtml(synergies.length ? synergies.join(' · ') : 'Sin sinergias claras')}</p>
        </article>
        <article class="analysis-hub__evidence-card">
          <span class="analysis-hub__card-kicker">Riesgos</span>
          <p class="analysis-hub__evidence-text">${escapeHtml(risks.length ? risks.join(' · ') : 'Sin riesgos claros')}</p>
        </article>
      </div>
    </article>
  `;
}

function normalizeItemList(items = []) {
  return items
    .map((item) => {
      if (!item) return null;
      if (typeof item === 'string') {
        return { label: item, detail: '', badge: '', score: 0 };
      }
      return {
        label: item.label || item.name || item.title || item.champion || '',
        detail: item.detail || item.reason || item.summary || item.problem || '',
        badge: item.badge || item.kind || item.priority || '',
        score: item.score ?? 0,
      };
    })
    .filter(Boolean)
    .filter((item) => cleanValue(item.label, ''));
}

function normalizePhaseList(phases = []) {
  return phases
    .map((phase) => {
      if (!phase) return null;
      if (typeof phase === 'string') {
        return { phase: phase, title: '', detail: '', actions: [] };
      }
      return {
        phase: phase.phase || phase.label || phase.name || '',
        title: phase.title || phase.kind || '',
        detail: phase.detail || phase.description || phase.summary || '',
        actions: Array.isArray(phase.actions) ? phase.actions : [],
      };
    })
    .filter(Boolean)
    .filter((phase) => cleanValue(phase.phase, ''));
}

function normalizeRuleList(rules = []) {
  return rules
    .map((rule) => {
      if (!rule) return null;
      if (typeof rule === 'string') {
        return { label: rule, detail: '', kind: 'contexto' };
      }
      return {
        label: rule.label || rule.title || rule.name || '',
        detail: rule.detail || rule.description || rule.summary || '',
        kind: rule.kind || rule.type || 'contexto',
      };
    })
    .filter(Boolean)
    .filter((rule) => cleanValue(rule.label, ''));
}

function normalizeBanList(bans = []) {
  return bans
    .map((item) => {
      if (!item) return null;
      if (typeof item === 'string') {
        return { champion: item, reason: '', score: 0, priority: 'ban', tags: [] };
      }
      return {
        champion: item.champion || item.name || '',
        reason: item.reason || item.detail || '',
        score: item.score ?? 0,
        priority: item.priority || item.kind || 'ban',
        tags: Array.isArray(item.tags) ? item.tags : [],
      };
    })
    .filter(Boolean)
    .filter((item) => cleanValue(item.champion, ''));
}

function cleanValue(value, fallback = '') {
  const text = cleanText(value);
  if (!text) return fallback;
  if (/^sin definir$/i.test(text)) return fallback;
  return text;
}

function cleanText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function uniqueText(values = []) {
  const normalized = values
    .map((value) => cleanValue(value, ''))
    .filter(Boolean);
  return [...new Set(normalized)];
}

function toneByScore(score) {
  const value = clamp(score, 0, 100);
  if (value >= 80) return 'is-high';
  if (value >= 60) return 'is-medium';
  return 'is-low';
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}