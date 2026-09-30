import { analyzeComposition } from './analyzer.js';

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
const METRIC_BLUEPRINTS = [
  { label: 'Engage', icon: '⚔', detail: 'Iniciación y fijar peleas.', aliases: ['engage', 'initiation', 'start'] },
  { label: 'Frontline', icon: '🛡', detail: 'Espacio y absorción de daño.', aliases: ['frontline', 'front line', 'front'] },
  { label: 'Peel', icon: '🧲', detail: 'Protección del carry.', aliases: ['peel', 'protect', 'shield'] },
  { label: 'Escalado', icon: '🐢', detail: 'Valor con el tiempo.', aliases: ['escalado', 'scale', 'scaling'] },
  { label: 'Poke', icon: '🏹', detail: 'Daño previo al all-in.', aliases: ['poke', 'siege', 'harass'] },
  { label: 'Movilidad', icon: '⚡', detail: 'Reposicionamiento y rotaciones.', aliases: ['movilidad', 'mobility', 'rotation'] },
];

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

function normalizeText(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
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

function getMetricScore(analysis, blueprint) {
  const metrics = asArray(analysis?.metrics);
  const found = metrics.find((metric) => {
    const label = normalizeText(asText(metric?.label ?? metric?.name ?? metric?.key));
    return label.includes(normalizeText(blueprint.label)) || blueprint.aliases.some((alias) => label.includes(normalizeText(alias)));
  });
  return Number.isFinite(Number(found?.score)) ? Math.round(Number(found.score)) : 0;
}

function compositionScore(analysis, selectedChampions) {
  const confidence = Number.isFinite(Number(analysis?.confidence)) ? Number(analysis.confidence) : 0;
  const coherence = Number.isFinite(Number(analysis?.coherence?.score)) ? Number(analysis.coherence.score) : confidence;
  const metrics = METRIC_BLUEPRINTS.map((blueprint) => getMetricScore(analysis, blueprint));
  const metricAverage = metrics.length ? metrics.reduce((sum, score) => sum + score, 0) / metrics.length : 0;
  const uniqueRoles = new Set(asArray(selectedChampions).map((champion) => champion.role).filter(Boolean));
  const roleCoverage = Math.round((uniqueRoles.size / ROLE_ORDER.length) * 100);
  const planClarity = asArray(analysis?.gamePlan).length >= 3 ? 92 : asArray(analysis?.gamePlan).length === 2 ? 84 : 68;
  const strengthsCount = asArray(analysis?.strengths).length;
  const weaknessesCount = asArray(analysis?.weaknesses).length;
  const stability = Math.max(40, 100 - (weaknessesCount * 12));
  const synergyHint = Math.min(100, Math.max(45, 58 + strengthsCount * 6 - weaknessesCount * 4));
  const parts = [
    { label: 'Coherencia', score: Math.round(coherence), detail: 'Alineación entre identidad y plan.' },
    { label: 'Sinergia', score: Math.round(synergyHint), detail: 'Interacción entre campeones.' },
    { label: 'Cobertura', score: roleCoverage, detail: 'Roles y herramientas presentes.' },
    { label: 'Plan', score: planClarity, detail: 'Claridad de ejecución.' },
    { label: 'Estabilidad', score: stability, detail: 'Cuánto penalizan los riesgos.' },
  ];
  const raw = (parts[0].score * 0.3) + (parts[1].score * 0.25) + (parts[2].score * 0.2) + (parts[3].score * 0.15) + (parts[4].score * 0.1);
  const score = Math.max(0, Math.min(100, Math.round((raw + metricAverage) / 2)));
  return {
    score,
    grade: gradeFromScore(score),
    label: score >= 88 ? 'Excelente' : score >= 72 ? 'Sólida' : score >= 60 ? 'Funcional' : 'Frágil',
    parts,
    dominantMetric: METRIC_BLUEPRINTS.map((blueprint) => ({ blueprint, score: getMetricScore(analysis, blueprint) }))
      .sort((a, b) => b.score - a.score || normalizeText(a.blueprint.label).localeCompare(normalizeText(b.blueprint.label)))[0] || null,
  };
}

function renderLineup(selectedChampions) {
  const lineup = ROLE_ORDER.map((role) => {
    const champion = selectedChampions.find((item) => item.role === role) || null;
    return `
      <article class="composition-report-pro__lineup-card ${champion ? 'is-filled' : 'is-empty'}">
        <span class="composition-report-pro__lineup-role">${escapeHtml(ROLE_LABELS[role] || role)}</span>
        ${champion ? `<strong>${escapeHtml(champion.champion)}</strong>` : '<strong>Vacío</strong>'}
        <span>${escapeHtml(champion?.function || champion?.identity || 'Selecciona un campeón')}</span>
        <div class="composition-report-pro__lineup-tags">
          ${champion?.tempo ? `<span class="analysis-chip">${escapeHtml(asText(champion.tempo))}</span>` : ''}
          ${champion?.identity ? `<span class="analysis-chip">${escapeHtml(asText(champion.identity))}</span>` : ''}
        </div>
      </article>
    `;
  }).join('');

  return `
    <section class="composition-report-pro__lineup-panel">
      <div class="composition-report-pro__section-head">
        <p class="eyebrow">Línea de campeones</p>
        <h4>Tu composición actual</h4>
      </div>
      <div class="composition-report-pro__lineup">${lineup}</div>
    </section>
  `;
}

function renderScoreRing(score) {
  return `
    <div class="composition-report-pro__score-card">
      <div class="composition-report-pro__score-ring" style="--score-angle: ${score.score * 3.6}deg;">
        <div class="composition-report-pro__score-ring-inner">
          <span class="composition-report-pro__score-grade">${escapeHtml(score.grade)}</span>
          <strong>${score.score}</strong>
          <span>Composition Score</span>
        </div>
      </div>
      <span class="composition-report-pro__score-label">${escapeHtml(score.label)}</span>
    </div>
  `;
}

function renderMetricCard(blueprint, analysis) {
  const value = getMetricScore(analysis, blueprint);
  const tone = value >= 80 ? 'good' : value >= 60 ? 'warn' : 'danger';
  return `
    <article class="composition-report-pro__metric-card composition-report-pro__metric-card--${tone}">
      <div class="composition-report-pro__metric-head">
        <span class="composition-report-pro__metric-icon">${escapeHtml(blueprint.icon)}</span>
        <strong>${escapeHtml(blueprint.label)}</strong>
        <span>${value}/10</span>
      </div>
      <div class="composition-report-pro__meter" aria-hidden="true">
        <span class="composition-report-pro__meter-fill" style="width:${percent(value, 10)}%"></span>
      </div>
      <p class="composition-report-pro__metric-detail">${escapeHtml(blueprint.detail)}</p>
    </article>
  `;
}

function renderMetricsPanel(analysis, score) {
  return `
    <article class="composition-report-pro__panel composition-report-pro__panel--wide">
      <div class="composition-report-pro__section-head">
        <p class="eyebrow">Perfil visual</p>
        <h4>${escapeHtml(score.dominantMetric ? `Dominante: ${score.dominantMetric.blueprint.label}` : 'Métricas funcionales')}</h4>
      </div>
      <div class="composition-report-pro__metrics-grid">
        ${METRIC_BLUEPRINTS.map((blueprint) => renderMetricCard(blueprint, analysis)).join('')}
      </div>
    </article>
  `;
}

function renderStrengthsRisksPanel(analysis) {
  const strengths = asArray(analysis?.strengths).slice(0, 4).map(normalizeEntry);
  const risks = asArray(analysis?.weaknesses).slice(0, 4).map(normalizeEntry);
  return `
    <div class="composition-report-pro__dual-grid">
      <article class="composition-report-pro__panel">
        <div class="composition-report-pro__section-head">
          <p class="eyebrow">Fortalezas</p>
          <h4>Lo que mejor hace tu equipo</h4>
        </div>
        ${strengths.length ? `<div class="composition-report-pro__stack-list">${strengths.map((item) => `
          <div class="composition-report-pro__stack-item composition-report-pro__stack-item--good">
            <div class="composition-report-pro__stack-head">
              <strong>${escapeHtml(item.label)}</strong>
              ${item.score !== null ? `<span>${'★★★★★'.slice(0, item.score)}${'☆☆☆☆☆'.slice(0, 5 - item.score)}</span>` : ''}
            </div>
            ${item.detail ? `<p>${escapeHtml(item.detail)}</p>` : ''}
            ${item.champions.length ? `<div class="analysis-chip-list analysis-chip-list--compact">${item.champions.map((champion) => `<span class="analysis-chip">${escapeHtml(champion)}</span>`).join('')}</div>` : ''}
          </div>
        `).join('')}</div>` : '<p class="analysis-empty">Sin fortalezas claras.</p>'}
      </article>

      <article class="composition-report-pro__panel">
        <div class="composition-report-pro__section-head">
          <p class="eyebrow">Riesgos</p>
          <h4>Qué debes compensar</h4>
        </div>
        ${risks.length ? `<div class="composition-report-pro__stack-list">${risks.map((item) => `
          <div class="composition-report-pro__stack-item composition-report-pro__stack-item--danger">
            <div class="composition-report-pro__stack-head">
              <strong>${escapeHtml(item.label)}</strong>
              ${item.score !== null ? `<span>${'★★★★★'.slice(0, item.score)}${'☆☆☆☆☆'.slice(0, 5 - item.score)}</span>` : ''}
            </div>
            ${item.detail ? `<p>${escapeHtml(item.detail)}</p>` : ''}
            ${item.missing.length ? `<div class="analysis-chip-list analysis-chip-list--compact">${item.missing.map((missing) => `<span class="analysis-chip analysis-chip--danger">Falta: ${escapeHtml(missing)}</span>`).join('')}</div>` : ''}
          </div>
        `).join('')}</div>` : '<p class="analysis-empty">Sin riesgos claros.</p>'}
      </article>
    </div>
  `;
}

function renderTimelinePanel(analysis) {
  const phases = asArray(analysis?.tempoDetail?.phases);
  const plan = asArray(analysis?.gamePlan);
  const steps = [
    {
      label: 'Early',
      title: asText(phases[0] || plan[0] || 'Farm y visión'),
      detail: 'Evita peleas largas y prepara el mapa.',
    },
    {
      label: 'Mid',
      title: asText(phases[1] || plan[1] || 'Objetivos y rotaciones'),
      detail: 'Convierte prioridad en dragones o control de mapa.',
    },
    {
      label: 'Late',
      title: asText(phases[2] || plan[2] || '5v5 y cierre'),
      detail: 'Protege al carry y resuelve la partida.',
    },
  ];

  return `
    <article class="composition-report-pro__panel composition-report-pro__panel--wide">
      <div class="composition-report-pro__section-head">
        <p class="eyebrow">Plan de partida</p>
        <h4>Secuencia visual de la partida</h4>
      </div>
      <div class="composition-report-pro__timeline">
        ${steps.map((step, index) => `
          <div class="composition-report-pro__timeline-step">
            <span class="composition-report-pro__timeline-dot">${index + 1}</span>
            <div>
              <span class="composition-report-pro__timeline-label">${escapeHtml(step.label)}</span>
              <strong>${escapeHtml(step.title)}</strong>
              <p>${escapeHtml(step.detail)}</p>
            </div>
          </div>
        `).join('')}
      </div>
    </article>
  `;
}

function renderExplainabilityPanel(analysis, selectedChampions) {
  const primaryIdentity = analysis?.primaryIdentity || 'Sin definir';
  const summary = asArray(analysis?.explanation?.summary).slice(0, 3).map(normalizeEntry);
  const branches = selectedChampions.map((champion) => ({
    role: champion.role,
    champion: champion.champion,
    contribution: champion.function || champion.identity || 'Aporta a la identidad',
    tempo: champion.tempo,
  }));

  return `
    <article class="composition-report-pro__panel composition-report-pro__panel--wide">
      <div class="composition-report-pro__section-head">
        <p class="eyebrow">Explainability</p>
        <h4>Por qué la composición recibe esa lectura</h4>
      </div>
      <div class="composition-report-pro__tree">
        <div class="composition-report-pro__tree-root">
          <span>${escapeHtml(primaryIdentity)}</span>
          <strong>Identidad dominante</strong>
          <p>${escapeHtml(asText(analysis?.summaryText || 'La composición se analiza como una unidad visual y funcional.'))}</p>
        </div>

        <div class="composition-report-pro__tree-branches">
          ${branches.map((branch) => `
            <article class="composition-report-pro__tree-node">
              <span class="composition-report-pro__tree-role">${escapeHtml(ROLE_LABELS[branch.role] || branch.role)}</span>
              <strong>${escapeHtml(branch.champion)}</strong>
              <p>${escapeHtml(branch.contribution)}</p>
              ${branch.tempo ? `<span class="analysis-chip">${escapeHtml(asText(branch.tempo))}</span>` : ''}
            </article>
          `).join('')}
        </div>
      </div>

      ${summary.length ? `<div class="composition-report-pro__summary-list">${summary.map((item) => `
        <div class="composition-report-pro__summary-item">
          <strong>${escapeHtml(item.label)}</strong>
          ${item.detail ? `<p>${escapeHtml(item.detail)}</p>` : ''}
        </div>
      `).join('')}</div>` : ''}
    </article>
  `;
}

function renderCoachAdvisorPanels(analysis) {
  const coach = analysis?.coach || analysis?.assistant || {};
  const advisor = analysis?.advisor || analysis?.assistant || {};
  const coachNotes = [
    ...asArray(coach.priorities).slice(0, 2),
    ...asArray(coach.insights).slice(0, 1),
  ].map(normalizeEntry);
  const advisorNotes = [
    ...asArray(advisor.objectivePriority).slice(0, 2),
    ...asArray(advisor.loseConditions).slice(0, 1),
  ].map(normalizeEntry);

  return `
    <div class="composition-report-pro__dual-grid">
      <article class="composition-report-pro__panel">
        <div class="composition-report-pro__section-head">
          <p class="eyebrow">Coach</p>
          <h4>${escapeHtml(coach.headline || 'Juega alrededor de tu identidad')}</h4>
        </div>
        <div class="composition-report-pro__stack-list">
          ${coachNotes.length ? coachNotes.map((item) => `
            <div class="composition-report-pro__stack-item composition-report-pro__stack-item--coach">
              <strong>${escapeHtml(item.label)}</strong>
              ${item.detail ? `<p>${escapeHtml(item.detail)}</p>` : ''}
            </div>
          `).join('') : '<p class="analysis-empty">Sin consejos claros.</p>'}
        </div>
      </article>

      <article class="composition-report-pro__panel">
        <div class="composition-report-pro__section-head">
          <p class="eyebrow">Strategic Advisor</p>
          <h4>${escapeHtml(advisor.primaryObjective || advisor.summary?.priority || 'Objetivo estratégico')}</h4>
        </div>
        <div class="composition-report-pro__stack-list">
          ${advisorNotes.length ? advisorNotes.map((item) => `
            <div class="composition-report-pro__stack-item composition-report-pro__stack-item--advisor">
              <strong>${escapeHtml(item.label)}</strong>
              ${item.detail ? `<p>${escapeHtml(item.detail)}</p>` : ''}
            </div>
          `).join('') : '<p class="analysis-empty">Sin prioridades claras.</p>'}
        </div>
      </article>
    </div>
  `;
}

function renderVisualSummary(analysis) {
  const selectedChampions = collectSelectedChampions();
  const score = compositionScore(analysis, selectedChampions);
  const dominant = score.dominantMetric?.blueprint?.label || 'Sin definir';

  return `
    <section class="composition-report-pro composition-report-pro--visual">
      <div class="composition-report-pro__hero">
        ${renderScoreRing(score)}
        <div class="composition-report-pro__hero-copy">
          <p class="eyebrow">Composition View</p>
          <h3>${escapeHtml(analysis?.primaryIdentity || 'Sin identidad clara')}</h3>
          <p class="analysis-note">${escapeHtml(analysis?.summaryText || 'La composición se entiende como una pieza visual: identidad, ritmo, fortalezas, riesgos y plan.')}</p>
          <div class="analysis-chip-list analysis-chip-list--compact">
            <span class="analysis-chip">${escapeHtml(analysis?.winCondition?.label || 'Sin win condition')}</span>
            <span class="analysis-chip">${escapeHtml(analysis?.tempoDetail?.label || analysis?.tempo || 'Sin tempo')}</span>
            <span class="analysis-chip">${escapeHtml(analysis?.coherence?.label || 'Sin coherencia')}</span>
            <span class="analysis-chip">Dominante: ${escapeHtml(dominant)}</span>
          </div>
        </div>
      </div>

      ${renderLineup(selectedChampions)}

      <div class="composition-report-pro__grid">
        ${renderMetricsPanel(analysis, score)}
        ${renderStrengthsRisksPanel(analysis)}
        ${renderTimelinePanel(analysis)}
        ${renderExplainabilityPanel(analysis, selectedChampions)}
        ${renderCoachAdvisorPanels(analysis)}
      </div>
    </section>
  `;
}

function renderEmptyState() {
  return `
    <section class="composition-report-pro composition-report-pro--empty">
      <p class="eyebrow">Composition View</p>
      <h3>Selecciona cinco campeones para ver el análisis visual</h3>
      <p class="analysis-note">La vista mostrará identidad, línea de campeones, métricas, plan, fortalezas, riesgos, coach y explicación.</p>
      <div class="composition-report-pro__empty-poster">
        <div class="composition-report-pro__empty-chip">Score</div>
        <div class="composition-report-pro__empty-chip">Línea</div>
        <div class="composition-report-pro__empty-chip">Métricas</div>
        <div class="composition-report-pro__empty-chip">Plan</div>
      </div>
    </section>
  `;
}

function renderSummary() {
  const root = document.getElementById('compositionReportPro');
  if (!root) return;

  const selectedChampions = collectSelectedChampions();
  if (!selectedChampions.length) {
    root.innerHTML = renderEmptyState();
    return;
  }

  const analysis = analyzeComposition(selectedChampions);
  root.innerHTML = renderVisualSummary(analysis);
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
  window.setInterval(renderSummary, 1500);
}

init().catch((error) => console.error(error));