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

const ROOT_ID = 'healthView';
const SELECTOR = '#compositionGrid .slot.is-filled';

const state = {
  root: null,
  scheduled: false,
  observer: null,
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
  return rows.slice(1).filter((row) => row[0]).map((row) => ({
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
  return String(value).split('·').map((part) => part.trim()).filter(Boolean);
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
          <p class="eyebrow">Sprint 11B · Intelligent Analysis</p>
          <h4>Índice de salud de la composición</h4>
          <p>${escapeHtml(model.summary)}</p>
          <div class="composition-health__verdict">
            <span class="story-pill story-pill--${toneByGrade(model.grade)}">${escapeHtml(model.verdictBadge)}</span>
            <strong>${escapeHtml(model.verdictHeadline)}</strong>
            <p>${escapeHtml(model.verdictText)}</p>
          </div>
        </div>

        <div class="composition-health__score-card ${scoreTone(model.overall)}">
          <span class="composition-health__score-kicker">Salud</span>
          <strong>${model.grade} · ${model.overall}</strong>
          <span>${escapeHtml(model.summaryBadge)}</span>
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

        <article class="composition-health__card composition-health__card--priorities">
          <span class="composition-health__card-kicker">Prioridades dinámicas</span>
          <div class="composition-health__priority-list">
            ${model.priorityItems.map(renderPriorityItem).join('')}
          </div>
        </article>

        <article class="composition-health__card composition-health__card--win">
          <span class="composition-health__card-kicker">Condición de victoria</span>
          <strong>${escapeHtml(model.winTitle)}</strong>
          <p>${escapeHtml(model.winText)}</p>
          <details class="composition-health__why">
            <summary>¿Por qué?</summary>
            <p>${escapeHtml(model.winWhy)}</p>
          </details>
          <div class="composition-health__chip-list">
            ${model.winChips.map((chip) => `<span class="story-pill story-pill--success">${escapeHtml(chip)}</span>`).join('')}
          </div>
        </article>

        <article class="composition-health__card composition-health__card--risk">
          <span class="composition-health__card-kicker">Mayor error castigado</span>
          <strong>${escapeHtml(model.errorTitle)}</strong>
          <p>${escapeHtml(model.errorText)}</p>
          <div class="composition-health__risk-impact">
            <span class="composition-health__risk-label">Impacto</span>
            <strong>${'★'.repeat(model.errorImpact)}${'☆'.repeat(5 - model.errorImpact)}</strong>
          </div>
          <details class="composition-health__why">
            <summary>¿Por qué?</summary>
            <p>${escapeHtml(model.errorWhy)}</p>
          </details>
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

function buildHealthModel(analysis, selectedChampions) {
  const metrics = Array.isArray(analysis?.metrics) ? analysis.metrics : [];
  const synergyScore = computeSynergyScore(analysis?.synergies);
  const damageBalance = computeDamageBalance(analysis?.damageSplit);
  const executionEase = computeExecutionEase(selectedChampions);
  const identityScore = clamp(Math.round((Number(analysis?.confidence) || 0) / 10), 1, 10);
  const frontlineScore = metricScore(metrics, 'Frontline');
  const scalingScore = metricScore(metrics, 'Escalado');
  const controlScore = metricScore(metrics, 'Control');
  const engageScore = metricScore(metrics, 'Engage');
  const mobilityScore = metricScore(metrics, 'Movilidad');
  const overall = Math.round((identityScore * 2 + synergyScore * 2 + damageBalance * 1.5 + frontlineScore * 1.5 + scalingScore * 1.5 + executionEase * 1.5) / 10);
  const grade = gradeFromScore(overall);
  const summaryBadge = overall >= 85 ? 'Muy sólido' : overall >= 70 ? 'Jugable' : 'Exige ajustes';
  const verdictBadge = overall >= 85 ? 'Veredicto claro' : overall >= 70 ? 'Veredicto estable' : 'Veredicto frágil';
  const summary = analysis?.advisor?.summary?.reason || analysis?.summaryText || 'El índice resume si la composición tiene identidad clara, sinergia suficiente y una condición de victoria entendible.';

  const verdictHeadline = buildVerdictHeadline(analysis, overall);
  const verdictText = buildVerdictText(analysis, selectedChampions, overall);

  const healthRows = [
    {
      label: 'Identidad',
      score: identityScore,
      detail: analysis?.primaryIdentity || 'Sin identidad clara',
      why: analysis?.summaryText || 'La identidad principal del draft manda el resto del análisis.',
    },
    {
      label: 'Sinergia',
      score: synergyScore,
      detail: analysis?.synergies?.[0]?.label || 'Sin sinergias destacadas',
      why: `La sinergia más fuerte condiciona el plan de pelea: ${analysis?.synergies?.[0]?.label || 'no hay una sinergia dominante detectada'}.`,
    },
    {
      label: 'Balance de daño',
      score: damageBalance,
      detail: damageBalance >= 8 ? 'Buena mezcla de daño' : damageBalance >= 5 ? 'Requiere compensar el perfil de daño' : 'Muy cargada a un único tipo de daño',
      why: `El reparto AP/AD actual deja un balance de daño ${damageBalance >= 8 ? 'sólido' : damageBalance >= 5 ? 'aceptable pero mejorable' : 'demasiado concentrado'}.`,
    },
    {
      label: 'Frontline',
      score: frontlineScore,
      detail: frontlineScore >= 8 ? 'Tienes espacio para pelear' : frontlineScore >= 5 ? 'Frontline aceptable' : 'Falta línea frontal',
      why: 'La frontline determina cuánto tiempo gana tu carry para pegar en peleas largas.',
    },
    {
      label: 'Escalado',
      score: scalingScore,
      detail: scalingScore >= 8 ? 'Escala muy bien' : scalingScore >= 5 ? 'Escalado correcto' : 'Pico de poder más corto',
      why: analysis?.winCondition?.label || 'El escalado marca el momento en el que la composición domina el mapa.',
    },
    {
      label: 'Ejecución',
      score: executionEase,
      detail: executionEase >= 8 ? 'Más sencilla de ejecutar' : executionEase >= 5 ? 'Exige coordinación' : 'Muy exigente de ejecutar',
      why: 'Cuanto más técnica es la composición, más castiga los errores de posicionamiento y timing.',
    },
  ];

  const profileBars = [
    { label: 'Engage', score: engageScore, detail: 'Cómo de fácil es iniciar la pelea correcta.', why: 'El engage mide la capacidad de forzar la pelea en tus términos.' },
    { label: 'Peel', score: Math.round((frontlineScore + controlScore + metricScore(metrics, 'Teamfight')) / 3), detail: 'Protección del carry y control del espacio.', why: 'El peel depende de cuánto espacio puedes crear para tu pieza clave.' },
    { label: 'Escalado', score: scalingScore, detail: 'Cuánto mejora la composición con objetos y tiempo.', why: 'El escalado sube cuando el draft aprovecha mejor el juego medio y tardío.' },
    { label: 'Frontline', score: frontlineScore, detail: 'Capacidad de aguantar la entrada inicial.', why: 'Sin frontline el carry no tiene tiempo para convertir la pelea.' },
    { label: 'Movilidad', score: mobilityScore, detail: 'Rotaciones, flancos y reposicionamiento.', why: 'La movilidad indica si el equipo puede llegar antes y reposicionarse mejor.' },
    { label: 'CC', score: controlScore, detail: 'Control útil para fijar objetivos y peleas.', why: 'El CC convierte una buena lectura en una pelea cerrada.' },
  ].sort((a, b) => b.score - a.score || a.label.localeCompare(b.label, 'es'));

  const priorities = buildPriorities(analysis, selectedChampions);
  const winTitle = analysis?.advisor?.summary?.priority || analysis?.winCondition?.label || 'Jugar alrededor de tu identidad';
  const winText = analysis?.winCondition?.detail || analysis?.advisor?.summary?.reason || 'La composición gana si llega al momento adecuado, protege la pieza clave y convierte esa ventana en una pelea ordenada.';
  const winChips = uniqueValues([analysis?.advisor?.summary?.identity, analysis?.advisor?.summary?.powerSpike, analysis?.tempoDetail?.label, analysis?.primaryIdentity]);
  const error = analysis?.advisor?.loseConditions?.[0] || analysis?.winCondition?.avoid?.[0] || null;
  const errorTitle = error?.label || 'Forzar el timing equivocado';
  const errorText = error?.detail || 'Si fuerzas peleas antes del pico de poder, pierdes gran parte del valor del draft.';
  const errorImpact = computeRiskImpact(errorTitle, errorText, overall);
  const errorChips = uniqueValues([analysis?.advisor?.summary?.risk, analysis?.coherence?.label, analysis?.weaknesses?.[0]?.label]);
  const errorWhy = buildRiskWhy(errorTitle, errorText, analysis);

  return {
    overall: clamp(overall, 0, 100),
    grade,
    summaryBadge,
    summary,
    verdictBadge,
    verdictHeadline,
    verdictText,
    healthRows,
    profileBars,
    priorityItems: priorities,
    winTitle,
    winText,
    winWhy: buildVictoryWhy(analysis, selectedChampions, priorities),
    winChips,
    errorTitle,
    errorText,
    errorImpact,
    errorWhy,
    errorChips,
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

function buildPriorities(analysis, selectedChampions) {
  const raw = asArray(analysis?.advisor?.objectivePriority).slice(0, 4).map((item, index) => ({
    label: asText(item),
    detail: priorityDetail(asText(item), analysis, index),
    rank: index + 1,
    weight: 5 - index,
  })).filter((item) => item.label);

  if (raw.length) return raw;

  const fallback = [
    analysis?.winCondition?.label || analysis?.primaryIdentity || 'Jugar alrededor de la identidad',
    analysis?.winCondition?.detail || 'Convertir la ventaja en una pelea favorable',
    findChampionByTags(selectedChampions, ['carry', 'adc', 'hypercarry'])?.champion ? `Proteger a ${findChampionByTags(selectedChampions, ['carry', 'adc', 'hypercarry']).champion}` : null,
  ].filter(Boolean);

  return fallback.map((label, index) => ({
    label,
    detail: priorityDetail(label, analysis, index),
    rank: index + 1,
    weight: 5 - index,
  }));
}

function priorityDetail(label, analysis, index) {
  const normalized = normalizeText(label);
  if (normalized.includes('teamfight') || normalized.includes('5v5')) return 'Convierte la ventaja en pelea ordenada.';
  if (normalized.includes('objetiv') || normalized.includes('objective')) return 'Prioriza dragones, Heraldo o Barón según el momento.';
  if (normalized.includes('pick') || normalized.includes('catch')) return 'Busca visión y castiga errores rápidos.';
  if (normalized.includes('splitpush') || normalized.includes('sidelane')) return 'Abre mapa y obliga respuestas en laterales.';
  if (normalized.includes('poke') || normalized.includes('siege')) return 'Desgasta antes de comprometer la pelea.';
  if (index === 0) return analysis?.winCondition?.detail || 'Debe ser la primera decisión del plan.';
  return 'Se apoya en la condición de victoria general del draft.';
}

function buildVictoryWhy(analysis, selectedChampions, priorities) {
  const powerSpike = analysis?.advisor?.summary?.powerSpike || analysis?.tempoDetail?.label || 'tu ventana natural de poder';
  const carry = findChampionByTags(selectedChampions, ['adc', 'carry', 'hypercarry', 'escalado'])?.champion;
  const objective = priorities[0]?.label || analysis?.winCondition?.label || 'objetivos';
  return `Tu composición gana cuando llega a ${powerSpike}, mantiene la pelea agrupada y convierte prioridad en ${objective}. ${carry ? `Proteger a ${carry} hace que el plan funcione con mucha más fiabilidad.` : ''}`.trim();
}

function buildRiskWhy(title, detail, analysis) {
  const tempo = analysis?.tempoDetail?.label || 'el momento correcto';
  const risk = normalizeText(title);
  if (risk.includes('pelea') || risk.includes('fight')) return `La composición pierde mucho valor si entra en peleas fuera de ${tempo}. ${detail}`;
  if (risk.includes('carry') || risk.includes('frontline')) return `Separar la frontline del carry rompe la estructura de la composición. ${detail}`;
  if (risk.includes('visión') || risk.includes('vision')) return `Sin visión, la composición se ve obligada a reaccionar y no a decidir. ${detail}`;
  return detail;
}

function renderHealthRow(item) {
  const tone = scoreTone(item.score);
  return `
    <div class="composition-health__row ${tone}">
      <div class="composition-health__row-copy">
        <strong>${escapeHtml(item.label)}</strong>
        <p>${escapeHtml(item.detail)}</p>
        <details class="composition-health__why">
          <summary>¿Por qué?</summary>
          <p>${escapeHtml(item.why)}</p>
        </details>
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
      <p>${escapeHtml(item.detail)}</p>
      <details class="composition-health__why">
        <summary>¿Por qué?</summary>
        <p>${escapeHtml(item.why)}</p>
      </details>
    </div>
  `;
}

function renderPriorityItem(item) {
  return `
    <div class="composition-health__priority-item">
      <span class="composition-health__priority-rank">${String(item.rank).padStart(2, '0')}</span>
      <div class="composition-health__priority-copy">
        <strong>${escapeHtml(item.label)}</strong>
        <p>${escapeHtml(item.detail)}</p>
      </div>
      <span class="composition-health__priority-weight">${item.weight}/5</span>
    </div>
  `;
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

function computeRiskImpact(title, detail, overall) {
  const text = normalizeText(`${title} ${detail}`);
  const keywords = ['frontline', 'carry', 'peel', 'vision', 'power', 'timing', 'objective', 'teamfight', 'pelea'];
  let base = 3 + Math.round((100 - overall) / 30);
  if (keywords.some((term) => text.includes(term))) base += 1;
  return clamp(base, 1, 5);
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
