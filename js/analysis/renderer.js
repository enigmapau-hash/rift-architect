export function renderAnalysisStory(root, story = {}) {
  if (!root) return;

  root.hidden = false;
  root.innerHTML = `
    <section class="analysis-hub__shell analysis-hub__shell--cards">
      <header class="analysis-hub__hero">
        <div class="analysis-hub__hero-copy">
          <p class="eyebrow">Bloque 2 · Pantalla principal</p>
          <h4>${escapeHtml(story.title || 'Análisis de composición')}</h4>
          <p>${escapeHtml(story.summaryText || 'Resumen compacto basado en la composición propia.')}</p>
          <div class="analysis-hub__flow-mini">
            ${(story.tags || [])
              .map((tag, index) => `<span class="analysis-hub__flow-mini-item ${index === 0 ? 'is-active' : ''}">${escapeHtml(tag)}</span>`)
              .join('')}
          </div>
        </div>

        <div class="analysis-hub__score-card ${toneByScore(story.confidence)}">
          <span class="analysis-hub__score-kicker">Lectura rápida</span>
          <strong>${escapeHtml(story.grade || 'B')}</strong>
          <span>${escapeHtml(story.scoreBadge || 'Media')} · ${escapeHtml(String(story.confidence ?? 0))}%</span>
        </div>
      </header>

      <div class="analysis-hub__grid">
        ${renderIdentityCard(story)}
        ${renderContextualCard(story)}
        ${renderBanCard(story)}
        ${renderListCard('Fortalezas', story.strengths || [], 'story-pill--success', 'Apoya el plan')}
        ${renderListCard('Debilidades', story.weaknesses || [], 'story-pill--danger', 'A vigilar')}
        ${renderPlanCard(story)}
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
          <h4>${escapeHtml(story.title || 'Recomendación del último pick')}</h4>
          <p>${escapeHtml(story.summaryText || story.summary || 'Te falta un campeón para cerrar la composición.')}</p>
          <div class="analysis-hub__flow-mini">
            ${(story.tags || [])
              .map((tag, index) => `<span class="analysis-hub__flow-mini-item ${index === 0 ? 'is-active' : ''}">${escapeHtml(tag)}</span>`)
              .join('')}
          </div>
        </div>

        <div class="analysis-hub__score-card ${toneByScore(bestPick?.score || 0)}">
          <span class="analysis-hub__score-kicker">Último slot</span>
          <strong>${escapeHtml(story.targetRoleLabel || story.targetRole || 'Sin definir')}</strong>
          <span>${escapeHtml(story.focus || 'Cerrar el draft')}
          </span>
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
      <p>Primero verás un resumen corto. La historia completa aparecerá cuando la composición esté completa.</p>
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
      <p>${escapeHtml(story.summaryText || 'Añade cuatro campeones y deja un hueco para ver el último pick recomendado.')}</p>
    </article>
  `;
}

function renderIdentityCard(model) {
  return `
    <article class="analysis-hub__card analysis-hub__card--assessment">
      <span class="analysis-hub__card-kicker">Identidad</span>
      <strong class="analysis-hub__card-title">${escapeHtml(model.primaryIdentity || 'Sin definir')}</strong>
      <p class="analysis-hub__card-copy">${escapeHtml(model.identityCopy || model.summaryText || '')}</p>
      <div class="analysis-hub__chip-list">
        ${(model.secondaryIdentities || []).length
          ? model.secondaryIdentities.map((item) => `<span class="story-pill story-pill--info">${escapeHtml(item)}</span>`).join('')
          : '<span class="analysis-empty">Sin secundarias claras</span>'}
      </div>
      <div class="analysis-hub__profile-bar" aria-hidden="true">
        <div class="analysis-hub__profile-fill" style="--meter:${clamp(model.confidence, 0, 100)}%"></div>
      </div>
      <p class="analysis-hub__card-foot">Tempo: ${escapeHtml(model.tempo || 'Sin definir')} · Dominancia: ${escapeHtml(model.dominance || 'Sin definir')}</p>
    </article>
  `;
}

