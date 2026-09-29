import { analyzeComposition } from './analyzer.js';

const WORKBOOK_URL = './Draft%20Pool.xlsx';
const DATA_MANIFEST_URL = './data/index.json';

const ROLE_SOURCES = [
  { key: 'top', label: 'Top', file: './data/top.json', sheet: 'Tabla Top' },
  { key: 'jungle', label: 'Jungla', file: './data/jungle.json', sheet: 'Tabla Jungla' },
  { key: 'mid', label: 'Mid', file: './data/mid.json', sheet: 'Tabla Mid' },
  { key: 'botline', label: 'Botline', file: './data/bot.json', sheet: 'Tabla Botline' },
  { key: 'support', label: 'Support', file: './data/support.json', sheet: 'Tabla Support' },
];

const ROLE_LABELS = Object.fromEntries(ROLE_SOURCES.map(({ key, label }) => [key, label]));

const state = {
  activeRole: 'top',
  search: '',
  data: {},
  selected: {
    top: null,
    jungle: null,
    mid: null,
    botline: null,
    support: null,
  },
  dataLoaded: false,
  loading: false,
  dataSource: 'excel',
};

const els = {};

init();

async function init() {
  cacheElements();
  bindEvents();
  await loadData();
  renderAll();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  }
}

function cacheElements() {
  els.statusBadge = document.getElementById('statusBadge');
  els.activeRoleLabel = document.getElementById('activeRoleLabel');
  els.roleTabs = document.getElementById('roleTabs');
  els.searchInput = document.getElementById('searchInput');
  els.championList = document.getElementById('championList');
  els.compositionGrid = document.getElementById('compositionGrid');
  els.analysisSummary = document.getElementById('analysisSummary');
  els.recommendations = document.getElementById('recommendations');
  els.clearBtn = document.getElementById('clearBtn');
  els.refreshBtn = document.getElementById('refreshBtn');
}

function bindEvents() {
  els.searchInput.addEventListener('input', (event) => {
    state.search = event.target.value.trim().toLowerCase();
    renderChampionList();
  });

  els.clearBtn.addEventListener('click', () => {
    Object.keys(state.selected).forEach((role) => {
      state.selected[role] = null;
    });
    renderAll();
  });

  els.refreshBtn.addEventListener('click', async () => {
    await loadData(true);
    renderAll();
  });
}

async function loadData(force = false) {
  if (state.loading) return;
  if (state.dataLoaded && !force) return;

  try {
    state.loading = true;
    setStatus('Cargando datos…');

    const jsonDataset = await loadJsonDataset(force);
    if (jsonDataset) {
      state.data = jsonDataset;
      state.dataLoaded = true;
      state.dataSource = 'json';
      setStatus('Datos JSON listos');
      return;
    }

    const workbookDataset = await loadWorkbookDataset(force);
    state.data = workbookDataset;
    state.dataLoaded = true;
    state.dataSource = 'excel';
    setStatus('Datos del Excel listos');
  } catch (error) {
    console.error(error);
    setStatus('Error al cargar');
    els.analysisSummary.innerHTML = `<p class="warning">No se pudieron cargar los datos. Revisa el Excel o la carpeta <code>data/</code>.</p>`;
  } finally {
    state.loading = false;
  }
}

async function loadJsonDataset(force = false) {
  try {
    const manifestResponse = await fetch(DATA_MANIFEST_URL, { cache: force ? 'reload' : 'default' });
    if (!manifestResponse.ok) return null;

    const manifest = await manifestResponse.json();
    const files = Array.isArray(manifest?.files) ? manifest.files : null;
    if (!files?.length) return null;

    const loaded = await Promise.all(
      ROLE_SOURCES.map(async ({ key, file }) => {
        const response = await fetch(file, { cache: force ? 'reload' : 'default' });
        if (!response.ok) {
          throw new Error(`No se pudo leer ${file}`);
        }
        const champions = await response.json();
        return [key, champions];
      })
    );

    return Object.fromEntries(loaded);
  } catch {
    return null;
  }
}

