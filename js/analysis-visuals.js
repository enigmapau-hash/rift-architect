import { analyzeComposition } from './analyzer.js';

const DATA_MANIFEST_URL = './data/index.json';
const WORKBOOK_URL = './Draft%20Pool.xlsx';

const ROLE_SOURCES = [
  { key: 'top', label: 'Top', file: './data/top.json', sheet: 'Tabla Top' },
  { key: 'jungle', label: 'Jungla', file: './data/jungle.json', sheet: 'Tabla Jungla' },
  { key: 'mid', label: 'Mid', file: './data/mid.json', sheet: 'Tabla Mid' },
  { key: 'botline', label: 'Botline', file: './data/bot.json', sheet: 'Tabla Botline' },
  { key: 'support', label: 'Support', file: './data/support.json', sheet: 'Tabla Support' },
];

const ROLE_ORDER = ROLE_SOURCES.map(({ key }) => key);
const METRIC_ORDER_PRIMARY = ['frontline', 'engage', 'damage', 'scaling', 'objective', 'control'];
const METRIC_ORDER_SECONDARY = ['teamfight', 'poke', 'mobility', 'pick', 'splitpush'];
const METRIC_META = {
  frontline: { icon: '🛡', hint: 'Aguantar la pelea' },
  engage: { icon: '⚔', hint: 'Iniciar o cazar' },
  damage: { icon: '💥', hint: 'Aportar daño' },
  scaling: { icon: '📈', hint: 'Rinde mejor con el tiempo' },
  objective: { icon: '🎯', hint: 'Ayuda en objetivos' },
  control: { icon: '🧠', hint: 'Control de zona y utilidad' },
  teamfight: { icon: '🤝', hint: 'Pelear agrupados' },
  poke: { icon: '🏹', hint: 'Molestar a distancia' },
  mobility: { icon: '🌀', hint: 'Moverse y reposicionarse' },
  pick: { icon: '🪝', hint: 'Castigar errores' },
  splitpush: { icon: '🛣', hint: 'Presión lateral' },
};

const state = {
  data: null,
  loading: false,
  lastSignature: '',
  observer: null,
};

let refreshQueued = false;

init().catch(() => {});

async function init() {
  await loadData();
  observeDraftChanges();
  scheduleRefresh();
}

function observeDraftChanges() {
  if (state.observer) return;

  const compositionGrid = document.getElementById('compositionGrid');
  if (!compositionGrid) {
    window.requestAnimationFrame(observeDraftChanges);
    return;
  }

  state.observer = new MutationObserver(() => scheduleRefresh());
  state.observer.observe(compositionGrid, { childList: true, subtree: true, characterData: true });
}

function scheduleRefresh() {
  if (refreshQueued) return;
  refreshQueued = true;

  window.requestAnimationFrame(() => {
    refreshQueued = false;
    renderAnalysisBoard();
  });
}

