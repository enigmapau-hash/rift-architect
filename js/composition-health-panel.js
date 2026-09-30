import { analyzeComposition } from './analyzer.js';

const ROOT_ID = 'healthView';
const SELECTOR = '#compositionGrid .slot.is-filled';

const state = {
  root: null,
  scheduled: false,
  observer: null,
};

init().catch((error) => console.error(error));

async function init() {
  const storyView = document.getElementById('storyView');
  const compositionGrid = document.getElementById('compositionGrid');
  if (!storyView || !compositionGrid) return;

  mountRoot(storyView);
  observeComposition(compositionGrid);
  renderHealth();
}

function mountRoot(storyView) {
  const existing = document.getElementById(ROOT_ID);
  if (existing) {
    state.root = existing;
    return;
  }

  const root = document.createElement('section');
  root.id = ROOT_ID;
  root.className = 'composition-health';
  root.setAttribute('aria-live', 'polite');
  storyView.insertAdjacentElement('afterend', root);
  state.root = root;
}

function observeComposition(node) {
  if (state.observer) return;

  state.observer = new MutationObserver(scheduleRender);
  state.observer.observe(node, { childList: true, subtree: true, characterData: true });
}

function scheduleRender() {
  if (state.scheduled) return;
  state.scheduled = true;

  window.requestAnimationFrame(() => {
    state.scheduled = false;
    renderHealth();
  });
}

function renderHealth() {
  if (!state.root) return;

  const selectedChampions = collectSelectedChampions();
  if (selectedChampions.length < 5) {
    state.root.innerHTML = `
      <article class="composition-health__empty">
        <p class="eyebrow">Índice de salud</p>
        <h4>Completa los cinco campeones para ver el diagnóstico</h4>
        <p>El bloque mostrará la salud del draft, el perfil táctico calculado, la condición de victoria y el mayor error castigado.</p>
      </article>
    `;
    return;
  }

  const analysis = analyzeComposition(selectedChampions);
  const model = buildHealthModel(analysis, selectedChampions);

  state.root.innerHTML = `
    <section class="composition-health__shell">
      <div class="composition-health__header">
        <div class="composition-health__header-copy">
          <p class="eyebrow">Sprint 11 · Analysis Experience</p>
          <h4>Índice de salud de la composición</h4>
          <p>${escapeHtml(model.summary)}</p>
        </div>
        <div class="composition-health__score-card ${scoreTone(model.overall)}">
          <span class="composition-health__score-kicker">Salud</span>
          <strong>${model.grade} · ${model.overall}</strong>
          <span>${model.summaryBadge}</span>
        </div>
      </div>

      <div class="composition-health__grid">
        <article class="composition-health__card composition-health__card--index">
          <span class="composition-health__card-kicker">Diagnóstico ejecutivo</span>
          <div class="composition-health__health-list">
            ${model.healthRows.map(renderHealthRow).join('')}
          </div>
        </article>

        <article class="composition-health__card composition-health__card--profile">
          <span class="composition-health__card-kicker">Perfil táctico calculado</span>
          <div class="composition-health__metric-list">
            ${model.profileBars.map(renderProfileBar).join('')}
          </div>
        </article>

        <article class="composition-health__card composition-health__card--win">
          <span class="composition-health__card-kicker">Condición de victoria</span>
          <strong>${escapeHtml(model.winTitle)}</strong>
          <p>${escapeHtml(model.winText)}</p>
          <div class="composition-health__chip-list">
            ${model.winChips.map((chip) => `<span class="story-pill story-pill--success">${escapeHtml(chip)}</span>`).join('')}
          </div>
        </article>

        <article class="composition-health__card composition-health__card--risk">
          <span class="composition-health__card-kicker">Mayor error castigado</span>
          <strong>${escapeHtml(model.errorTitle)}</strong>
          <p>${escapeHtml(model.errorText)}</p>
          <div class="composition-health__chip-list">
            ${model.errorChips.map((chip) => `<span class="story-pill story-pill--danger">${escapeHtml(chip)}</span>`).join('')}
          </div>
        </article>
      </div>
    </section>
  `;
}

