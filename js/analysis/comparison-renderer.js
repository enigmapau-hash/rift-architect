import { clamp, cleanText, uniqueValues } from './analysis-utils.js';

export function renderComparisonState(root, model = {}) {
  if (!root) return;

  const comparison = model.comparison || {};
  const left = model.left || {};
  const right = model.right || {};
  const beforeAnalysis = comparison.beforeAnalysis || {};
  const afterAnalysis = comparison.afterAnalysis || {};
  const impactScore = Number(comparison?.impact?.score ?? 0);
  const winner = impactScore > 0 ? 'Composición B' : impactScore < 0 ? 'Composición A' : 'Empate';
  const verdict = cleanText(comparison?.summary?.verdict || (impactScore > 0 ? 'Mejora' : impactScore < 0 ? 'Empeora' : 'Neutro'));
  const reason = cleanText(comparison?.summary?.reason || 'Comparación equilibrada entre ambos estados del draft.');
  const keyGain = cleanText(comparison?.summary?.keyGain || comparison?.impact?.gain || 'Sin mejora clara');
  const keyLoss = cleanText(comparison?.summary?.keyLoss || comparison?.impact?.loss || 'Sin pérdida clara');
  const title = cleanText(model.title || 'Composición A vs B');
  const summary = cleanText(model.summary || 'Compara dos composiciones guardadas y entiende cuál encaja mejor con tu plan.');
  const leftLabel = cleanText(left.label || 'A');
  const rightLabel = cleanText(right.label || 'B');
  const leftSnapshot = renderSnapshotLabel(left, beforeAnalysis, leftLabel);
  const rightSnapshot = renderSnapshotLabel(right, afterAnalysis, rightLabel);
  const highlights = uniqueValues(Array.isArray(comparison.highlights) ? comparison.highlights : []).slice(0, 5);
  const changedFields = uniqueValues(Array.isArray(comparison.changedFields) ? comparison.changedFields : []).slice(0, 10);
  const scoreTone = toneByDelta(impactScore);

  root.hidden = false;
  root.innerHTML = `
    <section class="analysis-hub__shell analysis-hub__shell--cards analysis-comparison">
      <header class="analysis-hub__hero">
        <div class="analysis-hub__hero-copy">
          <p class="eyebrow">Bloque 3 · Comparador</p>
          <h4>${escapeHtml(title)}</h4>
          <p>${escapeHtml(summary)}</p>
          <div class="analysis-hub__flow-mini">
            <span class="analysis-hub__flow-mini-item is-active">Composición A</span>
            <span class="analysis-hub__flow-mini-item is-active">VS</span>
            <span class="analysis-hub__flow-mini-item is-active">Composición B</span>
          </div>
        </div>

        <div class="analysis-hub__score-card ${scoreTone}">
          <span class="analysis-hub__score-kicker">Veredicto</span>
          <strong>${escapeHtml(winner)}</strong>
          <span>${escapeHtml(verdict)} · ${escapeHtml(String(impactScore))} pts</span>
        </div>
      </header>

      <div class="analysis-hub__grid">
        ${renderSnapshotCard('Composición A', leftSnapshot, beforeAnalysis)}
        ${renderSnapshotCard('Composición B', rightSnapshot, afterAnalysis)}
        ${renderVerdictCard({ verdict, reason, keyGain, keyLoss, impactScore })}
        ${renderChangesCard({ changedFields, highlights })}
      </div>
    </section>
  `;
}

export function renderComparisonEmptyState(root, model = {}) {
  if (!root) return;

  const hasA = Boolean(model?.a);
  const hasB = Boolean(model?.b);
  const status = [hasA ? `A (${Number(model.a?.count || 0)})` : null, hasB ? `B (${Number(model.b?.count || 0)})` : null]
    .filter(Boolean)
    .join(' · ') || 'Ninguna guardada';

  root.hidden = false;
  root.innerHTML = `
    <article class="analysis-hub__empty">
      <p class="eyebrow">Bloque 3 · Comparador</p>
      <h4>Guarda dos composiciones para compararlas</h4>
      <p>Usa los botones <strong>Guardar A</strong> y <strong>Guardar B</strong> para fijar dos drafts y ver cuál encaja mejor con tu plan.</p>
      <p class="analysis-hub__card-foot">Estado actual: ${escapeHtml(status)}</p>
    </article>
  `;
}

