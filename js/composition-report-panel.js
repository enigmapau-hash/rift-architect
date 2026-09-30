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

function normalizeEntry(item) {
  const label = asText(item?.label ?? item?.name ?? item?.title ?? item?.text ?? item?.value ?? item?.champion ?? item, 'Sin definir');
  const detail = asText(item?.detail ?? item?.summary ?? item?.description ?? item?.reason ?? item?.note ?? item?.explanation ?? item?.message ?? '', '');
  const champions = asArray(item?.champions).map((entry) => asText(entry)).filter(Boolean);
  const missing = asArray(item?.missing).map((entry) => asText(entry)).filter(Boolean);
  const score = Number.isFinite(Number(item?.score)) ? Math.round(Number(item.score)) : null;
  return { label, detail, champions, missing, score };
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

function renderMetricList(metrics = []) {
  const safeMetrics = asArray(metrics).slice(0, 8);
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

function renderTimeline(analysis) {
  const phases = asArray(analysis?.tempoDetail?.phases);
  const plan = asArray(analysis?.gamePlan);
  const steps = [
    {
      label: 'Early',
      title: asText(phases[0] || plan[0] || 'Farm y visión'),
      detail: 'Evita peleas largas hasta fijar una ventaja estable.',
    },
    {
      label: 'Mid',
      title: asText(phases[1] || plan[1] || 'Objetivos y rotaciones'),
      detail: 'Convierte prioridad y visión en dragones o control de mapa.',
    },
    {
      label: 'Late',
      title: asText(phases[2] || plan[2] || '5v5 y cierre'),
      detail: 'Protege al carry y resuelve la partida con tu win condition.',
    },
  ];

  return `
    <section class="timeline-card composition-report__timeline">
      <div class="stack stack--compact">
        <p class="eyebrow">Plan de partida</p>
        <h4>Cómo se juega la composición por fases</h4>
      </div>
      <div class="timeline">
        ${steps
          .map(
            (step, index) => `
              <article class="timeline__step">
                <span class="timeline__dot">${index + 1}</span>
                <div>
                  <span class="timeline__label">${escapeHtml(step.label)}</span>
                  <h4 class="timeline__title">${escapeHtml(step.title)}</h4>
                  <p class="timeline__detail">${escapeHtml(step.detail)}</p>
                </div>
              </article>
            `
          )
          .join('')}
      </div>
    </section>
  `;
}

function renderReportCard(title, items, variant = 'neutral', emptyText = 'Sin datos claros.') {
  const safeItems = asArray(items).slice(0, 4).map(normalizeEntry);
  return `
    <article class="analysis-card ${variant !== 'neutral' ? `analysis-card--${variant}` : ''}">
      <div class="analysis-card__header">
        <p class="eyebrow">${escapeHtml(title)}</p>
        <h4>${escapeHtml(title)}</h4>
      </div>
      ${safeItems.length ? `<div class="analysis-item-grid">${safeItems.map((item) => renderReportItem(item, variant)).join('')}</div>` : `<p class="analysis-empty">${escapeHtml(emptyText)}</p>`}
    </article>
  `;
}

function renderReportItem(item, variant = 'neutral') {
  const scoreMarkup = item.score !== null ? `<span class="analysis-item-card__score">${stars(item.score)}</span>` : '';
  const detailMarkup = item.detail ? `<p class="analysis-item-card__detail">${escapeHtml(item.detail)}</p>` : '';
  const championsMarkup = item.champions.length
    ? `<div class="analysis-chip-list analysis-chip-list--compact">${item.champions.map((champion) => `<span class="analysis-chip">${escapeHtml(champion)}</span>`).join('')}</div>`
    : '';
  const missingMarkup = item.missing.length
    ? `<div class="analysis-chip-list analysis-chip-list--compact">${item.missing.map((missing) => `<span class="analysis-chip analysis-chip--danger">Falta: ${escapeHtml(missing)}</span>`).join('')}</div>`
    : '';

  return `
    <article class="analysis-item-card analysis-item-card--${variant}">
      <div class="analysis-item-card__head">
        <strong>${escapeHtml(item.label)}</strong>
        ${scoreMarkup}
      </div>
      ${detailMarkup}
      ${championsMarkup}
      ${missingMarkup}
    </article>
  `;
}

function renderHero(analysis, score) {
  const primaryIdentity = analysis.primaryIdentity || 'Sin definir';
  const summaryText = analysis.summaryText || 'Resumen ejecutivo de la composición.';
  const confidence = Number.isFinite(Number(analysis.confidence)) ? Math.round(Number(analysis.confidence)) : 0;
  const tempoLabel = analysis.tempoDetail?.label || analysis.tempo || 'Sin definir';
  const winConditionLabel = analysis.winCondition?.label || 'Sin definir';
  const coherenceLabel = analysis.coherence?.label || 'Sin definir';
  const secondaryIdentities = asArray(analysis.secondaryIdentities).slice(0, 3);
  const damageSplit = analysis.damageSplit || {};

  return `
    <section class="composition-report__hero analysis-hero">
      <div class="analysis-hero__main">
        <p class="eyebrow">Composition Report</p>
        <h3>${escapeHtml(primaryIdentity)}</h3>
        <p class="analysis-hero__summary">${escapeHtml(summaryText)}</p>

        <div class="composition-report__scoreline">
          <span class="composition-report__score">${score.score}</span>
          <div class="composition-report__grade-block">
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
        <article class="analysis-mini-stat">
          <span class="analysis-mini-stat__label">Win condition</span>
          <strong class="analysis-mini-stat__value">${escapeHtml(winConditionLabel)}</strong>
          <span class="analysis-mini-stat__detail">Cómo cerrar la partida</span>
        </article>
        <article class="analysis-mini-stat">
          <span class="analysis-mini-stat__label">Tempo</span>
          <strong class="analysis-mini-stat__value">${escapeHtml(tempoLabel)}</strong>
          <span class="analysis-mini-stat__detail">Ventana natural de poder</span>
        </article>
        <article class="analysis-mini-stat">
          <span class="analysis-mini-stat__label">Coherencia</span>
          <strong class="analysis-mini-stat__value">${escapeHtml(coherenceLabel)}</strong>
          <span class="analysis-mini-stat__detail">Alineación interna</span>
        </article>
        <article class="analysis-mini-stat">
          <span class="analysis-mini-stat__label">Score</span>
          <strong class="analysis-mini-stat__value">${score.score}/100</strong>
          <span class="analysis-mini-stat__detail">Calidad de la composición</span>
        </article>
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

      ${phases.length ? `<div class="analysis-phase-grid">${phases.map((phase, index) => renderPhaseCard(phase, index + 1)).join('')}</div>` : '<p class="analysis-empty">Sin fases definidas.</p>'}

      <div class="analysis-subgrid">
        <section class="analysis-subcard">
          <p class="eyebrow">Prioridades</p>
          ${priorities.length ? `<div class="analysis-item-grid">${priorities.map((item) => renderReportItem(normalizeEntry(item), 'good')).join('')}</div>` : '<p class="analysis-empty">Sin prioridades.</p>'}
        </section>
        <section class="analysis-subcard">
          <p class="eyebrow">Picos de poder</p>
          ${powerSpikes.length ? `<div class="analysis-item-grid">${powerSpikes.map((item) => renderReportItem(normalizeEntry(item), 'neutral')).join('')}</div>` : '<p class="analysis-empty">Sin picos.</p>'}
        </section>
      </div>

      <div class="analysis-subgrid">
        <section class="analysis-subcard">
          <p class="eyebrow">Consejos</p>
          ${insights.length ? `<div class="analysis-item-grid">${insights.map((item) => renderReportItem(normalizeEntry(item), 'good')).join('')}</div>` : '<p class="analysis-empty">Sin consejos.</p>'}
        </section>
        <section class="analysis-subcard">
          <p class="eyebrow">Errores a evitar</p>
          ${alerts.length ? `<div class="analysis-item-grid">${alerts.map((item) => renderReportItem(normalizeEntry(item), 'bad')).join('')}</div>` : '<p class="analysis-empty">Sin alertas.</p>'}
        </section>
      </div>
    </article>
  `;
}

function renderPhaseCard(phase, index) {
  const normalized = normalizeEntry(phase);
  const actions = asArray(phase?.actions).map((item) => asText(item)).filter(Boolean);

  return `
    <article class="analysis-phase">
      <div class="analysis-item-card__head">
        <strong>${index}. ${escapeHtml(normalized.label)}</strong>
      </div>
      ${normalized.detail ? `<p class="analysis-item-card__detail">${escapeHtml(normalized.detail)}</p>` : ''}
      ${actions.length ? `<div class="analysis-chip-list analysis-chip-list--compact">${actions.map((action) => `<span class="analysis-chip">${escapeHtml(action)}</span>`).join('')}</div>` : ''}
    </article>
  `;
}

function renderAdvisorCard(advisor = {}) {
  const priorities = asArray(advisor.objectivePriority).slice(0, 3);
  const windows = advisor.gameWindows || {};
  const windowEntries = ['early', 'mid', 'late'].map((key) => windows[key]).filter(Boolean).slice(0, 3);
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
          ${priorities.length ? `<div class="analysis-item-grid">${priorities.map((item) => renderReportItem(normalizeEntry(item), 'good')).join('')}</div>` : '<p class="analysis-empty">Sin prioridades.</p>'}
        </section>
        <section class="analysis-subcard">
          <p class="eyebrow">Ventanas</p>
          ${windowEntries.length ? `<div class="analysis-item-grid">${windowEntries.map((item) => renderReportItem(normalizeEntry(item), 'neutral')).join('')}</div>` : '<p class="analysis-empty">Sin ventanas.</p>'}
        </section>
      </div>

      <section class="analysis-subcard">
        <p class="eyebrow">Pierdes si...</p>
        ${loseConditions.length ? `<div class="analysis-item-grid">${loseConditions.map((item) => renderReportItem(normalizeEntry(item), 'bad')).join('')}</div>` : '<p class="analysis-empty">Sin riesgos claros.</p>'}
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
        <p class="eyebrow">¿Por qué?</p>
        <h4>Señales que explican la lectura</h4>
      </div>

      ${sections.length ? `<div class="analysis-item-grid">${sections.map((item) => renderReportItem(normalizeEntry(item), 'neutral')).join('')}</div>` : '<p class="analysis-empty">Sin explicación disponible.</p>'}

      <div class="analysis-subgrid">
        <section class="analysis-subcard">
          <p class="eyebrow">Identidad</p>
          ${identity ? renderReportItem(normalizeEntry(identity), 'neutral') : '<p class="analysis-empty">Sin detalle.</p>'}
        </section>
        <section class="analysis-subcard">
          <p class="eyebrow">Tempo</p>
          ${tempo ? renderReportItem(normalizeEntry(tempo), 'neutral') : '<p class="analysis-empty">Sin detalle.</p>'}
        </section>
      </div>

      <div class="analysis-subgrid">
        <section class="analysis-subcard">
          <p class="eyebrow">Victoria</p>
          ${win ? renderReportItem(normalizeEntry(win), 'good') : '<p class="analysis-empty">Sin detalle.</p>'}
        </section>
        <section class="analysis-subcard">
          <p class="eyebrow">Coherencia</p>
          ${coherence ? renderReportItem(normalizeEntry(coherence), 'neutral') : '<p class="analysis-empty">Sin detalle.</p>'}
        </section>
      </div>
    </article>
  `;
}

function renderCompositionReport(analysis) {
  const score = compositionScore(analysis);
  const strengths = asArray(analysis.strengths);
  const risks = asArray(analysis.weaknesses);
  const metrics = asArray(analysis.metrics);

  return `
    <div class="composition-report">
      ${renderHero(analysis, score)}

      <div class="analysis-grid-v3">
        ${renderReportCard('Fortalezas', strengths, 'good', 'Sin fortalezas claras.')}
        ${renderReportCard('Riesgos', risks, 'bad', 'Sin riesgos claros.')}
        <article class="analysis-card analysis-card--wide composition-report__metrics">
          <div class="analysis-card__header">
            <p class="eyebrow">Métricas</p>
            <h4>Perfil funcional de la composición</h4>
          </div>
          ${renderMetricList(metrics)}
          <div class="analysis-chip-list analysis-chip-list--compact analysis-chip-list--spaced">
            <span class="analysis-chip">Engage</span>
            <span class="analysis-chip">Peel</span>
            <span class="analysis-chip">Frontline</span>
            <span class="analysis-chip">Escalado</span>
            <span class="analysis-chip">Poke</span>
            <span class="analysis-chip">Movilidad</span>
            <span class="analysis-chip">Objetivos</span>
          </div>
        </article>

        ${renderTimeline(analysis)}
        ${renderCoachCard(analysis.coach || analysis.assistant || {})}
        ${renderAdvisorCard(analysis.advisor || analysis.assistant || {})}
        ${renderExplainabilityCard(analysis.explanation || {})}
      </div>
    </div>
  `;
}

function renderSummary() {
  const root = document.getElementById('compositionReport');
  if (!root) return;

  const selectedChampions = collectSelectedChampions();
  if (!selectedChampions.length) {
    root.innerHTML = `
      <section class="analysis-block analysis-block--hero">
        <p class="eyebrow">Composition Report</p>
        <h3>Selecciona cinco campeones para generar el informe</h3>
        <p class="analysis-note">El reporte mostrará identidad, score, fortalezas, riesgos, timeline, coach, advisor y explicabilidad.</p>
      </section>
    `;
    return;
  }

  const analysis = analyzeComposition(selectedChampions);
  root.innerHTML = renderCompositionReport(analysis);
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
  if (patchScheduled) return;
  patchScheduled = true;
  window.requestAnimationFrame(() => {
    patchScheduled = false;
    renderSummary();
  });
}

async function init() {
  await loadRoleData();
  observeComposition();
  renderSummary();
  window.setInterval(renderSummary, 1500);
}

init().catch((error) => console.error(error));