function collectSelectedChampions() {
  return [...document.querySelectorAll(SELECTOR)]
    .map((slot) => {
      const role = String(slot.dataset.role || 'top');
      const name = slot.querySelector('.slot__name')?.textContent?.trim() || '';
      const identity = slot.querySelector('.slot__meta')?.textContent?.trim() || '';
      const functionText = slot.querySelector('.champion-item__sub')?.textContent?.trim() || '';
      return { role, champion: name, identity, function: functionText, tempo: '', strengths: [], weaknesses: [] };
    })
    .filter((champion) => champion.champion);
}

function buildHealthModel(analysis, selectedChampions) {
  const metrics = Array.isArray(analysis?.metrics) ? analysis.metrics : [];
  const synergyScore = computeSynergyScore(analysis?.synergies);
  const damageBalance = computeDamageBalance(analysis?.damageSplit);
  const executionEase = computeExecutionEase(selectedChampions);
  const identityScore = clamp(Math.round((Number(analysis?.confidence) || 0) / 10), 1, 10);
  const frontlineScore = metricScore(metrics, 'Frontline');
  const scalingScore = metricScore(metrics, 'Escalado');
  const overall = Math.round((identityScore * 2 + synergyScore * 2 + damageBalance * 1.5 + frontlineScore * 1.5 + scalingScore * 1.5 + executionEase * 1.5) / 10);
  const grade = gradeFromScore(overall);
  const summaryBadge = overall >= 85 ? 'Muy sólido' : overall >= 70 ? 'Jugable' : 'Exige ajustes';
  const summary = analysis?.advisor?.summary?.reason
    || analysis?.summaryText
    || 'El índice resume si la composición tiene identidad clara, sinergia suficiente y una condición de victoria entendible.';

  const healthRows = [
    {
      label: 'Identidad',
      score: identityScore,
      detail: analysis?.primaryIdentity || 'Sin identidad clara',
    },
    {
      label: 'Sinergia',
      score: synergyScore,
      detail: (analysis?.synergies?.[0]?.label) || 'Sin sinergias destacadas',
    },
    {
      label: 'Balance de daño',
      score: damageBalance,
      detail: damageBalance >= 8 ? 'Buena mezcla de daño' : damageBalance >= 5 ? 'Requiere compensar el perfil de daño' : 'Muy cargada a un único tipo de daño',
    },
    {
      label: 'Frontline',
      score: frontlineScore,
      detail: frontlineScore >= 8 ? 'Tienes espacio para pelear' : frontlineScore >= 5 ? 'Frontline aceptable' : 'Falta línea frontal',
    },
    {
      label: 'Escalado',
      score: scalingScore,
      detail: scalingScore >= 8 ? 'Escala muy bien' : scalingScore >= 5 ? 'Escalado correcto' : 'Pico de poder más corto',
    },
    {
      label: 'Ejecución',
      score: executionEase,
      detail: executionEase >= 8 ? 'Más sencilla de ejecutar' : executionEase >= 5 ? 'Exige coordinación' : 'Muy exigente de ejecutar',
    },
  ];

  const profileBars = [
    { label: 'Engage', score: metricScore(metrics, 'Engage') },
    { label: 'Peel', score: Math.round((metricScore(metrics, 'Frontline') + metricScore(metrics, 'Control') + metricScore(metrics, 'Teamfight')) / 3) },
    { label: 'Escalado', score: metricScore(metrics, 'Escalado') },
    { label: 'Frontline', score: metricScore(metrics, 'Frontline') },
    { label: 'Movilidad', score: metricScore(metrics, 'Movilidad') },
    { label: 'CC', score: metricScore(metrics, 'Control') },
  ].sort((a, b) => b.score - a.score || a.label.localeCompare(b.label, 'es'));

  const winTitle = analysis?.advisor?.summary?.priority || analysis?.winCondition?.label || 'Jugar alrededor de tu identidad';
  const winText = analysis?.winCondition?.detail
    || analysis?.advisor?.summary?.reason
    || 'La composición gana si llega al momento adecuado, protege la pieza clave y convierte esa ventana en una pelea ordenada.';
  const winChips = uniqueValues([
    analysis?.advisor?.summary?.identity,
    analysis?.advisor?.summary?.powerSpike,
    analysis?.tempoDetail?.label,
    analysis?.primaryIdentity,
  ]);

  const error = analysis?.advisor?.loseConditions?.[0] || analysis?.winCondition?.avoid?.[0] || null;
  const errorTitle = error?.label || 'Forzar el timing equivocado';
  const errorText = error?.detail || 'Si fuerzas peleas antes del pico de poder, pierdes gran parte del valor del draft.';
  const errorChips = uniqueValues([
    analysis?.advisor?.summary?.risk,
    analysis?.coherence?.label,
    analysis?.weaknesses?.[0]?.label,
  ]);

  return {
    overall: clamp(overall, 0, 100),
    grade,
    summaryBadge,
    summary,
    healthRows,
    profileBars,
    winTitle,
    winText,
    winChips,
    errorTitle,
    errorText,
    errorChips,
  };
}