async function loadWorkbookDataset(force = false) {
  if (!window.XLSX) {
    throw new Error('XLSX no está disponible');
  }

  const response = await fetch(WORKBOOK_URL, { cache: force ? 'reload' : 'default' });
  if (!response.ok) {
    throw new Error(`No se pudo leer ${WORKBOOK_URL}`);
  }

  const buffer = await response.arrayBuffer();
  const workbook = window.XLSX.read(buffer, { type: 'array' });

  const dataset = {};
  ROLE_SOURCES.forEach(({ key, sheet }) => {
    const worksheet = workbook.Sheets[sheet];
    dataset[key] = worksheetToRows(worksheet);
  });

  return dataset;
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

function renderAll() {
  renderRoleTabs();
  renderCompositionGrid();
  renderChampionList();
  renderSummary();
  syncStatusBadge();
}

function renderRoleTabs() {
  els.roleTabs.innerHTML = '';
  ROLE_SOURCES.forEach(({ key, label }) => {
    const hasSelection = Boolean(state.selected[key]);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `role-tab ${state.activeRole === key ? 'is-active' : ''} ${hasSelection ? 'has-selection' : ''}`;
    button.innerHTML = `<span>${label}</span><small>${hasSelection ? '✓' : '·'}</small>`;
    button.addEventListener('click', () => selectRole(key));
    els.roleTabs.appendChild(button);
  });

  els.activeRoleLabel.textContent = ROLE_LABELS[state.activeRole] || '';
}

function renderChampionList() {
  const role = state.activeRole;
  const champions = (state.data[role] || [])
    .filter((champion) => matchesSearch(champion, state.search))
    .sort((a, b) => a.champion.localeCompare(b.champion, 'es'));

  els.championList.innerHTML = '';

  if (!champions.length) {
    els.championList.innerHTML = '<p class="empty">No hay campeones que coincidan.</p>';
    return;
  }

  champions.forEach((champion) => {
    const isSelected = state.selected[role]?.champion === champion.champion;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `champion-item ${isSelected ? 'is-selected' : ''}`;
    button.setAttribute('aria-pressed', String(isSelected));
    button.innerHTML = `
      <span class="champion-avatar">${escapeHtml(getChampionInitials(champion.champion))}</span>
      <span class="champion-content">
        <span class="champion-head">
          <strong>${escapeHtml(champion.champion)}</strong>
          <span class="champion-pill">${escapeHtml(champion.tempo)}</span>
        </span>
        <span class="champion-subline">${escapeHtml(champion.identity)} · ${escapeHtml(champion.function)}</span>
      </span>
    `;
    button.addEventListener('click', () => toggleChampionSelection(role, champion));
    els.championList.appendChild(button);
  });
}

function renderCompositionGrid() {
  els.compositionGrid.innerHTML = '';
  ROLE_SOURCES.forEach(({ key, label }) => {
    const champion = state.selected[key];
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `slot ${champion ? 'filled' : 'empty'}`;
    card.innerHTML = champion
      ? `
        <span class="slot-label">${label}</span>
        <strong>${escapeHtml(champion.champion)}</strong>
        <small>${escapeHtml(champion.identity)}</small>
        <span class="slot-hint">Toca para cambiar</span>
      `
      : `
        <span class="slot-label">${label}</span>
        <strong>Vacío</strong>
        <small>Selecciona un campeón</small>
        <span class="slot-hint">Toca para elegir</span>
      `;
    card.addEventListener('click', () => selectRole(key));
    els.compositionGrid.appendChild(card);
  });
}

function renderSummary() {
  const selectedChampions = getSelectedChampions();

  if (!selectedChampions.length) {
    els.analysisSummary.innerHTML = '<p class="summary-line muted">Selecciona campeones para ver un resumen breve.</p>';
    els.recommendations.innerHTML = '';
    return;
  }

  const analysis = analyzeComposition(selectedChampions);
  const winCondition = getWinCondition(analysis.metrics);
  const chips = buildSummaryChips(analysis, selectedChampions.length);

  els.analysisSummary.innerHTML = `
    <p class="summary-line"><strong>Win condition:</strong> ${escapeHtml(winCondition)}</p>
    <div class="summary-chips">
      ${chips
        .map(
          (chip) => `<span class="summary-chip ${chip.tone}">${escapeHtml(chip.text)}</span>`
        )
        .join('')}
    </div>
  `;

  els.recommendations.innerHTML = `
    <h3>Qué haría ahora</h3>
    <ul>
      ${analysis.recommendations
        .slice(0, 3)
        .map((item) => `<li>${escapeHtml(item)}</li>`)
        .join('')}
    </ul>
  `;
}

function buildSummaryChips(analysis, selectedCount) {
  const sortedMetrics = [...analysis.metrics].sort((a, b) => b.score - a.score);
  const strongest = sortedMetrics[0];
  const weakest = [...analysis.metrics].sort((a, b) => a.score - b.score)[0];
  const { ap, ad, hybrid } = analysis.damageSplit;

  const chips = [
    { text: `Fuerte: ${strongest.label} ${strongest.score}/10`, tone: 'good' },
    { text: `Flojo: ${weakest.label} ${weakest.score}/10`, tone: 'warn' },
    { text: `Daño: ${ap} AP / ${ad} AD${hybrid ? ` / ${hybrid} híbrido` : ''}`, tone: 'neutral' },
  ];

  if (selectedCount < 5) {
    chips.push({ text: `Faltan ${5 - selectedCount} picks`, tone: 'warn' });
  }

  if (analysis.metrics.find((metric) => metric.key === 'engage')?.score >= 7) {
    chips.push({ text: 'Engage alto', tone: 'good' });
  }

  return chips.slice(0, 4);
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

function selectRole(role) {
  state.activeRole = role;
  renderAll();
  els.searchInput.focus();
}

function toggleChampionSelection(role, champion) {
  const current = state.selected[role];
  state.selected[role] = current?.champion === champion.champion ? null : champion;
  state.activeRole = role;
  renderAll();
}

function getSelectedChampions() {
  return Object.entries(state.selected)
    .filter(([, champion]) => champion)
    .map(([role, champion]) => ({ role, ...champion }));
}

function matchesSearch(champion, search) {
  if (!search) return true;
  return [
    champion.champion,
    champion.identity,
    champion.function,
    champion.tempo,
    ...(champion.strengths || []),
    ...(champion.weaknesses || []),
  ]
    .join(' ')
    .toLowerCase()
    .includes(search);
}

function countSelectedChampions() {
  return Object.values(state.selected).filter(Boolean).length;
}

function getChampionInitials(name) {
  return String(name)
    .split(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

function setStatus(text) {
  els.statusBadge.textContent = text;
}

function syncStatusBadge() {
  if (!state.dataLoaded) return;
  const selectedCount = countSelectedChampions();
  setStatus(`${state.dataSource.toUpperCase()} · ${selectedCount}/5 picks`);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
