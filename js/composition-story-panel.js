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

const ROLE_ORDER = ROLE_FILES.map(({ key }) => key);
const ROLE_LABELS = Object.fromEntries(ROLE_FILES.map(({ key, sheet }) => [key, sheet.replace(/^Tabla\s+/i, '')]));

const state = {
  data: new Map(),
  loaded: false,
  patchScheduled: false,
};

const els = { root: null };

init().catch((error) => console.error(error));

async function init() {
  els.root = document.getElementById('storyView');
  if (!els.root) return;

  await loadRoleData();
  observeComposition();
  renderStory();
}

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
  const score = Number.isFinite(Number(item?.score)) ? Math.round(Number(item.score)) : null;
  return { label, detail, score };
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

function findChampionByTags(selectedChampions, tags = []) {
  return selectedChampions.find((champion) => {
    const values = [champion.champion, champion.identity, champion.function, champion.tempo, ...asArray(champion.strengths), ...asArray(champion.weaknesses)];
    return values.some((value) => tags.some((tag) => normalizeText(asText(value)).includes(normalizeText(tag))));
  });
}

function buildProfile(selectedChampions) {
  const profiles = [
    { key: 'engage', label: 'Engage', keywords: ['engage', 'iniciacion', 'iniciación', 'start', 'iniciar'], hint: 'Iniciación y cazadas.' },
    { key: 'peel', label: 'Peel', keywords: ['peel', 'protect', 'shield', 'save', 'disengage'], hint: 'Protección del carry.' },
    { key: 'scaling', label: 'Escalado', keywords: ['scale', 'scaling', 'escalado', 'late'], hint: 'Ventaja en juego medio/tardío.' },
    { key: 'frontline', label: 'Frontline', keywords: ['frontline', 'tank', 'tanque', 'front'], hint: 'Capacidad de aguantar peleas.' },
    { key: 'mobility', label: 'Movilidad', keywords: ['mobility', 'movilidad', 'dash', 'roam', 'move'], hint: 'Rotaciones y flancos.' },
    { key: 'cc', label: 'CC', keywords: ['cc', 'stun', 'root', 'knock', 'slow', 'control'], hint: 'Control para fijar objetivos.' },
  ];

  const sources = selectedChampions.flatMap((champion) => [champion.champion, champion.identity, champion.function, champion.tempo, ...asArray(champion.strengths), ...asArray(champion.weaknesses)]);

  return profiles
    .map((profile) => {
      const matches = sources.reduce((total, value) => {
        const normalized = normalizeText(asText(value));
        return total + (profile.keywords.some((keyword) => normalized.includes(normalizeText(keyword))) ? 1 : 0);
      }, 0);

      const score = Math.max(0, Math.min(10, Math.round((matches / Math.max(2, selectedChampions.length)) * 6 + (matches > 2 ? 3 : 0))));
      return {
        label: profile.label,
        score,
        detail: profile.hint,
        high: score >= 8,
        medium: score >= 5 && score < 8,
      };
    })
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label, 'es'));
}