function renderHealthRow(item) {
  const tone = scoreTone(item.score);
  return `
    <div class="composition-health__row ${tone}">
      <div>
        <strong>${escapeHtml(item.label)}</strong>
        <p>${escapeHtml(item.detail)}</p>
      </div>
      <span>${item.score}/10</span>
    </div>
  `;
}

function renderProfileBar(item) {
  const tone = scoreTone(item.score);
  return `
    <div class="composition-health__metric ${tone}">
      <div class="composition-health__metric-head">
        <strong>${escapeHtml(item.label)}</strong>
        <span>${item.score}/10</span>
      </div>
      <div class="composition-health__bar" aria-hidden="true">
        <span class="composition-health__bar-fill" style="width:${clamp(item.score, 0, 10) * 10}%"></span>
      </div>
    </div>
  `;
}

function scoreTone(score) {
  if (score >= 8) return 'is-good';
  if (score >= 5) return 'is-mid';
  return 'is-low';
}

function computeSynergyScore(synergies) {
  const values = Array.isArray(synergies) ? synergies.map((item) => Number(item?.score) || 0).filter(Boolean) : [];
  if (!values.length) return 5;
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  return clamp(Math.round(average / 10), 1, 10);
}

function computeDamageBalance(damageSplit) {
  const ap = Number(damageSplit?.ap) || 0;
  const ad = Number(damageSplit?.ad) || 0;
  const hybrid = Number(damageSplit?.hybrid) || 0;
  const total = Math.max(1, ap + ad + hybrid);
  const spread = Math.abs(ap - ad) / total;
  const score = 10 - Math.round(spread * 10) - (hybrid > 0 ? 0 : 1);
  return clamp(score, 1, 10);
}

function computeExecutionEase(selectedChampions) {
  const complexTerms = ['exigente', 'técnico', 'tecnico', 'difícil', 'dificil', 'caótico', 'caotico', 'mecánico', 'mecanico', 'preciso'];
  const complexityHits = selectedChampions.reduce((total, champion) => {
    const text = [champion.champion, champion.identity, champion.function, champion.tempo, ...(champion.strengths || []), ...(champion.weaknesses || [])]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return total + (complexTerms.some((term) => text.includes(term)) ? 1 : 0);
  }, 0);

  return clamp(10 - complexityHits * 2, 1, 10);
}

function metricScore(metrics, label) {
  const key = normalizeText(label);
  const found = metrics.find((metric) => normalizeText(metric?.label || metric?.key || '') === key);
  return clamp(Math.round(Number(found?.score) || 0), 0, 10) || 5;
}

function uniqueValues(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function normalizeText(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
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

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
