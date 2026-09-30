import { analyzeComposition } from './analyzer.js';

const WORKBOOK_URL = './Draft%20Pool.xlsx';
const DATA_MANIFEST_URL = './data/index.json';
const ROLE_FILES = [
  { key: 'top', file: './data/top.json', sheet: 'Tabla Top' },
  { key: 'jungle', file: './data/jungle.json', sheet: 'Tabla Jungla' },
  { key: 'mid', file: './data/mid.json', sheet: 'Tabla Mid' },
  { key: 'botline', file: './data/bot.json', sheet: 'Tabla Botline' },
  { key: 'support', file: './data/support.json', sheet: 'Tabla Support' },
];

const ROOT_ID = 'assessmentView';
const SELECTOR = '#compositionGrid .slot.is-filled';

const state = {
  root: null,
  observer: null,
  scheduled: false,
  loaded: false,
  data: new Map(),
};

init().catch((error) => console.error(error));

async function init() {
  const storyView = document.getElementById('storyView');
  const compositionGrid = document.getElementById('compositionGrid');
  if (!storyView || !compositionGrid) return;

  mountRoot(storyView);
  await loadRoleData();
  observeComposition(compositionGrid);
  renderAssessment();
}

function mountRoot(storyView) {
  const existing = document.getElementById(ROOT_ID);
  if (existing) {
    state.root = existing;
    return;
  }

  const root = document.createElement('section');
  root.id = ROOT_ID;
  root.className = 'composition-assessment';
  root.setAttribute('aria-live', 'polite');
  storyView.insertAdjacentElement('afterend', root);
  state.root = root;
}

async function loadRoleData() {
  if (state.loaded) return;
  state.loaded = true;

  const loaded = (await loadJsonDataset()) || (await loadWorkbookDataset());
  if (loaded) {
    Object.entries(loaded).forEach(([key, rows]) => state.data.set(key, Array.isArray(rows) ? rows : []));
    return;
  }

  ROLE_FILES.forEach(({ key }) => state.data.set(key, []));
}

async function loadJsonDataset() {
  try {
    const manifestResponse = await fetch(DATA_MANIFEST_URL, { cache: 'reload' });
    if (!manifestResponse.ok) return null;

    const manifest = await manifestResponse.json();
    if (!Array.isArray(manifest?.files) || !manifest.files.length) return null;

    const loaded = await Promise.all(
      ROLE_FILES.map(async ({ key, file }) => {
        const response = await fetch(file, { cache: 'reload' });
        if (!response.ok) throw new Error(`No se pudo leer ${file}`);
        return [key, await response.json()];
      })
    );

    return Object.fromEntries(loaded);
  } catch {
    return null;
  }
}

async function loadWorkbookDataset() {
  if (!window.XLSX) return null;

  try {
    const response = await fetch(WORKBOOK_URL, { cache: 'reload' });
    if (!response.ok) return null;

    const workbook = window.XLSX.read(await response.arrayBuffer(), { type: 'array' });
    const dataset = {};
    ROLE_FILES.forEach(({ key, sheet }) => {
      dataset[key] = worksheetToRows(workbook.Sheets[sheet]);
    });
    return dataset;
  } catch {
    return null;
  }
}

function worksheetToRows(worksheet) {
  if (!worksheet) return [];

  const rows = window.XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false, defval: '' });
  return rows
    .slice(1)
    .filter((row) => row[0])
    .map((row) => ({
      champion: String(row[0]).trim(),
      identity: String(row[1] || '').trim(),
      function: String(row[2] || '').trim(),
      tempo: String(row[3] || '').trim(),
      strengths: splitTags(row[4]),
      weaknesses: splitTags(row[5]),
    }));
}

function splitTags(value) {
  if (!value) return [];
  return String(value)
    .split('·')
    .map((part) => part.trim())
    .filter(Boolean);
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
    renderAssessment();
  });
}

