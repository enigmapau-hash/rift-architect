import { simulateChampionSwap } from './engine/simulationEngine.js';
import { normalizeText } from './engine/utils.js';

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
  activeRole: 'top',
  replacementByRole: {},
  patchScheduled: false,
};

init().catch((error) => console.error(error));

async function init() {
  await loadRoleData();
  schedulePatch();
  observeComposition();
  window.setInterval(schedulePatch, 1200);

  document.addEventListener('change', handleControlChange);
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
    renderDraftSimulator();
  });
}

function handleControlChange(event) {
  const target = event.target;
  if (!(target instanceof HTMLSelectElement)) return;
  if (!target.closest('#draftSimulator')) return;

  if (target.matches('[data-sim-role]')) {
    state.activeRole = normalizeRole(target.value);
    schedulePatch();
    return;
  }

  if (target.matches('[data-sim-replacement]')) {
    const role = normalizeRole(target.dataset.role || state.activeRole);
    state.replacementByRole[role] = target.value;
    state.activeRole = role;
    schedulePatch();
  }
}

function renderDraftSimulator() {
  const root = document.getElementById('draftSimulator');
  if (!root) return;

  const selectedChampions = collectSelectedChampions();
  if (!selectedChampions.length) {
    root.innerHTML = `
      <section class="analysis-block analysis-block--hero draft-simulator">
        <p class="eyebrow">Draft Simulator</p>
        <h3>Simulación preparada</h3>
        <p class="analysis-note">Selecciona campeones para comparar un swap y ver su impacto estratégico.</p>
      </section>
    `;
    return;
  }

  const activeRole = resolveActiveRole(selectedChampions);
  const pool = getReplacementPool(activeRole, selectedChampions);
  const replacementName = state.replacementByRole[activeRole] || pool[0]?.champion || '';
  const replacementChampion = pool.find((champion) => champion.champion === replacementName) || pool[0] || null;

  if (replacementChampion) {
    state.replacementByRole[activeRole] = replacementChampion.champion;
  }

  const simulation = replacementChampion
    ? simulateChampionSwap(selectedChampions, activeRole, replacementChampion)
    : null;

  root.innerHTML = `
    <section class="analysis-block analysis-block--hero draft-simulator">
      <p class="eyebrow">Draft Simulator</p>
      <h3>Compara el impacto de un swap antes de decidir</h3>
      <p class="analysis-note">Prueba un cambio sobre el draft actual y revisa la nueva identidad, el tempo y la condición de victoria.</p>

      <div class="draft-simulator__toolbar">
        <label class="draft-simulator__control">
          <span>Rol a cambiar</span>
          <select data-sim-role>
            ${buildRoleOptions(selectedChampions, activeRole)}
          </select>
        </label>

        <label class="draft-simulator__control">
          <span>Campeón sustituto</span>
          <select data-sim-replacement data-role="${escapeHtml(activeRole)}">
            ${buildReplacementOptions(pool, replacementChampion?.champion || '')}
          </select>
        </label>
      </div>

      ${simulation ? renderSimulationLayout(simulation) : '<p class="analysis-empty">No hay una sustitución válida para simular.</p>'}
    </section>
  `;
}

function renderSimulationLayout(simulation) {
  const before = simulation.beforeAnalysis || {};
  const after = simulation.afterAnalysis || {};
  const diff = simulation.diff || {};

  return `
    <div class="draft-simulator__grid">
      ${renderStateCard('Estado actual', before)}
      ${renderStateCard('Estado simulado', after)}
    </div>

    <section class="analysis-block draft-simulator__impact">
      <p class="eyebrow">Impacto</p>
      <div class="draft-simulator__verdict">
        <strong>${escapeHtml(diff.impact?.verdict || 'Neutro')}</strong>
        <span>Score ${Number.isFinite(Number(diff.impact?.score)) ? Number(diff.impact.score) : 0}</span>
        <span>Δ confianza ${formatSigned(Number(diff.confidenceDelta) || 0)}</span>
      </div>
      <div class="analysis-chip-list">
        <span class="analysis-chip">Gana: ${escapeHtml(diff.impact?.gain || 'Sin mejora clara')}</span>
        <span class="analysis-chip">Pierde: ${escapeHtml(diff.impact?.loss || 'Sin pérdida clara')}</span>
      </div>
      <p class="analysis-note">${escapeHtml(diff.impact?.reason || 'La comparación mantiene el plan principal.')}</p>
      ${renderHighlights(diff)}
    </section>
  `;
}

