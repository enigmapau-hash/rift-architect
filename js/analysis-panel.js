import { analyzeComposition } from './analyzer.js';

const DATA_MANIFEST_URL = './data/index.json';
const ROLE_FILES = [
  { key: 'top', file: './data/top.json' },
  { key: 'jungle', file: './data/jungle.json' },
  { key: 'mid', file: './data/mid.json' },
  { key: 'botline', file: './data/bot.json' },
  { key: 'support', file: './data/support.json' },
];

const roleData = new Map();
let dataLoaded = false;
let patchScheduled = false;

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
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
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

function stars(score = 0) {
  const numeric = Math.max(0, Math.min(5, Number(score) || 0));
  return '★★★★★'.slice(0, numeric) + '☆☆☆☆☆'.slice(0, 5 - numeric);
}

function percent(score, max = 10) {
  const numeric = Number.isFinite(Number(score)) ? Number(score) : 0;
  return Math.max(0, Math.min(100, Math.round((numeric / max) * 100)));
}

function formatSigned(value) {
  const rounded = Math.round(Number(value) || 0);
  return `${rounded > 0 ? '+' : ''}${rounded}`;
}

function normalizeEntry(item) {
  const label = asText(item?.label ?? item?.name ?? item?.title ?? item?.text ?? item?.value ?? item?.champion ?? item, 'Sin definir');
  const detail = asText(item?.detail ?? item?.summary ?? item?.description ?? item?.reason ?? item?.note ?? item?.explanation ?? item?.message ?? '', '');
  const champions = asArray(item?.champions).map((entry) => asText(entry)).filter(Boolean);
  const missing = asArray(item?.missing).map((entry) => asText(entry)).filter(Boolean);
  const score = Number.isFinite(Number(item?.score)) ? Math.round(Number(item.score)) : null;
  return { label, detail, champions, missing, score };
}