function renderContextualCard(model) {
  const contextual = model.contextual || {};
  const rules = Array.isArray(contextual.rules) ? contextual.rules : [];
  const signals = Array.isArray(contextual.signals) ? contextual.signals : [];

  return `
    <article class="analysis-hub__card analysis-hub__card--assessment">
      <span class="analysis-hub__card-kicker">Lectura contextual</span>
      <strong class="analysis-hub__card-title">${escapeHtml(contextual.headline || 'Narrativa adaptativa')}</strong>
      <p class="analysis-hub__card-copy">${escapeHtml(contextual.lead || contextual.summary || 'La historia contextual aparecerá aquí.')}</p>
      <div class="analysis-hub__chip-list">
        ${signals.length
          ? signals.slice(0, 4).map((item) => `<span class="story-pill story-pill--coach">${escapeHtml(item)}</span>`).join('')
          : '<span class="analysis-empty">Sin señales claras</span>'}
      </div>
      <div class="analysis-hub__list">
        ${rules.length
          ? rules
              .map(
                (rule) => `
                  <article class="analysis-hub__profile-row">
                    <div class="analysis-hub__profile-head">
                      <strong>${escapeHtml(rule.label || '')}</strong>
                      <span>${escapeHtml(rule.kind || 'contexto')}</span>
                    </div>
                    <p>${escapeHtml(rule.detail || '')}</p>
                  </article>
                `
              )
              .join('')
          : '<p class="analysis-empty">No hay reglas contextuales claras</p>'}
      </div>
    </article>
  `;
}

function renderBestPickCard(bestPick, story) {
  if (!bestPick) {
    return `
      <article class="analysis-hub__card analysis-hub__card--assessment">
        <span class="analysis-hub__card-kicker">Mejor pick</span>
        <p class="analysis-empty">No hay una recomendación clara para cerrar el draft.</p>
      </article>
    `;
  }

  return `
    <article class="analysis-hub__card analysis-hub__card--assessment">
      <span class="analysis-hub__card-kicker">Mejor último pick</span>
      <strong class="analysis-hub__card-title">${escapeHtml(bestPick.champion || 'Sin definir')}</strong>
      <p class="analysis-hub__card-copy">${escapeHtml(bestPick.problem || 'Cierra el hueco más evidente del draft.')}</p>
      <div class="analysis-hub__chip-list">
        ${(bestPick.solves || []).length
          ? bestPick.solves.map((item) => `<span class="story-pill story-pill--success">${escapeHtml(item)}</span>`).join('')
          : '<span class="analysis-empty">Problema resuelto</span>'}
      </div>
      <div class="analysis-hub__profile-bar" aria-hidden="true">
        <div class="analysis-hub__profile-fill" style="--meter:${clamp(bestPick.score, 0, 100)}%"></div>
      </div>
      <p class="analysis-hub__card-foot">${escapeHtml(bestPick.reason || story.focus || '')}</p>
    </article>
  `;
}

function renderRecommendationListCard(title, items) {
  return `
    <article class="analysis-hub__card">
      <span class="analysis-hub__card-kicker">${escapeHtml(title)}</span>
      <div class="analysis-hub__list">
        ${(Array.isArray(items) ? items : [])
          .length
          ? items
              .map(
                (item) => `
                  <article class="analysis-hub__profile-row">
                    <div class="analysis-hub__profile-head">
                      <strong>${escapeHtml(item.champion || '')}</strong>
                      <span>${escapeHtml(item.role || 'último slot')} · ${escapeHtml(String(item.score ?? 0))}%</span>
                    </div>
                    <p>${escapeHtml(item.reason || item.problem || '')}</p>
                    <div class="analysis-hub__chip-list">
                      ${(item.solves || []).length
                        ? item.solves.map((solve) => `<span class="story-pill story-pill--info">${escapeHtml(solve)}</span>`).join('')
                        : '<span class="analysis-empty">Alternativa</span>'}
                    </div>
                  </article>
                `
              )
              .join('')
          : '<p class="analysis-empty">Sin alternativas claras</p>'}
      </div>
    </article>
  `;
}