function renderAssessment() {
  if (!state.root) return;

  const selectedChampions = collectSelectedChampions();
  if (selectedChampions.length < 5) {
    state.root.innerHTML = `
      <article class="composition-assessment__empty">
        <p class="eyebrow">Composition Assessment</p>
        <h4>Completa los cinco campeones para ver el diagnóstico completo</h4>
        <p>El bloque unifica salud, calidad y señales fuertes para dejar una sola lectura clara de la composición.</p>
      </article>
    `;
    return;
  }

  const analysis = analyzeComposition(selectedChampions);
  const model = buildAssessmentModel(analysis, selectedChampions);

  state.root.innerHTML = `
    <section class="composition-assessment__shell">
      <div class="composition-assessment__header">
        <div class="composition-assessment__header-copy">
          <p class="eyebrow">Sprint 12.5 · Product Audit</p>
          <h4>Composition Assessment</h4>
          <p>${escapeHtml(model.summary)}</p>
          <div class="composition-assessment__verdict">
            <span class="story-pill story-pill--${toneByGrade(model.grade)}">${escapeHtml(model.verdictBadge)}</span>
            <strong>${escapeHtml(model.verdictHeadline)}</strong>
            <p>${escapeHtml(model.verdictText)}</p>
          </div>
        </div>

        <div class="composition-assessment__score-card ${scoreTone(model.overall)}">
          <span class="composition-assessment__score-kicker">Assessment</span>
          <strong>${model.grade} · ${model.overall}</strong>
          <span>${escapeHtml(model.badge)}</span>
        </div>
      </div>

      <div class="composition-assessment__grid">
        <article class="composition-assessment__card composition-assessment__card--signals">
          <span class="composition-assessment__card-kicker">Señales fuertes</span>
          <div class="composition-assessment__chip-list">
            ${model.signals.map((signal) => `<span class="story-pill story-pill--info">${escapeHtml(signal)}</span>`).join('')}
          </div>
          <p>${escapeHtml(model.signalText)}</p>
        </article>

        <article class="composition-assessment__card composition-assessment__card--diagnosis">
          <span class="composition-assessment__card-kicker">Diagnóstico ejecutivo</span>
          <div class="composition-assessment__row-list">
            ${model.diagnostics.map(renderDiagnosticRow).join('')}
          </div>
        </article>

        <article class="composition-assessment__card composition-assessment__card--improve">
          <span class="composition-assessment__card-kicker">Qué reforzar</span>
          <div class="composition-assessment__list">
            ${model.improvements.map((item) => `
              <div class="composition-assessment__item ${item.tone}">
                <strong>${escapeHtml(item.label)}</strong>
                <p>${escapeHtml(item.detail)}</p>
              </div>
            `).join('')}
          </div>
        </article>

        <article class="composition-assessment__card composition-assessment__card--coverage">
          <span class="composition-assessment__card-kicker">Cobertura del motor</span>
          <div class="composition-assessment__coverage-grid">
            ${model.coverage.map(renderCoverageItem).join('')}
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
      const champion = findChampion(role, name);
      return champion ? { role, ...champion } : null;
    })
    .filter(Boolean);
}

function findChampion(roleKey, championName) {
  const normalizedName = String(championName || '').trim().toLowerCase();
  const rows = state.data.get(roleKey) || [];
  return rows.find((item) => String(item?.champion || '').trim().toLowerCase() === normalizedName) || null;
}

function buildAssessmentModel(analysis, selectedChampions) {
  const metrics = Array.isArray(analysis?.metrics) ? analysis.metrics : [];
  const confidence = clamp(Math.round(Number(analysis?.confidence) || 0), 0, 100);
  const coherence = clamp(Math.round(Number(analysis?.coherence?.score) || 0), 0, 100);
  const synergies = Array.isArray(analysis?.synergies) ? analysis.synergies : [];
  const priorities = Array.isArray(analysis?.advisor?.objectivePriority) ? analysis.advisor.objectivePriority : [];
  const signalCoverage = clamp(
    Math.round(
      [analysis?.primaryIdentity, analysis?.tempoDetail?.label, analysis?.winCondition?.label, synergies[0]?.label, priorities[0]].filter(Boolean).length * 20
    ),
    0,
    100
  );

  const overall = clamp(Math.round((confidence * 0.32) + (coherence * 0.32) + (signalCoverage * 0.18) + (metricScore(metrics, 'Frontline') * 5) + (metricScore(metrics, 'Escalado') * 3)), 0, 100);
  const grade = gradeFromScore(overall);
  const badge = overall >= 85 ? 'Lectura muy fiable' : overall >= 70 ? 'Lectura sólida' : 'Lectura mejorable';
  const verdictBadge = overall >= 85 ? 'Assessment claro' : overall >= 70 ? 'Assessment estable' : 'Assessment frágil';
  const summary = analysis?.summaryText || 'Una sola lectura reúne salud, calidad y cobertura del análisis para entender la composición de un vistazo.';
  const verdictHeadline = buildVerdictHeadline(analysis, overall);
  const verdictText = buildVerdictText(analysis, selectedChampions, overall);
  const signals = uniqueValues([
    analysis?.primaryIdentity,
    analysis?.tempoDetail?.label,
    analysis?.winCondition?.label,
    synergies[0]?.label,
    analysis?.advisor?.summary?.priority,
  ]).slice(0, 4);

  const diagnostics = [
    {
      label: 'Identidad',
      score: clamp(Math.round((confidence * 0.6) + (coherence * 0.4)), 0, 10),
      detail: analysis?.primaryIdentity || 'Sin identidad clara',
      why: analysis?.summaryText || 'La identidad principal condiciona todo el resto del análisis.',
    },
    {
      label: 'Sinergia',
      score: clamp(Math.round(((synergies[0]?.score || 50) / 10)), 0, 10),
      detail: synergies[0]?.label || 'Sin sinergias destacadas',
      why: synergies[0]?.detail || 'La mejor sinergia detectada marca el plan de pelea.',
    },
    {
      label: 'Balance de daño',
      score: damageBalanceScore(analysis?.damageSplit),
      detail: damageBalanceText(analysis?.damageSplit),
      why: 'Un perfil mixto facilita ajustar ítems y reduce el riesgo de quedar bloqueado por resistencias.',
    },
    {
      label: 'Frontline',
      score: metricScore(metrics, 'Frontline'),
      detail: metricScore(metrics, 'Frontline') >= 8 ? 'Buena línea frontal' : metricScore(metrics, 'Frontline') >= 5 ? 'Frontline aceptable' : 'Falta frontline',
      why: 'La frontline determina cuánto espacio gana el carry para pegar con seguridad.',
    },
    {
      label: 'Escalado',
      score: metricScore(metrics, 'Escalado'),
      detail: metricScore(metrics, 'Escalado') >= 8 ? 'Escala muy bien' : metricScore(metrics, 'Escalado') >= 5 ? 'Escalado correcto' : 'Pico de poder corto',
      why: analysis?.winCondition?.label || 'El escalado indica el momento en el que la composición domina.',
    },
    {
      label: 'Ejecución',
      score: executionEaseScore(selectedChampions),
      detail: executionEaseScore(selectedChampions) >= 8 ? 'Más sencilla de ejecutar' : executionEaseScore(selectedChampions) >= 5 ? 'Exige coordinación' : 'Muy exigente de ejecutar',
      why: 'Cuanto más técnica es la composición, más castiga los errores de timing y posicionamiento.',
    },
  ];

  const improvements = buildImprovements(analysis, selectedChampions, overall, confidence, coherence, signals);
  const coverage = [
    {
      label: 'Cobertura',
      score: signalCoverage,
      detail: 'Cuántas piezas clave del análisis quedan bien representadas.',
    },
    {
      label: 'Confianza',
      score: confidence,
      detail: 'Cuánta fiabilidad ofrece el motor sobre esta lectura.',
    },
    {
      label: 'Coherencia',
      score: coherence,
      detail: 'Si identidad, sinergias y win condition encajan entre sí.',
    },
    {
      label: 'Prioridad',
      score: clamp(Math.round((priorities.length / 4) * 100), 0, 100),
      detail: priorities[0] ? `Primera prioridad: ${asText(priorities[0])}` : 'Las prioridades necesitan más orden.',
    },
  ];

  const signalText = overall >= 85
    ? 'La lectura es muy sólida: el motor encuentra identidad, coherencia y una dirección clara.'
    : overall >= 70
      ? 'La lectura es consistente, aunque todavía hay margen para hacerla más ejecutiva.'
      : 'La lectura funciona, pero necesita más claridad y menos fricción entre bloques.';

  return {
    overall,
    grade,
    badge,
    verdictBadge,
    verdictHeadline,
    verdictText,
    summary,
    signals,
    signalText,
    diagnostics,
    improvements,
    coverage,
  };
}

function buildVerdictHeadline(analysis, overall) {
  const identity = analysis?.primaryIdentity || 'Composición';
  if (overall >= 88) return `${identity} muy consistente`;
  if (overall >= 72) return `${identity} bastante estable`;
  if (overall >= 56) return `${identity} jugable pero irregular`;
  return `${identity} necesita ajustes`;
}

function buildVerdictText(analysis, selectedChampions, overall) {
  const lines = [];
  lines.push(analysis?.summaryText || 'La composición se entiende como una historia visual.');
  lines.push(overall >= 85 ? 'Escala bien y controla objetivos.' : overall >= 70 ? 'Tiene una base clara, pero necesita afinar algunas piezas.' : 'Hay una base, pero aún le faltan cohesión y claridad.');
  const carryLine = findChampionByTags(selectedChampions, ['adc', 'carry', 'hypercarry', 'escalado'])?.champion;
  if (carryLine) {
    lines.push(`Necesita proteger a ${carryLine} para maximizar el potencial de daño.`);
  }
  return lines.slice(0, 3).join(' ');
}

function buildImprovements(analysis, selectedChampions, overall, confidence, coherence, signals) {
  const carry = findChampionByTags(selectedChampions, ['adc', 'carry', 'hypercarry'])?.champion;
  const items = [
    {
      label: confidence < 70 ? 'Aclarar la identidad' : 'Identidad bien definida',
      detail: confidence < 70 ? 'El motor aún puede ganar precisión en la lectura principal.' : 'La composición manda una historia clara.',
      tone: confidence < 70 ? 'is-mid' : 'is-good',
    },
    {
      label: coherence < 70 ? 'Reducir conflictos' : 'Coherencia aceptable',
      detail: coherence < 70 ? 'Hay señales que compiten entre sí y conviene afinar la relación entre ellas.' : 'La identidad, la sinergia y la win condition encajan mejor.',
      tone: coherence < 70 ? 'is-mid' : 'is-good',
    },
    {
      label: carry ? `Proteger a ${carry}` : 'Definir la pieza clave',
      detail: carry ? 'Es la pieza que más condiciona el resultado de la composición.' : 'Conviene destacar qué campeón debe recibir la mayor protección.',
      tone: carry ? 'is-good' : 'is-mid',
    },
  ];

  if (overall < 70) {
    items.push({
      label: 'Mejorar el timing',
      detail: 'Forzar peleas o objetivos antes del pico de poder puede romper el plan.',
      tone: 'is-low',
    });
  }

  return items.slice(0, 3 + (overall < 70 ? 1 : 0));
}

function findChampionByTags(selectedChampions, tags = []) {
  return selectedChampions.find((champion) => {
    const values = [champion.champion, champion.identity, champion.function, champion.tempo, ...asArray(champion.strengths), ...asArray(champion.weaknesses)];
    return values.some((value) => tags.some((tag) => normalizeText(asText(value)).includes(normalizeText(tag))));
  }) || null;
}

function renderDiagnosticRow(item) {
  return `
    <div class="composition-assessment__row ${scoreTone(item.score)}">
      <div class="composition-assessment__row-copy">
        <strong>${escapeHtml(item.label)}</strong>
        <p>${escapeHtml(item.detail)}</p>
        <details class="composition-assessment__why">
          <summary>¿Por qué?</summary>
          <p>${escapeHtml(item.why)}</p>
        </details>
      </div>
      <span>${item.score}/10</span>
    </div>
  `;
}

function renderCoverageItem(item) {
  return `
    <div class="composition-assessment__coverage-item ${scoreTone(item.score)}">
      <strong>${escapeHtml(item.label)}</strong>
      <span>${item.score}/100</span>
      <p>${escapeHtml(item.detail)}</p>
    </div>
  `;
}

function damageBalanceScore(damageSplit) {
  const ap = Number(damageSplit?.ap) || 0;
  const ad = Number(damageSplit?.ad) || 0;
  const hybrid = Number(damageSplit?.hybrid) || 0;
  const total = Math.max(1, ap + ad + hybrid);
  const spread = Math.abs(ap - ad) / total;
  return clamp(10 - Math.round(spread * 10) - (hybrid > 0 ? 0 : 1), 1, 10);
}

function damageBalanceText(damageSplit) {
  const ap = Number(damageSplit?.ap) || 0;
  const ad = Number(damageSplit?.ad) || 0;
  const hybrid = Number(damageSplit?.hybrid) || 0;
  if (ap === ad && hybrid > 0) return 'Daño muy equilibrado';
  if (Math.abs(ap - ad) <= 1) return 'Balance de daño correcto';
  return ap > ad ? 'Perfil más cargado a AP' : 'Perfil más cargado a AD';
}

function executionEaseScore(selectedChampions) {
  const complexTerms = ['exigente', 'técnico', 'tecnico', 'difícil', 'dificil', 'caótico', 'caotico', 'mecánico', 'mecanico', 'preciso'];
  const complexityHits = selectedChampions.reduce((total, champion) => {
    const text = [champion.champion, champion.identity, champion.function, champion.tempo, ...(champion.strengths || []), ...(champion.weaknesses || [])].filter(Boolean).join(' ').toLowerCase();
    return total + (complexTerms.some((term) => text.includes(term)) ? 1 : 0);
  }, 0);

  return clamp(10 - complexityHits * 2, 1, 10);
}

function metricScore(metrics, label) {
  const key = normalizeText(label);
  const found = metrics.find((metric) => normalizeText(metric?.label || metric?.key || '') === key);
  return clamp(Math.round(Number(found?.score) || 0), 0, 10) || 5;
}

function scoreTone(score) {
  if (score >= 8) return 'is-good';
  if (score >= 5) return 'is-mid';
  return 'is-low';
}

function toneByGrade(grade) {
  if (grade === 'A+' || grade === 'A') return 'success';
  if (grade === 'B+' || grade === 'B') return 'info';
  return 'danger';
}

function uniqueValues(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asText(value, fallback = 'Sin definir') {
  if (value == null) return fallback;
  if (typeof value === 'string') return value.trim() || fallback;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map((item) => asText(item, '')).filter(Boolean).join(' · ') || fallback;
  if (typeof value === 'object') {
    return asText(
      value.label ?? value.name ?? value.title ?? value.text ?? value.value ?? value.detail ?? value.summary ?? value.reason ?? value.description ?? value.champion ?? value.item ?? '',
      fallback
    );
  }
  return String(value) || fallback;
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