function renderPills(items = [], emptyText = 'Sin datos') {
  const chips = uniqueValues(items.map((item) => asText(item)).filter((item) => item && item !== 'Sin definir'));
  return chips.length
    ? `<div class="analysis-chip-list">${chips.map((chip) => `<span class="analysis-chip">${escapeHtml(chip)}</span>`).join('')}</div>`
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

function renderItemCard(item, variant = 'neutral') {
  const normalized = normalizeEntry(item);
  const scoreMarkup = normalized.score !== null
    ? `<span class="analysis-item-card__score">${stars(normalized.score)}</span>`
    : '';
  const subtitle = normalized.detail
    ? `<p class="analysis-item-card__detail">${escapeHtml(normalized.detail)}</p>`
    : '';
  const championMarkup = normalized.champions.length
    ? `<div class="analysis-chip-list analysis-chip-list--compact">${normalized.champions.map((champion) => `<span class="analysis-chip">${escapeHtml(champion)}</span>`).join('')}</div>`
    : '';
  const missingMarkup = normalized.missing.length
    ? `<div class="analysis-chip-list analysis-chip-list--compact">${normalized.missing.map((missing) => `<span class="analysis-chip analysis-chip--danger">Falta: ${escapeHtml(missing)}</span>`).join('')}</div>`
    : '';
  return `
    <article class="analysis-item-card analysis-item-card--${variant}">
      <div class="analysis-item-card__head">
        <strong>${escapeHtml(normalized.label)}</strong>
        ${scoreMarkup}
      </div>
      ${subtitle}
      ${championMarkup}
      ${missingMarkup}
    </article>
  `;
}

function renderItemGrid(title, items = [], variant = 'neutral', emptyText = 'Sin datos claros.') {
  const safeItems = asArray(items).slice(0, 4);
  return `
    <article class="analysis-card analysis-card--${variant}">
      <div class="analysis-card__header">
        <p class="eyebrow">${escapeHtml(title)}</p>
        <h4>${escapeHtml(title)}</h4>
      </div>
      ${
        safeItems.length
          ? `<div class="analysis-item-grid">${safeItems.map((item) => renderItemCard(item, variant)).join('')}</div>`
          : `<p class="analysis-empty">${escapeHtml(emptyText)}</p>`
      }
    </article>
  `;
}

function renderMetricRow(metrics = []) {
  const safeMetrics = asArray(metrics).slice(0, 6);
  if (!safeMetrics.length) {
    return '<p class="analysis-empty">Sin métricas disponibles.</p>';
  }

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

function renderPlanList(plan = []) {
  const steps = asArray(plan).map((step) => asText(step)).filter(Boolean).slice(0, 3);
  if (!steps.length) return '<p class="analysis-empty">Sin plan claro.</p>';

  return `
    <ol class="analysis-step-list">
      ${steps
        .map(
          (step, index) => `
            <li class="analysis-step">
              <span class="analysis-step__index">${index + 1}</span>
              <span class="analysis-step__text">${escapeHtml(step)}</span>
            </li>
          `
        )
        .join('')}
    </ol>
  `;
}

async function loadRoleData() {
  if (dataLoaded) return;
  dataLoaded = true;

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

    loaded.forEach(([key, rows]) => roleData.set(key, Array.isArray(rows) ? rows : []));
  } catch {
    ROLE_FILES.forEach(({ key }) => roleData.set(key, []));
  }
}

function findChampion(roleKey, championName) {
  const normalizedName = String(championName || '').trim().toLowerCase();
  const rows = roleData.get(roleKey) || [];
  return rows.find((item) => String(item?.champion || '').trim().toLowerCase() === normalizedName) || null;
}

function collectSelectedChampions() {
  return [...document.querySelectorAll('#compositionGrid .slot.is-filled')]
    .map((slot) => {
      const role = String(slot.dataset.role || 'top');
      const name = slot.querySelector('.slot__name')?.textContent?.trim() || '';
      const champion = findChampion(role, name);
      if (!champion) return null;

      return {
        role,
        champion: champion.champion,
        identity: champion.identity,
        function: champion.function,
        tempo: champion.tempo,
        strengths: champion.strengths || [],
        weaknesses: champion.weaknesses || [],
      };
    })
    .filter(Boolean);
}

function renderHero(analysis) {
  const primaryIdentity = analysis.primaryIdentity || 'Sin definir';
  const summaryText = analysis.summaryText || 'Resumen compacto basado en el Excel.';
  const confidence = Number.isFinite(Number(analysis.confidence)) ? Math.round(Number(analysis.confidence)) : null;
  const dominanceLabel =
    analysis.dominance === 'dominant'
      ? 'Dominante'
      : analysis.dominance === 'hybrid'
        ? 'Híbrida'
        : analysis.dominance === 'flexible'
          ? 'Flexible'
          : 'Sin definir';
  const winConditionLabel = analysis.winCondition?.label || 'Sin definir';
  const tempoLabel = analysis.tempoDetail?.label || analysis.tempo || 'Sin definir';
  const coherenceLabel = analysis.coherence?.label || 'Sin definir';
  const secondaryIdentities = asArray(analysis.secondaryIdentities).slice(0, 3);
  const tempoPhases = asArray(analysis.tempoDetail?.phases);
  const damageSplit = analysis.damageSplit || {};
  const damageChips = [
    `AD ${Number(damageSplit.ad || 0)}`,
    `AP ${Number(damageSplit.ap || 0)}`,
    `Híbrido ${Number(damageSplit.hybrid || 0)}`,
  ];

  return `
    <section class="analysis-hero">
      <div class="analysis-hero__main">
        <p class="eyebrow">Identidad</p>
        <h3>${escapeHtml(primaryIdentity)}</h3>
        <p class="analysis-hero__summary">${escapeHtml(summaryText)}</p>
        <div class="analysis-chip-list">
          ${dominanceLabel ? `<span class="analysis-chip">Dominio: ${escapeHtml(dominanceLabel)}</span>` : ''}
          ${confidence !== null ? `<span class="analysis-chip">Confianza ${confidence}%</span>` : ''}
          ${coherenceLabel ? `<span class="analysis-chip">Coherencia: ${escapeHtml(coherenceLabel)}</span>` : ''}
          ${winConditionLabel ? `<span class="analysis-chip">Victoria: ${escapeHtml(winConditionLabel)}</span>` : ''}
          ${tempoLabel ? `<span class="analysis-chip">Tempo: ${escapeHtml(tempoLabel)}</span>` : ''}
        </div>

        <div class="analysis-meta-strip">
          <div class="analysis-meta-strip__group">
            <span class="analysis-meta-strip__label">Secundarias</span>
            ${renderPills(secondaryIdentities, 'Sin identidades secundarias')}
          </div>

          <div class="analysis-meta-strip__group">
            <span class="analysis-meta-strip__label">Ventana</span>
            ${renderPills(tempoPhases.length ? tempoPhases : [tempoLabel], 'Sin tempo')}
          </div>

          <div class="analysis-meta-strip__group">
            <span class="analysis-meta-strip__label">Daño</span>
            ${renderPills(damageChips, 'Sin reparto')}
          </div>
        </div>
      </div>

      <aside class="analysis-hero__aside">
        ${renderMiniStat('Confianza', confidence !== null ? `${confidence}%` : 'Sin definir', 'Solidez del análisis')}
        ${renderMiniStat('Coherencia', coherenceLabel, 'Alineación del plan')}
        ${renderMiniStat('Tempo', tempoLabel, 'Ritmo natural')}
        ${renderMiniStat('Victoria', winConditionLabel, 'Cómo se gana')}
      </aside>
    </section>
  `;
}

function renderCoachCard(coach = {}) {
  const phases = asArray(coach.phases).slice(0, 3);
  const priorities = asArray(coach.priorities).slice(0, 3);
  const powerSpikes = asArray(coach.powerSpikes).slice(0, 3);
  const insights = asArray(coach.insights).slice(0, 3);
  const alerts = asArray(coach.alerts).slice(0, 3);

  return `
    <article class="analysis-card analysis-card--wide">
      <div class="analysis-card__header">
        <p class="eyebrow">Coach</p>
        <h4>${escapeHtml(coach.headline || 'Guía de ejecución')}</h4>
      </div>

      ${phases.length ? `<div class="analysis-phase-grid">${phases.map((phase) => renderPhaseCard(phase)).join('')}</div>` : '<p class="analysis-empty">Sin fases definidas.</p>'}

      <div class="analysis-subgrid">
        <section class="analysis-subcard">
          <p class="eyebrow">Prioridades</p>
          ${priorities.length ? `<div class="analysis-item-grid">${priorities.map((item) => renderItemCard(item, 'good')).join('')}</div>` : '<p class="analysis-empty">Sin prioridades.</p>'}
        </section>
        <section class="analysis-subcard">
          <p class="eyebrow">Picos de poder</p>
          ${powerSpikes.length ? `<div class="analysis-item-grid">${powerSpikes.map((item) => renderItemCard(item, 'neutral')).join('')}</div>` : '<p class="analysis-empty">Sin picos.</p>'}
        </section>
      </div>

      <div class="analysis-subgrid">
        <section class="analysis-subcard">
          <p class="eyebrow">Insights</p>
          ${insights.length ? `<div class="analysis-item-grid">${insights.map((item) => renderItemCard(item, 'good')).join('')}</div>` : '<p class="analysis-empty">Sin insights.</p>'}
        </section>
        <section class="analysis-subcard">
          <p class="eyebrow">Alertas</p>
          ${alerts.length ? `<div class="analysis-item-grid">${alerts.map((item) => renderItemCard(item, 'bad')).join('')}</div>` : '<p class="analysis-empty">Sin alertas.</p>'}
        </section>
      </div>
    </article>
  `;
}

function renderPhaseCard(phase) {
  const normalized = normalizeEntry(phase);
  const actions = asArray(phase?.actions).map((item) => asText(item)).filter(Boolean);

  return `
    <article class="analysis-phase">
      <div class="analysis-item-card__head">
        <strong>${escapeHtml(normalized.label)}</strong>
      </div>
      ${normalized.detail ? `<p class="analysis-item-card__detail">${escapeHtml(normalized.detail)}</p>` : ''}
      ${actions.length ? `<div class="analysis-chip-list analysis-chip-list--compact">${actions.map((action) => `<span class="analysis-chip">${escapeHtml(action)}</span>`).join('')}</div>` : ''}
    </article>
  `;
}

function renderAdvisorCard(advisor = {}) {
  const priorities = asArray(advisor.objectivePriority).slice(0, 3);
  const windows = advisor.gameWindows || {};
  const windowEntries = ['early', 'mid', 'late']
    .map((key) => windows[key])
    .filter(Boolean)
    .slice(0, 3);
  const loseConditions = asArray(advisor.loseConditions).slice(0, 3);

  return `
    <article class="analysis-card analysis-card--accent">
      <div class="analysis-card__header">
        <p class="eyebrow">Strategic Advisor</p>
        <h4>${escapeHtml(advisor.primaryObjective || advisor.summary?.priority || 'Jugar alrededor de la identidad')}</h4>
      </div>

      <div class="analysis-subgrid">
        <section class="analysis-subcard">
          <p class="eyebrow">Prioridades</p>
          ${priorities.length ? `<div class="analysis-item-grid">${priorities.map((item) => renderItemCard(item, 'good')).join('')}</div>` : '<p class="analysis-empty">Sin prioridades.</p>'}
        </section>
        <section class="analysis-subcard">
          <p class="eyebrow">Ventanas</p>
          ${windowEntries.length ? `<div class="analysis-item-grid">${windowEntries.map((item) => renderItemCard(item, 'neutral')).join('')}</div>` : '<p class="analysis-empty">Sin ventanas.</p>'}
        </section>
      </div>

      <section class="analysis-subcard">
        <p class="eyebrow">Pierdes si...</p>
        ${loseConditions.length ? `<div class="analysis-item-grid">${loseConditions.map((item) => renderItemCard(item, 'bad')).join('')}</div>` : '<p class="analysis-empty">Sin riesgos claros.</p>'}
      </section>
    </article>
  `;
}

function renderExplainabilityCard(explanation = {}) {
  const sections = asArray(explanation.summary).slice(0, 3);
  const identity = explanation.identity;
  const tempo = explanation.tempo;
  const win = explanation.winCondition;
  const coherence = explanation.coherence;

  return `
    <article class="analysis-card analysis-card--wide">
      <div class="analysis-card__header">
        <p class="eyebrow">Por qué</p>
        <h4>Señales que explican la lectura</h4>
      </div>

      ${sections.length ? `<div class="analysis-item-grid">${sections.map((item) => renderItemCard(item, 'neutral')).join('')}</div>` : '<p class="analysis-empty">Sin explicación disponible.</p>'}

      <div class="analysis-subgrid">
        <section class="analysis-subcard">
          <p class="eyebrow">Identidad</p>
          ${identity ? renderItemCard(identity, 'neutral') : '<p class="analysis-empty">Sin detalle.</p>'}
        </section>
        <section class="analysis-subcard">
          <p class="eyebrow">Tempo</p>
          ${tempo ? renderItemCard(tempo, 'neutral') : '<p class="analysis-empty">Sin detalle.</p>'}
        </section>
      </div>

      <div class="analysis-subgrid">
        <section class="analysis-subcard">
          <p class="eyebrow">Victoria</p>
          ${win ? renderItemCard(win, 'good') : '<p class="analysis-empty">Sin detalle.</p>'}
        </section>
        <section class="analysis-subcard">
          <p class="eyebrow">Coherencia</p>
          ${coherence ? renderItemCard(coherence, 'neutral') : '<p class="analysis-empty">Sin detalle.</p>'}
        </section>
      </div>
    </article>
  `;
}

function renderMetricsCard(analysis = {}) {
  const metrics = asArray(analysis.metrics);
  const damageSplit = analysis.damageSplit || {};
  const damageChips = [
    `AD ${Number(damageSplit.ad || 0)}`,
    `AP ${Number(damageSplit.ap || 0)}`,
    `Híbrido ${Number(damageSplit.hybrid || 0)}`,
  ];

  return `
    <article class="analysis-card analysis-card--wide">
      <div class="analysis-card__header">
        <p class="eyebrow">Perfil de la composición</p>
        <h4>Métricas y reparto de daño</h4>
      </div>
      ${renderMetricRow(metrics)}
      <div class="analysis-chip-list analysis-chip-list--compact analysis-chip-list--spaced">
        ${damageChips.map((chip) => `<span class="analysis-chip">${escapeHtml(chip)}</span>`).join('')}
      </div>
    </article>
  `;
}

function renderPlanCard(analysis = {}) {
  const plan = asArray(analysis.gamePlan);
  const winConditionDetail = analysis.winCondition?.detail || analysis.summaryText || 'Plan compacto de la composición.';

  return `
    <article class="analysis-card">
      <div class="analysis-card__header">
        <p class="eyebrow">Plan</p>
        <h4>${escapeHtml(analysis.assistant?.headline || analysis.winCondition?.label || 'Jugar alrededor de la identidad')}</h4>
      </div>
      ${renderPlanList(plan)}
      <p class="analysis-summary-note">${escapeHtml(winConditionDetail)}</p>
    </article>
  `;
}

function renderDashboard(analysis) {
  const coach = analysis.coach || analysis.assistant || {};
  const advisor = analysis.advisor || analysis.assistant || {};
  const explanation = analysis.explanation || {};

  return `
    <div class="analysis-dashboard">
      ${renderHero(analysis)}
      <div class="analysis-grid-v3">
        ${renderItemGrid('Fortalezas', analysis.strengths || [], 'good', 'Sin fortalezas claras.')}
        ${renderItemGrid('Riesgos', analysis.weaknesses || [], 'bad', 'Sin riesgos claros.')}
        ${renderMetricsCard(analysis)}
        ${renderPlanCard(analysis)}
        ${renderCoachCard(coach)}
        ${renderAdvisorCard(advisor)}
        ${renderExplainabilityCard(explanation)}
      </div>
    </div>
  `;
}

function renderAnalysisSummary() {
  const summary = document.getElementById('analysisSummary');
  if (!summary) return;

  const selectedChampions = collectSelectedChampions();
  if (!selectedChampions.length) {
    summary.innerHTML = '<p class="analysis-note">Selecciona campeones para ver un resumen compacto.</p>';
    return;
  }

  const analysis = analyzeComposition(selectedChampions);
  summary.innerHTML = renderDashboard(analysis);
}

function schedulePatch() {
  if (patchScheduled) return;
  patchScheduled = true;
  window.requestAnimationFrame(() => {
    patchScheduled = false;
    renderAnalysisSummary();
  });
}

function observeNode(id) {
  const node = document.getElementById(id);
  if (!node) {
    window.requestAnimationFrame(() => observeNode(id));
    return;
  }

  const observer = new MutationObserver(schedulePatch);
  observer.observe(node, { childList: true, subtree: true, characterData: true });
}

async function init() {
  await loadRoleData();
  schedulePatch();
  observeNode('compositionGrid');
  window.setInterval(schedulePatch, 1000);
}

init().catch(() => {});
