import { analyzeComposition, simulateChampionSwap, normalizeText } from './analyzer.js';

const DATA_MANIFEST_URL = './data/index.json';
const ROLE_FILES = [
  { key: 'top', label: 'Top', file: './data/top.json' },
  { key: 'jungle', label: 'Jungla', file: './data/jungle.json' },
  { key: 'mid', label: 'Mid', file: './data/mid.json' },
  { key: 'botline', label: 'Botline', file: './data/bot.json' },
  { key: 'support', label: 'Support', file: './data/support.json' },
];

const ROLE_ORDER = ROLE_FILES.map(({ key }) => key);
const ROLE_LABELS = Object.fromEntries(ROLE_FILES.map(({ key, label }) => [key, label]));

const state = {
  data: new Map(),
  dataLoaded: false,
  patchScheduled: false,
};

init().catch((error) => console.error(error));

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function asText(value, fallback = 'Sin definir') {
  if (value == null) return fallback;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || fallback;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    const joined = value.map((item) => asText(item, '')).filter(Boolean).join(' · ');
    return joined || fallback;
  }
  if (typeof value === 'object') {
    return asText(
      value.label ?? value.name ?? value.title ?? value.text ?? value.value ?? value.detail ?? value.summary ?? value.reason ?? value.description ?? value.champion ?? value.item ?? '',
      fallback
    );
  }
  return String(value) || fallback;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueValues(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function percent(score, max = 10) {
  const numeric = Number.isFinite(Number(score)) ? Number(score) : 0;
  return Math.max(0, Math.min(100, Math.round((numeric / max) * 100)));
}

function stars(score = 0) {
  const numeric = Math.max(0, Math.min(5, Number(score) || 0));
  return '★★★★★'.slice(0, numeric) + '☆☆☆☆☆'.slice(0, 5 - numeric);
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

function normalizeSelectedChampion(champion) {
  if (!champion) return null;
  return {
    role: champion.role,
    champion: champion.champion,
    identity: champion.identity,
    function: champion.function,
    tempo: champion.tempo,
    strengths: asArray(champion.strengths),
    weaknesses: asArray(champion.weaknesses),
  };
}

function normalizeCandidate(candidate, role) {
  return normalizeSelectedChampion(candidate ? { role, ...candidate } : null);
}

async function loadRoleData() {
  if (state.dataLoaded) return;
  state.dataLoaded = true;

  try {
    const manifestResponse = await fetch(DATA_MANIFEST_URL, { cache: 'reload' });
    if (!manifestResponse.ok) return;

    const manifest = await manifestResponse.json();
    if (!Array.isArray(manifest?.files) || !manifest.files.length) return;

    const loaded = await Promise.all(
      ROLE_FILES.map(async ({ key, file }) => {
        const response = await fetch(file, { cache: 'reload' });
        if (!response.ok) throw new Error(`No se pudo leer ${file}`);
        return [key, await response.json()];
      })
    );

    loaded.forEach(([key, rows]) => state.data.set(key, Array.isArray(rows) ? rows : []));
  } catch {
    ROLE_FILES.forEach(({ key }) => state.data.set(key, []));
  }
}

function findChampion(roleKey, championName) {
  const normalizedName = String(championName || '').trim().toLowerCase();
  const rows = state.data.get(roleKey) || [];
  return rows.find((item) => String(item?.champion || '').trim().toLowerCase() === normalizedName) || null;
}

function collectSelectedChampions() {
  return [...document.querySelectorAll('#compositionGrid .slot.is-filled')]
    .map((slot) => {
      const role = String(slot.dataset.role || 'top');
      const name = slot.querySelector('.slot__name')?.textContent?.trim() || '';
      const champion = findChampion(role, name);
      return normalizeSelectedChampion(champion ? { role, ...champion } : null);
    })
    .filter(Boolean);
}

function compositionScore(analysis) {
  const confidence = Number.isFinite(Number(analysis?.confidence)) ? Number(analysis.confidence) : 0;
  const coherence = Number.isFinite(Number(analysis?.coherence?.score)) ? Number(analysis.coherence.score) : confidence;
  const metrics = asArray(analysis?.metrics);
  const metricAverage = metrics.length
    ? metrics.reduce((sum, metric) => sum + (Number.isFinite(Number(metric?.score)) ? Number(metric.score) : 0), 0) / metrics.length
    : 0;
  const raw = confidence * 0.45 + coherence * 0.35 + metricAverage * 10 * 0.2;
  const score = Math.max(0, Math.min(100, Math.round(raw)));
  return {
    score,
    grade: gradeFromScore(score),
    label: score >= 88 ? 'Excelente' : score >= 72 ? 'Sólida' : score >= 60 ? 'Funcional' : 'Frágil',
  };
}

function renderPills(items = [], emptyText = 'Sin datos') {
  const chips = uniqueValues(items.map((item) => asText(item)).filter((item) => item && item !== 'Sin definir'));
  return chips.length
    ? `<div class="analysis-chip-list analysis-chip-list--compact">${chips.map((chip) => `<span class="analysis-chip">${escapeHtml(chip)}</span>`).join('')}</div>`
    : `<p class="analysis-empty">${escapeHtml(emptyText)}</p>`;
}

function renderMiniStat(label, value, detail = '') {
  return `
    <article class="analysis-mini-stat">
      <span class="analysis-mini-stat__label">${escapeHtml(label)}</span>
      <strong class="analysis-mini-stat__value">${escapeHtml(value || 'Sin definir')}</strong>
      ${detail ? `<span class="analysis-mini-stat__detail">${escapeHtml(detail)}</span>` : ''}
    </article>
  `;
}

function renderMetricList(metrics = []) {
  const safeMetrics = asArray(metrics).slice(0, 6);
  if (!safeMetrics.length) return '<p class="analysis-empty">Sin métricas disponibles.</p>';

  return `
    <div class="analysis-metric-list">
      ${safeMetrics
        .map((metric) => {
          const score = Number.isFinite(Number(metric?.score)) ? Number(metric.score) : 0;
          const width = percent(score);
          return `
            <div class="analysis-metric">
              <div class="analysis-metric__head">
                <span>${escapeHtml(asText(metric?.label ?? metric?.name ?? metric?.key))}</span>
                <strong>${escapeHtml(String(score))}/10</strong>
              </div>
              <div class="analysis-meter">
                <span class="analysis-meter__fill" style="width:${width}%"></span>
              </div>
            </div>
          `;
        })
        .join('')}
    </div>
  `;
}

function renderHero(analysis, score) {
  const identity = analysis.primaryIdentity || 'Sin definir';
  const summaryText = analysis.summaryText || 'Resumen ejecutivo de la composición.';
  const confidence = Number.isFinite(Number(analysis.confidence)) ? Math.round(Number(analysis.confidence)) : 0;
  const tempoLabel = analysis.tempoDetail?.label || analysis.tempo || 'Sin definir';
  const winConditionLabel = analysis.winCondition?.label || 'Sin definir';
  const coherenceLabel = analysis.coherence?.label || 'Sin definir';
  const secondaryIdentities = asArray(analysis.secondaryIdentities).slice(0, 3);
  const damageSplit = analysis.damageSplit || {};

  return `
    <section class="composition-optimizer__hero analysis-hero">
      <div class="analysis-hero__main">
        <p class="eyebrow">Composition Optimizer</p>
        <h3>${escapeHtml(identity)}</h3>
        <p class="analysis-hero__summary">${escapeHtml(summaryText)}</p>

        <div class="composition-optimizer__scoreline">
          <span class="composition-optimizer__score">${score.score}</span>
          <div class="composition-optimizer__grade-block">
            <strong>${escapeHtml(score.grade)}</strong>
            <span>${escapeHtml(score.label)}</span>
          </div>
        </div>

        <div class="analysis-chip-list">
          <span class="analysis-chip">Win: ${escapeHtml(winConditionLabel)}</span>
          <span class="analysis-chip">Tempo: ${escapeHtml(tempoLabel)}</span>
          <span class="analysis-chip">Coherencia: ${escapeHtml(coherenceLabel)}</span>
          <span class="analysis-chip">Confianza ${confidence}%</span>
        </div>

        <div class="analysis-meta-strip">
          <div class="analysis-meta-strip__group">
            <span class="analysis-meta-strip__label">Identidades secundarias</span>
            ${renderPills(secondaryIdentities, 'Sin identidades secundarias')}
          </div>
          <div class="analysis-meta-strip__group">
            <span class="analysis-meta-strip__label">Reparto de daño</span>
            ${renderPills([`AD ${Number(damageSplit.ad || 0)}`, `AP ${Number(damageSplit.ap || 0)}`, `Híbrido ${Number(damageSplit.hybrid || 0)}`], 'Sin reparto')}
          </div>
        </div>
      </div>

      <aside class="analysis-hero__aside">
        ${renderMiniStat('Score', `${score.score}/100`, 'Calidad de la composición')}
        ${renderMiniStat('Win condition', winConditionLabel, 'Cómo cerrar la partida')}
        ${renderMiniStat('Tempo', tempoLabel, 'Ventana natural de poder')}
        ${renderMiniStat('Coherencia', coherenceLabel, 'Alineación interna')}
      </aside>
    </section>
  `;
}

function renderHeroSummary(analysis, score, recommendations) {
  const best = recommendations[0] || null;
  const bestLabel = best ? `${ROLE_LABELS[best.role] || best.role}: ${best.beforeChampion} → ${best.afterChampion}` : 'Sin swaps claros';

  return `
    <section class="analysis-card analysis-card--wide analysis-card--accent composition-optimizer__summary">
      <div class="analysis-card__header">
        <p class="eyebrow">Resumen ejecutivo</p>
        <h4>La mejor mejora disponible ahora mismo</h4>
      </div>
      <div class="analysis-subgrid">
        <article class="analysis-mini-stat">
          <span class="analysis-mini-stat__label">Mejor swap</span>
          <strong class="analysis-mini-stat__value">${escapeHtml(bestLabel)}</strong>
          <span class="analysis-mini-stat__detail">${escapeHtml(best ? `${best.impact.verdict} · ${best.impact.reason}` : 'No hay una recomendación clara.')}</span>
        </article>
        <article class="analysis-mini-stat">
          <span class="analysis-mini-stat__label">Beneficio esperado</span>
          <strong class="analysis-mini-stat__value">${best ? `${best.impact.score > 0 ? '+' : ''}${best.impact.score}` : '0'}</strong>
          <span class="analysis-mini-stat__detail">${best ? `${best.impact.gain} / ${best.impact.loss}` : 'Sin impacto medible.'}</span>
        </article>
      </div>
      <p class="analysis-summary-note">${escapeHtml(best ? `El optimizador prioriza ${ROLE_LABELS[best.role] || best.role} porque ofrece el cambio más claro en tu identidad actual.` : 'Selecciona una composición para evaluar swaps internos.')}</p>
    </section>
  `;
}

function renderMetricsDelta(metrics = []) {
  const changes = asArray(metrics).filter((metric) => metric.changed).slice(0, 6);
  if (!changes.length) return '<p class="analysis-empty">No hay variación relevante en métricas.</p>';

  return `
    <div class="analysis-metric-list">
      ${changes
        .map((metric) => {
          const width = percent(Math.max(0, metric.after));
          const sign = metric.delta > 0 ? '+' : '';
          return `
            <div class="analysis-metric">
              <div class="analysis-metric__head">
                <span>${escapeHtml(metric.label)}</span>
                <strong>${escapeHtml(String(metric.before))} → ${escapeHtml(String(metric.after))} (${sign}${escapeHtml(String(metric.delta))})</strong>
              </div>
              <div class="analysis-meter">
                <span class="analysis-meter__fill" style="width:${width}%"></span>
              </div>
            </div>
          `;
        })
        .join('')}
    </div>
  `;
}

function renderRecommendationCard(recommendation, index) {
  const { role, current, candidate, beforeChampion, afterChampion, impact, beforeAnalysis, afterAnalysis, diff } = recommendation;
  const roleLabel = ROLE_LABELS[role] || role;
  const beforeIdentity = beforeAnalysis?.primaryIdentity || 'Sin definir';
  const afterIdentity = afterAnalysis?.primaryIdentity || 'Sin definir';
  const beforeScore = Number.isFinite(Number(beforeAnalysis?.confidence)) ? Math.round(Number(beforeAnalysis.confidence)) : 0;
  const afterScore = Number.isFinite(Number(afterAnalysis?.confidence)) ? Math.round(Number(afterAnalysis.confidence)) : 0;

  return `
    <article class="analysis-card analysis-card--${impact.verdict === 'Mejora' ? 'good' : impact.verdict === 'Empeora' ? 'bad' : 'neutral'} composition-optimizer__card">
      <div class="analysis-card__header">
        <p class="eyebrow">${index + 1}. ${escapeHtml(roleLabel)}</p>
        <h4>${escapeHtml(beforeChampion)} → ${escapeHtml(afterChampion)}</h4>
      </div>

      <div class="analysis-subgrid">
        <article class="analysis-mini-stat">
          <span class="analysis-mini-stat__label">Antes</span>
          <strong class="analysis-mini-stat__value">${escapeHtml(beforeIdentity)}</strong>
          <span class="analysis-mini-stat__detail">Confianza ${beforeScore}% · ${escapeHtml(current.champion)}</span>
        </article>
        <article class="analysis-mini-stat">
          <span class="analysis-mini-stat__label">Después</span>
          <strong class="analysis-mini-stat__value">${escapeHtml(afterIdentity)}</strong>
          <span class="analysis-mini-stat__detail">Confianza ${afterScore}% · ${escapeHtml(candidate.champion)}</span>
        </article>
      </div>

      <div class="analysis-chip-list">
        <span class="analysis-chip ${impact.verdict === 'Empeora' ? 'analysis-chip--danger' : ''}">${escapeHtml(impact.verdict)}</span>
        <span class="analysis-chip">Score ${impact.score > 0 ? '+' : ''}${impact.score}</span>
        <span class="analysis-chip">Gana: ${escapeHtml(impact.gain)}</span>
        <span class="analysis-chip">Pierde: ${escapeHtml(impact.loss)}</span>
      </div>

      <p class="analysis-note">${escapeHtml(impact.reason)}</p>
      ${renderMetricsDelta(diff.metrics || [])}
      ${renderPills(diff.changedFields || [], 'Sin cambios claros')}
    </article>
  `;
}

function collectCandidatePools(selectedChampions) {
  const usedNames = new Set(selectedChampions.map((champion) => normalizeText(champion.champion)));
  return selectedChampions.map((selectedChampion) => {
    const role = selectedChampion.role;
    const rows = state.data.get(role) || [];
    const currentChampion = selectedChampion.champion;
    const pool = rows
      .filter((candidate) => {
        const normalized = normalizeText(candidate.champion);
        return normalized !== normalizeText(currentChampion) && !usedNames.has(normalized);
      })
      .sort((a, b) => String(a.champion || '').localeCompare(String(b.champion || ''), 'es'));

    return { role, currentChampion, pool };
  });
}

function buildRecommendations(selectedChampions) {
  const candidatePools = collectCandidatePools(selectedChampions);
  const recommendations = [];

  candidatePools.forEach(({ role, currentChampion, pool }) => {
    const scoredCandidates = pool
      .map((candidate) => {
        const simulation = simulateChampionSwap(selectedChampions, role, candidate);
        return {
          role,
          current: selectedChampions.find((champion) => champion.role === role) || null,
          candidate: normalizeCandidate(candidate, role),
          beforeChampion: currentChampion,
          afterChampion: candidate.champion,
          beforeAnalysis: simulation.beforeAnalysis,
          afterAnalysis: simulation.afterAnalysis,
          diff: simulation.diff,
          impact: simulation.diff?.impact || { score: -999, verdict: 'Neutro', gain: 'Sin mejora clara', loss: 'Sin pérdida clara', reason: 'Sin datos' },
        };
      })
      .sort((a, b) => {
        const scoreDiff = (b.impact.score || 0) - (a.impact.score || 0);
        if (scoreDiff !== 0) return scoreDiff;
        const confidenceDiff = (Number(b.afterAnalysis?.confidence) || 0) - (Number(a.afterAnalysis?.confidence) || 0);
        if (confidenceDiff !== 0) return confidenceDiff;
        return String(a.afterChampion).localeCompare(String(b.afterChampion), 'es');
      });

    if (scoredCandidates[0]) {
      recommendations.push(scoredCandidates[0]);
    }
  });

  return recommendations
    .sort((a, b) => {
      const scoreDiff = (b.impact.score || 0) - (a.impact.score || 0);
      if (scoreDiff !== 0) return scoreDiff;
      return (Number(b.afterAnalysis?.confidence) || 0) - (Number(a.afterAnalysis?.confidence) || 0);
    })
    .slice(0, 4);
}

function renderOptimizer() {
  const root = document.getElementById('compositionOptimizer');
  if (!root) return;

  const selectedChampions = collectSelectedChampions();
  if (!selectedChampions.length) {
    root.innerHTML = `
      <section class="analysis-card analysis-card--wide composition-optimizer">
        <div class="analysis-card__header">
          <p class="eyebrow">Composition Optimizer</p>
          <h4>Optimización preparada</h4>
        </div>
        <p class="analysis-note">Selecciona campeones para evaluar swaps internos y ver qué cambios mejoran más tu composición.</p>
      </section>
    `;
    return;
  }

  const analysis = analyzeComposition(selectedChampions);
  const score = compositionScore(analysis);
  const recommendations = buildRecommendations(selectedChampions);

  root.innerHTML = `
    <section class="composition-optimizer">
      ${renderHero(analysis, score)}
      ${renderHeroSummary(analysis, score, recommendations)}

      <div class="analysis-grid-v3">
        <article class="analysis-card analysis-card--wide">
          <div class="analysis-card__header">
            <p class="eyebrow">Prioridad de mejora</p>
            <h4>Top swaps internos</h4>
          </div>
          ${recommendations.length
            ? `<div class="analysis-item-grid">${recommendations.map((recommendation, index) => renderRecommendationCard(recommendation, index)).join('')}</div>`
            : '<p class="analysis-empty">No hay swaps recomendables.</p>'}
        </article>

        <article class="analysis-card">
          <div class="analysis-card__header">
            <p class="eyebrow">Fortalezas</p>
            <h4>Qué sigue aportando valor</h4>
          </div>
          ${renderPills(analysis.strengths, 'Sin fortalezas claras.')}
        </article>

        <article class="analysis-card analysis-card--bad">
          <div class="analysis-card__header">
            <p class="eyebrow">Riesgos</p>
            <h4>Qué se rompe al forzar cambios</h4>
          </div>
          ${renderPills(analysis.weaknesses, 'Sin riesgos claros.')}
        </article>

        <article class="analysis-card analysis-card--wide">
          <div class="analysis-card__header">
            <p class="eyebrow">Métricas de la composición</p>
            <h4>Perfil de la composición actual</h4>
          </div>
          ${renderMetricList(analysis.metrics)}
        </article>
      </div>
    </section>
  `;
}

function observeComposition() {
  const node = document.getElementById('compositionGrid');
  if (!node) {
    window.requestAnimationFrame(observeComposition);
    return;
  }

  const observer = new MutationObserver(schedulePatch);
  observer.observe(node, { childList: true, subtree: true, characterData: true });
}

function schedulePatch() {
  if (state.patchScheduled) return;
  state.patchScheduled = true;
  window.requestAnimationFrame(() => {
    state.patchScheduled = false;
    renderOptimizer();
  });
}

async function init() {
  await loadRoleData();
  schedulePatch();
  observeComposition();
  window.setInterval(schedulePatch, 1500);
}

export { renderOptimizer as buildCompositionOptimizer };