function renderStateCard(title, analysis) {
  const chips = [
    analysis.primaryIdentity,
    analysis.tempoDetail?.label || analysis.tempo,
    analysis.winCondition?.label,
    analysis.coherence?.label,
    analysis.advisor?.primaryObjective || analysis.summaryText,
  ].filter(Boolean);

  return `
    <article class="analysis-block draft-simulator__state">
      <p class="eyebrow">${escapeHtml(title)}</p>
      <h4>${escapeHtml(analysis.primaryIdentity || 'Sin definir')}</h4>
      <div class="analysis-chip-list">
        ${chips.length ? chips.map((chip) => `<span class="analysis-chip">${escapeHtml(chip)}</span>`).join('') : '<span class="analysis-empty">Sin datos</span>'}
      </div>
      <p class="analysis-note">${escapeHtml(analysis.summaryText || 'Sin resumen disponible.')}</p>
      <div class="draft-simulator__mini-list">
        <span>Confianza: ${Number.isFinite(Number(analysis.confidence)) ? Math.round(Number(analysis.confidence)) : 0}%</span>
        <span>Victoria: ${escapeHtml(analysis.winCondition?.label || 'Sin definir')}</span>
        <span>Objetivo: ${escapeHtml(analysis.advisor?.primaryObjective || 'Sin definir')}</span>
      </div>
    </article>
  `;
}

function renderHighlights(diff) {
  const highlights = Array.isArray(diff.highlights) ? diff.highlights.slice(0, 4) : [];
  const changedFields = Array.isArray(diff.changedFields) ? diff.changedFields.slice(0, 6) : [];

  return `
    <div class="draft-simulator__diff-grid">
      <article class="analysis-block draft-simulator__diff-card">
        <p class="eyebrow">Cambios clave</p>
        ${highlights.length ? renderList(highlights) : '<p class="analysis-empty">Sin cambios relevantes.</p>'}
      </article>
      <article class="analysis-block draft-simulator__diff-card">
        <p class="eyebrow">Campos alterados</p>
        ${changedFields.length ? `<div class="analysis-chip-list">${changedFields.map((field) => `<span class="analysis-chip">${escapeHtml(field)}</span>`).join('')}</div>` : '<p class="analysis-empty">El plan no cambia.</p>'}
      </article>
    </div>
  `;
}

function renderList(items) {
  return `
    <ul class="analysis-list analysis-list--neutral">
      ${items.map((item) => `<li><div><span>${escapeHtml(item)}</span></div></li>`).join('')}
    </ul>
  `;
}

function buildRoleOptions(selectedChampions, activeRole) {
  const roles = selectedChampions.map((champion) => champion.role).filter(Boolean);
  return roles
    .map((role) => `<option value="${escapeHtml(role)}" ${role === activeRole ? 'selected' : ''}>${escapeHtml(ROLE_LABELS[role] || role)}</option>`)
    .join('');
}

function buildReplacementOptions(pool, selectedName) {
  if (!pool.length) {
    return '<option value="">Sin opciones</option>';
  }

  return pool
    .map((champion) => `<option value="${escapeHtml(champion.champion)}" ${champion.champion === selectedName ? 'selected' : ''}>${escapeHtml(champion.champion)} · ${escapeHtml(champion.function || 'Sin función')}</option>`)
    .join('');
}

function getReplacementPool(role, selectedChampions) {
  const rows = state.data.get(role) || [];
  const currentChampion = selectedChampions.find((champion) => champion.role === role)?.champion || '';
  const usedElsewhere = new Set(
    selectedChampions
      .filter((champion) => champion.role !== role)
      .map((champion) => normalizeText(champion.champion))
  );

  return rows
    .filter((champion) => {
      const normalized = normalizeText(champion.champion);
      return normalized !== normalizeText(currentChampion) && !usedElsewhere.has(normalized);
    })
    .sort((a, b) => a.champion.localeCompare(b.champion, 'es'));
}

function collectSelectedChampions() {
  return [...document.querySelectorAll('#compositionGrid .slot.is-filled')]
    .map((slot) => {
      const role = normalizeRole(slot.dataset.role || 'top');
      const champion = slot.querySelector('.slot__name')?.textContent?.trim() || '';
      const row = findChampion(role, champion);
      if (!row) return null;

      return {
        role,
        champion: row.champion,
        identity: row.identity,
        function: row.function,
        tempo: row.tempo,
        strengths: row.strengths || [],
        weaknesses: row.weaknesses || [],
      };
    })
    .filter(Boolean);
}

function findChampion(role, championName) {
  const rows = state.data.get(role) || [];
  const normalizedName = normalizeText(championName);
  return rows.find((item) => normalizeText(item.champion) === normalizedName) || null;
}

function resolveActiveRole(selectedChampions) {
  const hasActive = selectedChampions.some((champion) => champion.role === state.activeRole);
  if (hasActive) return state.activeRole;

  const fallback = selectedChampions[0]?.role || ROLE_ORDER[0];
  state.activeRole = fallback;
  return fallback;
}

function normalizeRole(role) {
  return ROLE_ORDER.includes(role) ? role : ROLE_ORDER[0];
}

function formatSigned(value) {
  const rounded = Math.round(Number(value) || 0);
  return `${rounded > 0 ? '+' : ''}${rounded}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
