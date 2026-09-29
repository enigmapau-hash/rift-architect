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
  return Number.isFinite(Number(value.score)) ? Number(value.score) : null;
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
          return `<li><span>${label}</span>${score !== null ? `<span class="analysis-list__score">${score}</span>` : ''}</li>`;
        })
        .join('')}
    </ul>
  `;
}

function renderTempo(tempo) {
  const value = typeof tempo === 'object' ? tempo.label : tempo;
  const confidence = typeof tempo === 'object' ? tempo.confidence : null;
  const phases = typeof tempo === 'object' && Array.isArray(tempo.phases) ? tempo.phases : [];

  return `
    <div class="analysis-tempo">
      <span class="analysis-tempo__label">Tempo</span>
      <span class="analysis-tempo__badge">${escapeHtml(value && String(value).trim() ? value : 'Sin definir')}</span>
      ${confidence !== null ? `<span class="analysis-chip">Confianza ${confidence}%</span>` : ''}
      ${phases.length ? `<div class="analysis-chip-list">${phases.map((phase) => `<span class="analysis-chip">${escapeHtml(phase)}</span>`).join('')}</div>` : ''}
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
  const primaryIdentity = analysis.primaryIdentity || 'Sin definir';
  const secondaryIdentities = (analysis.secondaryIdentities || []).slice(0, 2);
  const strengths = (analysis.strengths || []).slice(0, 4);
  const weaknesses = (analysis.weaknesses || []).slice(0, 3);
  const gamePlan = (analysis.gamePlan || []).slice(0, 3);
  const tempo = analysis.tempoDetail || analysis.tempo || 'Sin definir';
  const confidence = Number.isFinite(Number(analysis.confidence)) ? Math.round(Number(analysis.confidence)) : null;

  summary.innerHTML = `
    <div class="analysis-engine">
      <section class="analysis-block analysis-block--hero">
        <p class="eyebrow">Identidad</p>
        <h3>${escapeHtml(primaryIdentity)}</h3>
        <p>${escapeHtml(analysis.summaryText || 'Resumen compacto basado en el Excel.')}</p>
        <div class="analysis-chip-list">
          ${analysis.dominance ? `<span class="analysis-chip">${escapeHtml(analysis.dominance === 'dominant' ? 'Dominante' : analysis.dominance === 'hybrid' ? 'Híbrida' : 'Flexible')}</span>` : ''}
          ${confidence !== null ? `<span class="analysis-chip">Confianza ${confidence}%</span>` : ''}
        </div>
      </section>

      <div class="analysis-grid">
        <section class="analysis-block">
          <p class="eyebrow">Secundarias</p>
          <div class="analysis-chip-list">
            ${secondaryIdentities.length
              ? secondaryIdentities.map((identity) => `<span class="analysis-chip">${escapeHtml(identity)}</span>`).join('')
              : '<span class="analysis-empty">Sin secundarias claras</span>'}
          </div>
        </section>

        <section class="analysis-block analysis-block--tempo">
          <p class="eyebrow">Tempo</p>
          ${renderTempo(tempo)}
        </section>

        <section class="analysis-block">
          <p class="eyebrow">🟢 Hace bien</p>
          ${renderList(strengths, 'analysis-list--good')}
        </section>

        <section class="analysis-block">
          <p class="eyebrow">🔴 Le falta</p>
          ${renderList(weaknesses, 'analysis-list--bad')}
        </section>

        <section class="analysis-block analysis-block--hero analysis-block--plan">
          <p class="eyebrow">Plan</p>
          ${renderList(gamePlan, 'analysis-list--plan')}
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