function buildStoryModel(analysis, selectedChampions) {
  const strengths = asArray(analysis?.strengths).slice(0, 2).map(normalizeEntry);
  const weaknesses = asArray(analysis?.weaknesses).slice(0, 2).map(normalizeEntry);
  const plan = asArray(analysis?.gamePlan).slice(0, 3).map((step) => asText(step));
  const phases = asArray(analysis?.tempoDetail?.phases).slice(0, 3).map((phase) => asText(phase));
  const tempo = analysis?.tempoDetail?.label || analysis?.tempo || 'tu ventana natural de poder';
  const coach = analysis?.coach || analysis?.assistant || {};
  const advisor = analysis?.advisor || analysis?.assistant || {};
  const engager = findChampionByTags(selectedChampions, ['engage', 'iniciación', 'iniciacion', 'frontline', 'start']);
  const carry = findChampionByTags(selectedChampions, ['adc', 'carry', 'hypercarry', 'escalado']);
  const protector = findChampionByTags(selectedChampions, ['peel', 'protect', 'shield']);
  const frontline = findChampionByTags(selectedChampions, ['frontline', 'tanque', 'front', 'defensa']);
  const keyPiece = carry || engager || protector || frontline || selectedChampions[0] || null;

  const coherence = Number.isFinite(Number(analysis?.coherence?.score))
    ? Number(analysis.coherence.score)
    : Number.isFinite(Number(analysis?.confidence))
      ? Number(analysis.confidence)
      : 0;
  const roleCoverage = Math.round((new Set(asArray(selectedChampions).map((champion) => champion.role).filter(Boolean)).size / ROLE_FILES.length) * 100);
  const score = Math.max(0, Math.min(100, Math.round((coherence * 0.65) + (roleCoverage * 0.2) + (Math.max(40, 100 - weaknesses.length * 14) * 0.15))));
  const grade = gradeFromScore(score);
  const difficulty = score >= 86 ? 'Baja' : score >= 72 ? 'Media' : 'Alta';

  const objectivePriority = uniqueValues(asArray(advisor.objectivePriority).slice(0, 3).map((item) => asText(item))).filter(Boolean);
  const loseConditions = uniqueValues(asArray(advisor.loseConditions).slice(0, 3).map((item) => asText(item))).filter(Boolean);

  const priorities = [
    objectivePriority[0] || plan[0] || 'Ganar tempo y visión',
    objectivePriority[1] || plan[1] || 'Agruparte en tu ventana de poder',
    keyPiece ? `Cuidar a ${keyPiece.champion}` : 'Proteger tu pieza clave',
  ].filter(Boolean);

  const avoid = uniqueValues([
    loseConditions[0] || weaknesses[0]?.label || 'Iniciar sin visión',
    loseConditions[1] || weaknesses[1]?.label || 'Dividir el equipo sin motivo',
    loseConditions[2] || 'Forzar peleas antes del pico de poder',
  ].filter(Boolean)).slice(0, 3);

  const summaryText = analysis?.summaryText || 'La composición se entiende como una historia visual: qué es, cómo gana, qué debe evitar y cuál es su plan de partida.';
  const whyItems = [
    analysis?.primaryIdentity || 'Identidad no definida',
    analysis?.winCondition?.label || 'Win condition no definida',
    analysis?.coherence?.label || 'Coherencia no definida',
  ].filter(Boolean);

  return {
    score,
    grade,
    difficulty,
    identity: analysis?.primaryIdentity || 'Sin identidad clara',
    summaryText,
    win: analysis?.winCondition?.detail || analysis?.winCondition?.label || 'Escala y gana la pelea correcta en tu ventana de poder.',
    tempo,
    phases,
    priorities,
    avoid,
    keyPiece,
    strengths,
    weaknesses,
    coach,
    advisor,
    whyItems,
    topMetric: uniqueValues((analysis?.metrics || []).map((metric) => asText(metric?.label)).filter(Boolean)).slice(0, 4),
    quickCoach: asText(coach.headline || coach.summary || 'Juega alrededor de tu identidad.'),
    profile: buildProfile(selectedChampions),
  };
}

function renderHero(model) {
  return `
    <article class="design-system-card design-system-card--hero">
      <div class="design-system-card__header">
        <span class="design-system-badge">Tu composición</span>
        <span class="design-system-badge design-system-badge--muted">Home wireframe</span>
      </div>

      <h3 class="design-system-card__title">${escapeHtml(model.identity)}</h3>
      <p class="design-system-card__copy">${escapeHtml(model.summaryText)}</p>
      <p class="design-system-card__reason">${escapeHtml(model.win)}</p>

      <div class="design-system-chip-row">
        <article class="design-system-chip is-primary">
          <span class="design-system-chip__label">Cómo ganas</span>
          <strong class="design-system-chip__value">${escapeHtml(model.win)}</strong>
        </article>
        <article class="design-system-chip">
          <span class="design-system-chip__label">Prioridad</span>
          <strong class="design-system-chip__value">${escapeHtml(model.priorities[0] || 'Gana tempo y visión')}</strong>
        </article>
        <article class="design-system-chip is-warning">
          <span class="design-system-chip__label">Evita</span>
          <strong class="design-system-chip__value">${escapeHtml(model.avoid[0] || 'Forzar peleas malas')}</strong>
        </article>
      </div>
    </article>
  `;
}