async function renderAnalysisBoard() {
  const analysisSummary = document.getElementById('analysisSummary');
  if (!analysisSummary) return;

  const data = await loadData();
  if (!data) {
    analysisSummary.innerHTML = '<p class="analysis-note">No he podido cargar los datos del Excel.</p>';
    analysisSummary.dataset.visualReady = '1';
    return;
  }

  const selectedSlots = getSelectedSlots();
  const selectedChampions = resolveSelectedChampions(selectedSlots, data);
  const signature = selectedChampions.map((champion) => champion.champion).join('|');
  if (signature === state.lastSignature && analysisSummary.dataset.visualReady === '1') {
    return;
  }
  state.lastSignature = signature;

  if (!selectedChampions.length) {
    analysisSummary.innerHTML = '<p class="analysis-note">Selecciona campeones para ver un análisis visual breve.</p>';
    analysisSummary.dataset.visualReady = '1';
    return;
  }

  const analysis = analyzeComposition(selectedChampions);
  const strongest = [...analysis.metrics].sort((a, b) => b.score - a.score)[0] || { label: 'Sin datos', score: 0 };
  const weakest = [...analysis.metrics].sort((a, b) => a.score - b.score)[0] || { label: 'Sin datos', score: 0 };
  const winCondition = getWinCondition(analysis.metrics);
  const selectedCount = selectedChampions.length;

  analysisSummary.innerHTML = `
    <div class="analysis-board">
      <section class="analysis-overview">
        <article class="analysis-overview-main">
          <p class="analysis-kicker">Composición</p>
          <h4>${escapeHtml(winCondition)}</h4>
          <p>${escapeHtml(analysis.summaryText)}</p>
        </article>
        <div class="analysis-overview-side">
          <div class="analysis-mini-card">
            <span>Fuerte</span>
            <strong>${escapeHtml(strongest.label)}</strong>
            <small>${escapeHtml(getLevelLabel(strongest.score))}</small>
          </div>
          <div class="analysis-mini-card">
            <span>Débil</span>
            <strong>${escapeHtml(weakest.label)}</strong>
            <small>${escapeHtml(getLevelLabel(weakest.score))}</small>
          </div>
          <div class="analysis-mini-card">
            <span>Progreso</span>
            <strong>${selectedCount}/5</strong>
            <small>${escapeHtml(selectedCount === 5 ? 'Composición completa' : `Faltan ${5 - selectedCount} picks`)}</small>
          </div>
        </div>
      </section>

      ${renderMetricSection('Claves', 'Lo que sostiene tu composición', METRIC_ORDER_PRIMARY, analysis)}
      ${renderMetricSection('Más', 'Detalles que completan el plan', METRIC_ORDER_SECONDARY, analysis)}
    </div>
  `;
  analysisSummary.dataset.visualReady = '1';
}

function renderMetricSection(title, subtitle, keys, analysis) {
  const cards = keys.map((key) => renderMetricCard(key, analysis)).join('');
  const className = keys.length === METRIC_ORDER_PRIMARY.length ? 'analysis-grid--primary' : 'analysis-grid--secondary';

  return `
    <section class="analysis-section">
      <div class="analysis-section__header">
        <div>
          <p class="analysis-section__kicker">${escapeHtml(title)}</p>
          <h5>${escapeHtml(subtitle)}</h5>
        </div>
      </div>
      <div class="analysis-grid ${className}">
        ${cards}
      </div>
    </section>
  `;
}

function renderMetricCard(metricKey, analysis) {
  const metric = analysis.metrics.find((item) => item.key === metricKey);
  if (!metric) return '';

  const meta = METRIC_META[metricKey] || { icon: '•', hint: 'Aporte general' };
  const level = getLevelLabel(metric.score);
  const tone = getLevelTone(metric.score);
  const contributors = getContributors(metricKey, analysis).slice(0, 2);
  const bars = buildBars(metric.score);

  return `
    <article class="analysis-card analysis-card--${tone}">
      <div class="analysis-card__head">
        <div class="analysis-card__icon" aria-hidden="true">${meta.icon}</div>
        <div class="analysis-card__content">
          <div class="analysis-card__title-row">
            <h4>${escapeHtml(metric.label)}</h4>
            <span class="analysis-pill analysis-pill--${tone}">${escapeHtml(level)}</span>
          </div>
          <p class="analysis-card__hint">${escapeHtml(meta.hint)}</p>
        </div>
      </div>

      <div class="analysis-meter" aria-hidden="true">
        ${bars.map((filled) => `<span class="${filled ? 'is-filled' : ''}"></span>`).join('')}
      </div>

      <div class="analysis-card__contributors">
        <p class="analysis-card__label">Aportan</p>
        <div class="analysis-chip-list">
          ${contributors.length
            ? contributors.map((champion) => `<span class="analysis-chip">${escapeHtml(champion)}</span>`).join('')
            : '<span class="analysis-chip is-muted">Sin aporte claro</span>'}
        </div>
      </div>
    </article>
  `;
}

