import { analyzeComposition } from './analyzer.js';

const DATA_MANIFEST_URL = './data/index.json';
const ROLE_FILES = [
  { key: 'top', file: './data/top.json' },
  { key: 'jungle', file: './data/jungle.json' },
  { key: 'mid', file: './data/mid.json' },
  { key: 'botline', file: './data/bot.json' },
  { key: 'support', file: './data/support.json' },
];

const ROLE_ORDER = ROLE_FILES.map(({ key }) => key);

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

function stars(score = 0) {
  const numeric = Math.max(0, Math.min(5, Number(score) || 0));
  return '★★★★★'.slice(0, numeric) + '☆☆☆☆☆'.slice(0, 5 - numeric);
}

function percent(score, max = 100) {
  const numeric = Number.isFinite(Number(score)) ? Number(score) : 0;
  return Math.max(0, Math.min(100, Math.round((numeric / max) * 100)));
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

function compositionScore(analysis, selectedChampions) {
  const confidence = Number.isFinite(Number(analysis?.confidence)) ? Number(analysis.confidence) : 0;
  const coherence = Number.isFinite(Number(analysis?.coherence?.score)) ? Number(analysis.coherence.score) : confidence;
  const metrics = asArray(analysis?.metrics);
  const metricAverage = metrics.length
    ? metrics.reduce((sum, metric) => sum + (Number.isFinite(Number(metric?.score)) ? Number(metric.score) : 0), 0) / metrics.length
    : 0;
  const uniqueRoles = new Set(asArray(selectedChampions).map((champion) => champion.role).filter(Boolean));
  const roleCoverage = Math.round((uniqueRoles.size / ROLE_ORDER.length) * 100);
  const planClarity = asArray(analysis?.gamePlan).length >= 3 ? 92 : asArray(analysis?.gamePlan).length === 2 ? 84 : 70;
  const raw = confidence * 0.34 + coherence * 0.28 + metricAverage * 10 * 0.18 + roleCoverage * 0.12 + planClarity * 0.08;
  const score = Math.max(0, Math.min(100, Math.round(raw)));
  return {
    score,
    grade: gradeFromScore(score),
    label: score >= 88 ? 'Excelente' : score >= 72 ? 'Sólida' : score >= 60 ? 'Funcional' : 'Frágil',
    parts: [
      { label: 'Coherencia', score: Math.round(coherence), detail: 'Alineación entre identidad y plan.' },
      { label: 'Confianza', score: Math.round(confidence), detail: 'Solidez del análisis.' },
      { label: 'Métricas', score: Math.round(metricAverage * 10), detail: 'Promedio funcional del perfil.' },
      { label: 'Cobertura', score: roleCoverage, detail: 'Roles cubiertos en la composición.' },
      { label: 'Plan', score: planClarity, detail: 'Claridad de la ruta de juego.' },
    ],
  };
}

function renderActionButtons() {
  return `
    <div class="composition-report-pro__actions">
      <button class="report-button" type="button" data-report-action="print">Exportar PDF</button>
      <button class="report-button report-button--ghost" type="button" data-report-action="copy">Copiar resumen</button>
    </div>
  `;
}

function renderScoreBar(part) {
  return `
    <article class="composition-report-pro__score-part">
      <div class="composition-report-pro__score-part-head">
        <strong>${escapeHtml(part.label)}</strong>
        <span>${escapeHtml(String(part.score))}/100</span>
      </div>
      <div class="composition-report-pro__meter" aria-hidden="true">
        <span class="composition-report-pro__meter-fill" style="width:${percent(part.score)}%"></span>
      </div>
      <p class="composition-report-pro__score-note">${escapeHtml(part.detail)}</p>
    </article>
  `;
}

function renderChecklistItem(label, value, variant = 'neutral') {
  return `
    <article class="composition-report-pro__check-item composition-report-pro__check-item--${variant}">
      <span class="composition-report-pro__check-label">${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </article>
  `;
}

function renderChecklist(analysis) {
  const plan = asArray(analysis?.gamePlan).slice(0, 3).map((item) => asText(item));
  const risks = asArray(analysis?.weaknesses).slice(0, 3).map((item) => normalizeEntry(item));
  const coach = analysis?.coach || analysis?.assistant || {};

  return `
    <section class="composition-report-pro__checklist-card">
      <div class="composition-report-pro__section-head">
        <p class="eyebrow">Checklist</p>
        <h4>Cómo leer y jugar la composición</h4>
      </div>

      <div class="composition-report-pro__checklist-grid">
        ${renderChecklistItem('1. Identidad', analysis?.primaryIdentity || 'Sin definir', 'info')}
        ${renderChecklistItem('2. Victoria', analysis?.winCondition?.label || 'Sin definir', 'success')}
        ${renderChecklistItem('3. Power spike', analysis?.tempoDetail?.label || analysis?.tempo || 'Sin definir', 'coach')}
        ${renderChecklistItem('4. Score', `${compositionScore(analysis, collectSelectedChampions()).score}/100`, 'info')}
      </div>

      <div class="composition-report-pro__checklist-block">
        <strong>Plan de partida</strong>
        ${plan.length ? `<ul class="composition-report-pro__bullets">${plan.map((step, index) => `<li><span>${index + 1}</span>${escapeHtml(step)}</li>`).join('')}</ul>` : '<p class="analysis-empty">Sin plan claro.</p>'}
      </div>

      <div class="composition-report-pro__checklist-block">
        <strong>Riesgos a compensar</strong>
        ${risks.length ? `<ul class="composition-report-pro__bullets">${risks.map((risk) => `<li><span>!</span>${escapeHtml(risk.label)}${risk.detail ? ` · ${escapeHtml(risk.detail)}` : ''}</li>`).join('')}</ul>` : '<p class="analysis-empty">Sin riesgos claros.</p>'}
      </div>

      <div class="composition-report-pro__checklist-block">
        <strong>Coach</strong>
        <p class="analysis-note">${escapeHtml(coach.headline || 'Juega alrededor de tu identidad.')}</p>
      </div>
    </section>
  `;
}

function buildPlainSummary(analysis, score, selectedChampions) {
  const roles = selectedChampions.map((champion) => `${champion.role.toUpperCase()}: ${champion.champion}`).join(' | ');
  const strengths = asArray(analysis?.strengths).slice(0, 3).map((item) => asText(item)).join(' · ');
  const risks = asArray(analysis?.weaknesses).slice(0, 3).map((item) => asText(item)).join(' · ');
  const plan = asArray(analysis?.gamePlan).slice(0, 3).map((item) => asText(item)).join(' → ');

  return [
    'Rift Architect · Composition Report',
    `Score: ${score.grade} (${score.score}/100)`,
    `Identidad: ${analysis?.primaryIdentity || 'Sin definir'}`,
    `Win condition: ${analysis?.winCondition?.label || 'Sin definir'}`,
    `Tempo: ${analysis?.tempoDetail?.label || analysis?.tempo || 'Sin definir'}`,
    `Coherencia: ${analysis?.coherence?.label || 'Sin definir'}`,
    roles ? `Campeones: ${roles}` : 'Campeones: Sin definir',
    strengths ? `Fortalezas: ${strengths}` : 'Fortalezas: Sin definir',
    risks ? `Riesgos: ${risks}` : 'Riesgos: Sin definir',
    plan ? `Plan: ${plan}` : 'Plan: Sin definir',
  ].join('\n');
}

function renderReportPro(analysis) {
  const selectedChampions = collectSelectedChampions();
  const score = compositionScore(analysis, selectedChampions);

  return `
    <section class="composition-report-pro">
      <div class="composition-report-pro__header">
        <div>
          <p class="eyebrow">Composition Report Pro</p>
          <h3>Resumen ejecutivo y exportable</h3>
          <p class="analysis-note">La ficha resume en una sola vista el estado real de tu composición y cómo jugarla.</p>
        </div>
        ${renderActionButtons()}
      </div>

      <div class="composition-report-pro__hero">
        <div class="composition-report-pro__scorebox">
          <span class="composition-report-pro__score-grade">${escapeHtml(score.grade)}</span>
          <strong class="composition-report-pro__score-value">${score.score}</strong>
          <span class="composition-report-pro__score-label">${escapeHtml(score.label)}</span>
        </div>

        <div class="composition-report-pro__summary">
          <h4>${escapeHtml(analysis?.primaryIdentity || 'Sin identidad clara')}</h4>
          <p class="analysis-note">${escapeHtml(analysis?.summaryText || 'La composición se analiza como una unidad: identidad, plan, riesgos y poder de ejecución.')}</p>
          <div class="analysis-chip-list analysis-chip-list--compact">
            <span class="analysis-chip">${escapeHtml(analysis?.winCondition?.label || 'Sin win condition')}</span>
            <span class="analysis-chip">${escapeHtml(analysis?.tempoDetail?.label || analysis?.tempo || 'Sin tempo')}</span>
            <span class="analysis-chip">${escapeHtml(analysis?.coherence?.label || 'Sin coherencia')}</span>
          </div>
        </div>
      </div>

      <div class="composition-report-pro__grid">
        <article class="composition-report-pro__card">
          <div class="composition-report-pro__section-head">
            <p class="eyebrow">Composition Score</p>
            <h4>De dónde sale la nota</h4>
          </div>
          <div class="composition-report-pro__score-parts">
            ${score.parts.map(renderScoreBar).join('')}
          </div>
        </article>

        ${renderChecklist(analysis)}
      </div>

      <article class="composition-report-pro__card composition-report-pro__export-note">
        <div class="composition-report-pro__section-head">
          <p class="eyebrow">Export</p>
          <h4>Resumen listo para guardar como PDF</h4>
        </div>
        <p class="analysis-note">Pulsa Exportar PDF para abrir la ventana de impresión del navegador y guardar esta ficha ejecutiva.</p>
      </article>
    </section>
  `;
}

function renderSummary() {
  const root = document.getElementById('compositionReportPro');
  if (!root) return;

  const selectedChampions = collectSelectedChampions();
  if (!selectedChampions.length) {
    root.innerHTML = `
      <section class="composition-report-pro composition-report-pro--empty">
        <p class="eyebrow">Composition Report Pro</p>
        <h3>Selecciona cinco campeones para ver el informe ejecutivo</h3>
        <p class="analysis-note">Aquí aparecerán el score desglosado, la checklist de juego y la opción de exportar el reporte como PDF.</p>
      </section>
    `;
    return;
  }

  const analysis = analyzeComposition(selectedChampions);
  root.innerHTML = renderReportPro(analysis);
}

function handleActionClick(event) {
  const button = event.target instanceof Element ? event.target.closest('[data-report-action]') : null;
  if (!button) return;

  const action = button.getAttribute('data-report-action');
  const selectedChampions = collectSelectedChampions();
  if (!selectedChampions.length) return;

  const analysis = analyzeComposition(selectedChampions);
  const score = compositionScore(analysis, selectedChampions);

  if (action === 'print') {
    window.print();
    return;
  }

  if (action === 'copy') {
    const text = buildPlainSummary(analysis, score, selectedChampions);
    const copyPromise = navigator.clipboard?.writeText(text);
    if (copyPromise && typeof copyPromise.then === 'function') {
      copyPromise.catch(() => {
        window.prompt('Copia el resumen', text);
      });
      return;
    }
    window.prompt('Copia el resumen', text);
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
    renderSummary();
  });
}

async function init() {
  await loadRoleData();
  observeComposition();
  renderSummary();
  document.addEventListener('click', handleActionClick);
  window.setInterval(renderSummary, 1500);
}
