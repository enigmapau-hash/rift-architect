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
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function toLabel(value) {
  if (!value) return 'Sin definir';
  if (typeof value === 'string') return value;
  return value.label || value.name || value.title || 'Sin definir';
}

function toScore(value) {
  if (!value || typeof value === 'string') return null;
  return Number.isFinite(Number(value.score)) ? Math.round(Number(value.score)) : null;
}

function uniqueValues(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function stars(score = 0) {
  const numeric = Math.max(0, Math.min(5, Number(score) || 0));
  return '★★★★★'.slice(0, numeric) + '☆☆☆☆☆'.slice(0, 5 - numeric);
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

function renderList(items, className) {
  if (!items.length) {
    return '<p class="analysis-empty">Sin datos claros.</p>';
  }

  return `
    <ul class="analysis-list ${className}">
      ${items
        .map((item) => {
          const label = escapeHtml(toLabel(item));
          const score = toScore(item);
          const detail = typeof item === 'object' ? escapeHtml(item.detail || item.summary || item.description || item.reason || '') : '';
          const champions = typeof item === 'object' && Array.isArray(item.champions) && item.champions.length
            ? escapeHtml(item.champions.join(' · '))
            : '';
          const missing = typeof item === 'object' && Array.isArray(item.missing) && item.missing.length
            ? escapeHtml(`Falta: ${item.missing.join(' · ')}`)
            : '';

          return `
            <li>
              <div>
                <span>${label}</span>
                ${detail ? `<small>${detail}</small>` : ''}
                ${champions ? `<small>${champions}</small>` : ''}
                ${missing ? `<small>${missing}</small>` : ''}
              </div>
              ${score !== null ? `<span class="analysis-list__score">${score}</span>` : ''}
            </li>
          `;
        })
        .join('')}
    </ul>
  `;
}

function renderPriorityList(items = []) {
  if (!items.length) return '<p class="analysis-empty">Sin prioridades claras.</p>';

  return `
    <ul class="analysis-list analysis-list--neutral">
      ${items
        .map(
          (item) => `
            <li>
              <div>
                <span>${escapeHtml(item.label)}</span>
                ${item.detail ? `<small>${escapeHtml(item.detail)}</small>` : ''}
              </div>
              <span class="analysis-chip">${escapeHtml(stars(item.score))}</span>
            </li>
          `
        )
        .join('')}
    </ul>
  `;
}

function renderCoachPhase(phase) {
  if (!phase) return '';

  const actions = Array.isArray(phase.actions) ? phase.actions.filter(Boolean) : [];
  return `
    <article class="analysis-block" style="padding: 12px 14px;">
      <p class="eyebrow">${escapeHtml(phase.label)}</p>
      <p class="analysis-note">${escapeHtml(phase.detail || 'Sin detalle disponible.')}</p>
      ${actions.length ? `<div class="analysis-chip-list">${actions.map((action) => `<span class="analysis-chip">${escapeHtml(action)}</span>`).join('')}</div>` : ''}
    </article>
  `;
}

function renderSummaryBlock(advisor = {}, analysis = {}) {
  const summary = advisor.summary || {};
  const chips = uniqueValues([
    summary.identity ? `Identidad: ${summary.identity}` : null,
    summary.priority ? `Prioridad: ${summary.priority}` : null,
    summary.risk ? `Riesgo: ${summary.risk}` : null,
    summary.powerSpike ? `Power spike: ${summary.powerSpike}` : null,
    analysis.tempoDetail?.label ? `Tempo: ${analysis.tempoDetail.label}` : null,
  ]);

  return `
    <section class="analysis-block analysis-block--hero">
      <p class="eyebrow">Resumen 15s</p>
      <div class="analysis-chip-list">
        ${chips.length
          ? chips.map((chip) => `<span class="analysis-chip">${escapeHtml(chip)}</span>`).join('')
          : '<span class="analysis-empty">Sin resumen claro</span>'}
      </div>
      <p class="analysis-note">${escapeHtml(summary.reason || analysis.summaryText || 'Resumen compacto del draft.')}</p>
    </section>
  `;
}

function renderWindows(windows = {}) {
  const entries = ['early', 'mid', 'late']
    .map((key) => windows[key])
    .filter(Boolean)
    .map((window) => `${window.label}: ${stars(window.score)}`);

  return entries.length ? `<div class="analysis-chip-list">${entries.map((item) => `<span class="analysis-chip">${escapeHtml(item)}</span>`).join('')}</div>` : '<p class="analysis-empty">Sin ventanas claras.</p>';
}

function renderAdvisorBlock(advisor = {}) {
  const objectivePriority = Array.isArray(advisor.objectivePriority) ? advisor.objectivePriority.slice(0, 3) : [];
  const loseConditions = Array.isArray(advisor.loseConditions) ? advisor.loseConditions.slice(0, 3) : [];
  const summary = advisor.summary || {};

  return `
    <section class="analysis-block analysis-block--hero">
      <p class="eyebrow">Strategic Advisor</p>
      <h3>${escapeHtml(advisor.primaryObjective || summary.priority || 'Jugar alrededor de la identidad')}</h3>
      <p class="analysis-note">${escapeHtml(summary.reason || 'Prioridad estratégica derivada del análisis.')}</p>
      ${objectivePriority.length ? renderPriorityList(objectivePriority) : '<p class="analysis-empty">Sin prioridades claras.</p>'}
      <div style="margin-top: 10px;">${renderWindows(advisor.gameWindows)}</div>
      ${loseConditions.length ? `<p class="eyebrow" style="margin-top: 12px;">Pierdes si...</p>${renderList(loseConditions, 'analysis-list--bad')}` : ''}
    </section>
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
  const advisor = analysis.advisor || analysis.assistant || analysis.coach || {};
  const explanationSummary = Array.isArray(analysis.explanation?.summary) ? analysis.explanation.summary.slice(0, 3) : [];
  const insights = Array.isArray(analysis.assistant?.insights) ? analysis.assistant.insights.slice(0, 3) : [];
  const alerts = Array.isArray(analysis.assistant?.alerts) ? analysis.assistant.alerts.slice(0, 3) : [];
  const primaryIdentity = analysis.primaryIdentity || 'Sin definir';
  const secondaryIdentities = (analysis.secondaryIdentities || []).slice(0, 2);
  const strengths = (analysis.strengths || []).slice(0, 4);
  const confidence = Number.isFinite(Number(analysis.confidence)) ? Math.round(Number(analysis.confidence)) : null;
  const dominanceLabel = analysis.dominance === 'dominant' ? 'Dominante' : analysis.dominance === 'hybrid' ? 'Híbrida' : analysis.dominance === 'flexible' ? 'Flexible' : null;
  const tempoLabel = analysis.tempoDetail?.label || analysis.tempo || 'Sin definir';
  const winConditionLabel = analysis.winCondition?.label || 'Sin definir';
  const coherenceLabel = analysis.coherence?.label || 'Sin definir';

  summary.innerHTML = `
    <div class="analysis-engine">
      <section class="analysis-block analysis-block--hero">
        <p class="eyebrow">Identidad</p>
        <h3>${escapeHtml(primaryIdentity)}</h3>
        <p>${escapeHtml(analysis.summaryText || 'Resumen compacto basado en el Excel.')}</p>
        <div class="analysis-chip-list">
          ${dominanceLabel ? `<span class="analysis-chip">${escapeHtml(dominanceLabel)}</span>` : ''}
          ${confidence !== null ? `<span class="analysis-chip">Confianza ${confidence}%</span>` : ''}
          ${coherenceLabel ? `<span class="analysis-chip">${escapeHtml(coherenceLabel)}</span>` : ''}
          ${winConditionLabel ? `<span class="analysis-chip">Victoria: ${escapeHtml(winConditionLabel)}</span>` : ''}
          ${tempoLabel ? `<span class="analysis-chip">Tempo: ${escapeHtml(tempoLabel)}</span>` : ''}
          ${secondaryIdentities.length ? secondaryIdentities.map((identity) => `<span class="analysis-chip">${escapeHtml(identity)}</span>`).join('') : ''}
        </div>
      </section>

      ${renderSummaryBlock(advisor, analysis)}
      ${renderAdvisorBlock(advisor)}

      <div class="analysis-grid">
        <section class="analysis-block">
          <p class="eyebrow">Insights</p>
          ${renderList(insights, 'analysis-list--good')}
        </section>

        <section class="analysis-block">
          <p class="eyebrow">Alertas</p>
          ${renderList(alerts, 'analysis-list--bad')}
        </section>

        <section class="analysis-block">
          <p class="eyebrow">Fortalezas</p>
          ${renderList(strengths, 'analysis-list--good')}
        </section>

        <section class="analysis-block analysis-block--hero">
          <p class="eyebrow">Plan</p>
          <h3>${escapeHtml(analysis.assistant?.headline || analysis.winCondition?.label || 'Jugar alrededor de la identidad')}</h3>
          <div class="analysis-grid" style="grid-template-columns: 1fr; gap: 12px;">
            <article class="analysis-block" style="padding: 12px 14px;">
              <p class="eyebrow">Prioridades</p>
              ${renderPriorityList(analysis.assistant?.objectivePriority || [])}
            </article>
            <article class="analysis-block" style="padding: 12px 14px;">
              <p class="eyebrow">Power spikes</p>
              <div class="analysis-chip-list">
                ${(analysis.advisor?.gameWindows ? Object.values(analysis.advisor.gameWindows) : []).length
                  ? Object.values(analysis.advisor.gameWindows).map((spike) => `<span class="analysis-chip">${escapeHtml(`${spike.label}: ${stars(spike.score)}`)}</span>`).join('')
                  : '<span class="analysis-empty">Sin picos claros.</span>'}
              </div>
            </article>
            ${renderCoachPhase((analysis.assistant?.phases || [])[0])}
            ${renderCoachPhase((analysis.assistant?.phases || [])[1])}
            ${renderCoachPhase((analysis.assistant?.phases || [])[2])}
          </div>
        </section>

        <section class="analysis-block">
          <p class="eyebrow">Por qué</p>
          ${explanationSummary.length ? renderList(explanationSummary, 'analysis-list--neutral') : '<p class="analysis-empty">Sin explicación disponible.</p>'}
        </section>
      </div>
    </div>
  `;
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