function getContributors(metricKey, analysis) {
  return analysis.profiles
    .map(({ champion, profile }) => ({
      champion,
      score: profile.metrics.find((metric) => metric.key === metricKey)?.score ?? 0,
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.champion.localeCompare(b.champion, 'es'))
    .map((item) => item.champion);
}

function buildBars(score) {
  const filled = Math.max(1, Math.min(5, Math.round(score / 2)));
  return Array.from({ length: 5 }, (_, index) => index < filled);
}

function getLevelLabel(score) {
  if (score >= 7) return 'Alto';
  if (score >= 4) return 'Medio';
  return 'Bajo';
}

function getLevelTone(score) {
  if (score >= 7) return 'high';
  if (score >= 4) return 'mid';
  return 'low';
}

function getWinCondition(metrics) {
  const teamfight = getMetricScore(metrics, 'teamfight');
  const scaling = getMetricScore(metrics, 'scaling');
  const poke = getMetricScore(metrics, 'poke');
  const splitpush = getMetricScore(metrics, 'splitpush');
  const pick = getMetricScore(metrics, 'pick');
  const engage = getMetricScore(metrics, 'engage');
  const objective = getMetricScore(metrics, 'objective');

  if (splitpush >= 7) return 'Splitpush / side lanes';
  if (poke >= 7) return 'Poke / siege';
  if (pick >= 7 && engage >= 6) return 'Pick / skirmish';
  if (objective >= 7 && teamfight >= 6) return 'Objetivos / front-to-back';
  if (teamfight >= 7 && scaling >= 6) return 'Teamfight 5v5';
  if (engage >= 7) return 'All-in / engage';
  return 'Teamfight 5v5';
}

function getMetricScore(metrics, key) {
  return metrics.find((metric) => metric.key === key)?.score ?? 0;
}

async function loadData() {
  if (state.data || state.loading) return state.data;

  state.loading = true;
  try {
    const jsonData = await loadJsonData();
    if (jsonData) {
      state.data = jsonData;
      state.lastSignature = '';
      return state.data;
    }

    const workbookData = await loadWorkbookData();
    state.data = workbookData;
    state.lastSignature = '';
    return state.data;
  } catch {
    state.data = null;
    state.lastSignature = '';
    return null;
  } finally {
    state.loading = false;
  }
}

async function loadJsonData() {
  try {
    const response = await fetch(DATA_MANIFEST_URL, { cache: 'reload' });
    if (!response.ok) return null;

    const manifest = await response.json();
    if (!Array.isArray(manifest?.files) || !manifest.files.length) return null;

    const loaded = await Promise.all(
      ROLE_SOURCES.map(async ({ key, file }) => {
        const fileResponse = await fetch(file, { cache: 'reload' });
        if (!fileResponse.ok) throw new Error(`No se pudo leer ${file}`);
        return [key, await fileResponse.json()];
      })
    );

    return Object.fromEntries(loaded);
  } catch {
    return null;
  }
}

async function loadWorkbookData() {
  if (!window.XLSX) return null;

  const response = await fetch(WORKBOOK_URL, { cache: 'reload' });
  if (!response.ok) return null;

  const workbook = window.XLSX.read(await response.arrayBuffer(), { type: 'array' });
  const dataset = {};

  ROLE_SOURCES.forEach(({ key, sheet }) => {
    dataset[key] = worksheetToRows(workbook.Sheets[sheet]);
  });

  return dataset;
}

function worksheetToRows(worksheet) {
  if (!worksheet) return [];

  const rows = window.XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    blankrows: false,
    defval: '',
  });

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
  return String(value).split('·').map((part) => part.trim()).filter(Boolean);
}

function getSelectedSlots() {
  return [...document.querySelectorAll('#compositionGrid .slot.filled')]
    .map((button) => ({
      role: normalizeRole(button.dataset.role),
      champion: button.querySelector('strong')?.textContent?.trim() || '',
    }))
    .filter((slot) => slot.role && slot.champion);
}

function resolveSelectedChampions(selectedSlots, data) {
  return selectedSlots
    .map((slot) => {
      const champion = (data[slot.role] || []).find(
        (entry) => entry.champion.toLowerCase() === slot.champion.toLowerCase()
      );
      return champion ? { role: slot.role, ...champion } : null;
    })
    .filter(Boolean);
}

function normalizeRole(role) {
  return ROLE_ORDER.includes(role) ? role : 'top';
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