function renderDetail(model) {
  const detailRows = [
    {
      label: 'Por qué',
      text: model.quickCoach || 'Juega alrededor de tu identidad.',
      note: model.whyItems.join(' · '),
    },
    {
      label: 'Pieza clave',
      text: model.keyPiece ? `${model.keyPiece.champion} es la pieza que más condiciona el resultado.` : 'No hay una pieza clave clara todavía.',
      note: model.keyPiece ? [model.keyPiece.function, model.keyPiece.identity, model.keyPiece.tempo].filter(Boolean).join(' · ') : '',
    },
    {
      label: 'Plan por fases',
      text: model.phases.length ? model.phases.join(' · ') : model.tempo,
      note: 'Early · Mid · Late',
    },
  ];

  return `
    <details class="design-system-card design-system-card--detail">
      <summary class="design-system-card__summary">
        <strong>Ver análisis completo</strong>
        <span>${model.score}/100 · ${model.grade}</span>
      </summary>

      <div class="analysis-hub__assistant-list">
        <article class="analysis-hub__row analysis-hub__row--executive">
          <div class="analysis-hub__row-copy">
            <strong>Por qué</strong>
            <p>${escapeHtml(model.quickCoach)}</p>
          </div>
          <span class="analysis-hub__assistant-score">${escapeHtml(model.difficulty)}</span>
        </article>

        ${detailRows
          .map(
            (item) => `
              <article class="analysis-hub__row">
                <div class="analysis-hub__row-copy">
                  <strong>${escapeHtml(item.label)}</strong>
                  <p>${escapeHtml(item.text)}</p>
                  ${item.note ? `<p class="analysis-hub__row-note">${escapeHtml(item.note)}</p>` : ''}
                </div>
              </article>
            `,
          )
          .join('')}

        <article class="analysis-hub__row">
          <div class="analysis-hub__row-copy">
            <strong>Fortalezas</strong>
            <p>${escapeHtml(model.strengths.map((item) => item.label).join(' · ') || 'Sin fortalezas claras.')}</p>
          </div>
        </article>

        <article class="analysis-hub__row">
          <div class="analysis-hub__row-copy">
            <strong>Riesgos</strong>
            <p>${escapeHtml(model.weaknesses.map((item) => item.label).join(' · ') || 'Sin riesgos claros.')}</p>
          </div>
        </article>

        <article class="analysis-hub__row">
          <div class="analysis-hub__row-copy">
            <strong>Qué debes evitar</strong>
            <p>${escapeHtml(model.avoid.join(' · ') || 'Evita pelear sin visión ni prioridad.')}</p>
          </div>
        </article>
      </div>
    </details>
  `;
}

function renderStory() {
  if (!els.root) return;

  const selectedChampions = collectSelectedChampions();
  if (selectedChampions.length < 5) {
    els.root.innerHTML = `
      <section class="composition-story composition-story--empty">
        <p class="eyebrow">Composition Story</p>
        <h3>Selecciona cinco campeones para ver la home wireframe</h3>
        <p>La pantalla principal reducirá ruido y mostrará solo la decisión principal, con la explicación completa plegada debajo.</p>
      </section>
    `;
    return;
  }

  const analysis = analyzeComposition(selectedChampions);
  const model = buildStoryModel(analysis, selectedChampions);

  els.root.innerHTML = `
    <section class="composition-story composition-story--wireframe">
      ${renderHero(model)}
      ${renderDetail(model)}
    </section>
  `;
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
    renderStory();
  });
}