function renderSnapshotCard(label, snapshotLabel, analysis = {}) {
  const champions = Array.isArray(snapshotLabel.champions) ? snapshotLabel.champions : [];
  const count = Number(snapshotLabel.count ?? champions.length ?? 0);
  const identity = cleanText(analysis.primaryIdentity || analysis.identity?.primaryIdentity || 'Sin definir');
  const tempo = cleanText(analysis.tempo || analysis.identity?.tempo || 'Sin definir');
  const winCondition = cleanText(analysis.winCondition?.label || analysis.winCondition?.name || analysis.identity?.winLabel || 'Sin definir');
  const summaryText = cleanText(analysis.summaryText || analysis.identityCopy || 'Sin resumen disponible.');
  const confidence = clamp(Number(analysis.confidence ?? analysis.score?.value ?? 0), 0, 100);
  const roster = champions.length
    ? champions.slice(0, 5)
    : (analysis.composition?.selectedChampions || []).map((champion) => champion.champion).filter(Boolean).slice(0, 5);

  return `
    <article class="analysis-hub__card analysis-hub__card--assessment">
      <span class="analysis-hub__card-kicker">${escapeHtml(label)}</span>
      <strong class="analysis-hub__card-title">${escapeHtml(identity)}</strong>
      <p class="analysis-hub__card-copy">${escapeHtml(summaryText)}</p>
      <div class="analysis-hub__chip-list">
        ${roster.length
          ? roster.map((champion) => `<span class="story-pill story-pill--info">${escapeHtml(champion)}</span>`).join('')
          : '<span class="analysis-empty">Sin campeones guardados</span>'}
      </div>
      <div class="analysis-hub__profile-bar" aria-hidden="true">
        <div class="analysis-hub__profile-fill" style="--meter:${confidence}%"></div>
      </div>
      <p class="analysis-hub__card-foot">${escapeHtml(String(count))} campeones · Tempo: ${escapeHtml(tempo)} · Victoria: ${escapeHtml(winCondition)}</p>
    </article>
  `;
}

function renderVerdictCard({ verdict, reason, keyGain, keyLoss, impactScore }) {
  return `
    <article class="analysis-hub__card analysis-hub__card--assessment">
      <span class="analysis-hub__card-kicker">Qué encaja mejor</span>
      <strong class="analysis-hub__card-title">${escapeHtml(verdict)}</strong>
      <p class="analysis-hub__card-copy">${escapeHtml(reason)}</p>
      <div class="analysis-hub__chip-list">
        <span class="story-pill story-pill--success">${escapeHtml(keyGain)}</span>
        <span class="story-pill story-pill--danger">${escapeHtml(keyLoss)}</span>
      </div>
      <p class="analysis-hub__card-foot">Delta de impacto: ${escapeHtml(String(impactScore))}</p>
    </article>
  `;
}

function renderChangesCard({ changedFields = [], highlights = [] }) {
  return `
    <article class="analysis-hub__card">
      <span class="analysis-hub__card-kicker">Qué cambia</span>
      <div class="analysis-hub__chip-list">
        ${changedFields.length
          ? changedFields.map((item) => `<span class="story-pill story-pill--coach">${escapeHtml(item)}</span>`).join('')
          : '<span class="analysis-empty">Sin cambios relevantes</span>'}
      </div>
      <div class="analysis-hub__list">
        ${highlights.length
          ? highlights
              .map(
                (item) => `
                  <article class="analysis-hub__profile-row">
                    <div class="analysis-hub__profile-head">
                      <strong>${escapeHtml(item)}</strong>
                    </div>
                  </article>
                `
              )
              .join('')
          : '<p class="analysis-empty">No hay diferencias destacadas.</p>'}
      </div>
    </article>
  `;
}

function renderSnapshotLabel(snapshot = {}, analysis = {}, fallback = '') {
  return {
    champions: Array.isArray(snapshot.selectedChampions)
      ? snapshot.selectedChampions.map((champion) => champion.champion).filter(Boolean)
      : [],
    count: snapshot.count ?? analysis.composition?.count ?? 0,
    label: snapshot.label || fallback,
  };
}

function toneByDelta(score = 0) {
  const value = Number(score) || 0;
  if (value > 0) return 'is-strong';
  if (value < 0) return 'is-low';
  return 'is-mid';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
