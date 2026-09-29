import { analyzeComposition, getRoleInsights } from './analyzer.js';

const WORKBOOK_URL = './Draft%20Pool.xlsx';
const ROLE_SHEETS = [
  { key: 'top', label: 'Top', sheet: 'Tabla Top' },
  { key: 'jungle', label: 'Jungla', sheet: 'Tabla Jungla' },
  { key: 'mid', label: 'Mid', sheet: 'Tabla Mid' },
  { key: 'botline', label: 'Botline', sheet: 'Tabla Botline' },
  { key: 'support', label: 'Support', sheet: 'Tabla Support' },
];

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
  workbookLoaded: false,
  loading: false,
};

const els = {};

init();

async function init() {
  cacheElements();
  bindEvents();
  await loadWorkbook();
  renderAll();
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  }
}

function cacheElements() {
  els.statusBadge = document.getElementById('statusBadge');
  els.roleTabs = document.getElementById('roleTabs');
  els.searchInput = document.getElementById('searchInput');
  els.championList = document.getElementById('championList');
  els.compositionGrid = document.getElementById('compositionGrid');
  els.detailTitle = document.getElementById('detailTitle');
  els.detailMeta = document.getElementById('detailMeta');
  els.detailStrengths = document.getElementById('detailStrengths');
  els.detailWeaknesses = document.getElementById('detailWeaknesses');
  els.analysisSummary = document.getElementById('analysisSummary');
  els.scoreBars = document.getElementById('scoreBars');
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
    await loadWorkbook(true);
    renderAll();
  });
}

async function loadWorkbook(force = false) {
  if (state.loading) return;
  if (state.workbookLoaded && !force) return;

  try {
    state.loading = true;
    setStatus('Cargando datos…');
    const response = await fetch(WORKBOOK_URL, { cache: force ? 'reload' : 'default' });
    if (!response.ok) {
      throw new Error(`No se pudo leer ${WORKBOOK_URL}`);
    }

    const buffer = await response.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });

    ROLE_SHEETS.forEach(({ key, sheet }) => {
      const worksheet = workbook.Sheets[sheet];
      state.data[key] = worksheetToRows(worksheet);
    });

    state.workbookLoaded = true;
    setStatus('Datos listos');
  } catch (error) {
    console.error(error);
    setStatus('Error al cargar');
    els.analysisSummary.innerHTML = `<p class="warning">No se pudo abrir el Excel. Revisa que el archivo siga en la raíz del repo.</p>`;
  } finally {
    state.loading = false;
  }
}

function worksheetToRows(worksheet) {
  if (!worksheet) return [];
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false, defval: '' });
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
  renderDetails();
  renderAnalysis();
}

function renderRoleTabs() {
  els.roleTabs.innerHTML = '';
  ROLE_SHEETS.forEach(({ key, label }) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `role-tab ${state.activeRole === key ? 'is-active' : ''}`;
    button.textContent = label;
    button.addEventListener('click', () => {
      state.activeRole = key;
      renderRoleTabs();
      renderChampionList();
      renderDetails();
    });
    els.roleTabs.appendChild(button);
  });
}

function renderChampionList() {
  const role = state.activeRole;
  const champions = (state.data[role] || []).filter((champion) => {
    if (!state.search) return true;
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
      .includes(state.search);
  });

  els.championList.innerHTML = '';

  if (!champions.length) {
    els.championList.innerHTML = '<p class="empty">No hay campeones que coincidan.</p>';
    return;
  }

  champions.forEach((champion) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'champion-item';
    button.innerHTML = `
      <strong>${escapeHtml(champion.champion)}</strong>
      <span>${escapeHtml(champion.identity)}</span>
      <small>${escapeHtml(champion.function)} · ${escapeHtml(champion.tempo)}</small>
    `;
    button.addEventListener('click', () => {
      state.selected[role] = champion;
      renderAll();
    });
    els.championList.appendChild(button);
  });
}

function renderCompositionGrid() {
  els.compositionGrid.innerHTML = '';
  ROLE_SHEETS.forEach(({ key, label }) => {
    const champion = state.selected[key];
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `slot ${champion ? 'filled' : 'empty'}`;
    card.innerHTML = champion
      ? `
        <span class="slot-label">${label}</span>
        <strong>${escapeHtml(champion.champion)}</strong>
        <small>${escapeHtml(champion.identity)}</small>
      `
      : `
        <span class="slot-label">${label}</span>
        <strong>Vacío</strong>
        <small>Selecciona un campeón</small>
      `;
    card.addEventListener('click', () => {
      state.activeRole = key;
      renderRoleTabs();
      renderChampionList();
      renderDetails();
    });
    els.compositionGrid.appendChild(card);
  });
}

function renderDetails() {
  const active = state.selected[state.activeRole];
  if (!active) {
    els.detailTitle.textContent = 'Selecciona un campeón';
    els.detailMeta.textContent = '';
    els.detailStrengths.innerHTML = '';
    els.detailWeaknesses.innerHTML = '';
    return;
  }

  els.detailTitle.textContent = active.champion;
  els.detailMeta.textContent = `${active.identity} · ${active.function} · ${active.tempo}`;
  els.detailStrengths.innerHTML = active.strengths.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
  els.detailWeaknesses.innerHTML = active.weaknesses.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
}

function renderAnalysis() {
  const selectedChampions = Object.entries(state.selected)
    .filter(([, champion]) => champion)
    .map(([role, champion]) => ({ role, ...champion }));

  if (!selectedChampions.length) {
    els.analysisSummary.innerHTML = '<p class="muted">Añade campeones para ver el análisis.</p>';
    els.scoreBars.innerHTML = '';
    els.recommendations.innerHTML = '';
    return;
  }

  const analysis = analyzeComposition(selectedChampions);
  const roleInsights = getRoleInsights(selectedChampions);

  els.analysisSummary.innerHTML = `
    <p><strong>${analysis.summaryTitle}</strong></p>
    <p>${analysis.summaryText}</p>
    <p class="muted">${selectedChampions.length}/5 campeones seleccionados</p>
  `;

  els.scoreBars.innerHTML = analysis.metrics
    .map(
      (metric) => `
      <div class="metric">
        <div class="metric-row">
          <span>${escapeHtml(metric.label)}</span>
          <strong>${metric.score}/10</strong>
        </div>
        <div class="bar"><span style="width:${metric.score * 10}%"></span></div>
      </div>
    `
    )
    .join('');

  els.recommendations.innerHTML = `
    <h3>Lecturas rápidas</h3>
    <ul>
      ${analysis.recommendations.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
      ${roleInsights.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
    </ul>
  `;
}

function setStatus(text) {
  els.statusBadge.textContent = text;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}