function renderLastPickContextCard(model) {
  const profile = model.profile || {};
  return `
    <article class="analysis-hub__card analysis-hub__card--assessment">
      <span class="analysis-hub__card-kicker">Qué resuelve</span>
      <strong class="analysis-hub__card-title">${escapeHtml(profile.focus || model.focus || 'Cerrar el hueco del draft')}</strong>
      <p class="analysis-hub__card-copy">${escapeHtml(profile.summary || model.summary || 'La recomendación prioriza la pieza que más estabiliza la composición.')}</p>
      <div class="analysis-hub__chip-list">
        ${(profile.needs || []).slice(0, 4).map((item) => `<span class="story-pill story-pill--coach">${escapeHtml(item)}</span>`).join('') || '<span class="analysis-empty">Sin necesidades claras</span>'}
      </div>
      <p class="analysis-hub__card-foot">Último slot: ${escapeHtml(model.targetRoleLabel || model.targetRole || 'Sin definir')}</p>
    </article>
  `;
}

function renderListCard(title, items, pillClass, emptyLabel) {
  return `
    <article class="analysis-hub__card">
      <span class="analysis-hub__card-kicker">${escapeHtml(title)}</span>
      <div class="analysis-hub__list">
        ${items.length
          ? items
              .map(
                (item) => `
              <article class="analysis-hub__profile-row">
                <div class="analysis-hub__profile-head">
                  <strong>${escapeHtml(item.label || item)}</strong>
                  <span>${escapeHtml(item.badge || '')} · ${escapeHtml(String(item.score ?? 0))}%</span>
                </div>
                <div class="analysis-hub__profile-bar" aria-hidden="true">
                  <div class="analysis-hub__profile-fill" style="--meter:${clamp(item.score, 0, 100)}%"></div>
                </div>
                <p>${escapeHtml(item.detail || '')}</p>
                <div class="analysis-hub__chip-list"><span class="story-pill ${pillClass}">${escapeHtml(emptyLabel)}</span></div>
              </article>
            `
              )
              .join('')
          : `<p class="analysis-empty">${escapeHtml(emptyLabel)}</p>`}
      </div>
    </article>
  `;
}

function renderPlanCard(model) {
  return `
    <article class="analysis-hub__card analysis-hub__card--assessment">
      <span class="analysis-hub__card-kicker">Plan</span>
      <div class="analysis-hub__timeline-grid">
        ${(model.phases || [])
          .map(
            (phase) => `
              <article class="analysis-hub__timeline-row">
                <div class="analysis-hub__profile-head">
                  <strong>${escapeHtml(phase.phase || '')}</strong>
                  <span>${escapeHtml(phase.title || '')}</span>
                </div>
                <p>${escapeHtml(phase.detail || '')}</p>
                ${(phase.actions || []).length ? `<div class="analysis-hub__chip-list">${phase.actions.map((action) => `<span class="story-pill story-pill--info">${escapeHtml(action)}</span>`).join('')}</div>` : ''}
              </article>
            `
          )
          .join('')}
      </div>
    </article>
  `;
}

function renderDualCard(model) {
  return `
    <article class="analysis-hub__card analysis-hub__card--assessment">
      <span class="analysis-hub__card-kicker">Sinergias y riesgos</span>
      <div class="analysis-hub__evidence-grid">
        <article class="analysis-hub__evidence-card">
          <span class="analysis-hub__card-kicker">Sinergias</span>
          <div class="analysis-hub__chip-list">
            ${(model.synergies || []).length
              ? model.synergies.map((item) => `<span class="story-pill story-pill--success">${escapeHtml(item)}</span>`).join('')
              : '<span class="analysis-empty">Sin sinergias claras</span>'}
          </div>
        </article>

        <article class="analysis-hub__evidence-card analysis-hub__evidence-card--danger">
          <span class="analysis-hub__card-kicker">Riesgos</span>
          <div class="analysis-hub__chip-list">
            ${(model.risks || []).length
              ? model.risks.map((item) => `<span class="story-pill story-pill--danger">${escapeHtml(item)}</span>`).join('')
              : '<span class="analysis-empty">Sin riesgos claros</span>'}
          </div>
        </article>
      </div>
    </article>
  `;
}

function toneByScore(score = 0) {
  const value = clamp(Number(score) || 0, 0, 100);
  if (value >= 85) return 'is-strong';
  if (value >= 70) return 'is-mid';
  return 'is-low';
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
  return Math.min(max, Math.max(min, Number(value) || 0));
}
