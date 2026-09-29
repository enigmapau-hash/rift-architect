import { analyzeComposition } from './analyzer.js';

const WORKBOOK_URL = './Draft%20Pool.xlsx';
const DATA_MANIFEST_URL = './data/index.json';
const STORAGE_KEYS = {
  favorites: 'rift-architect:favorites',
  draft: 'rift-architect:draft',
};

const ROLE_SOURCES = [
  { key: 'top', label: 'Top', file: './data/top.json', sheet: 'Tabla Top' },
  { key: 'jungle', label: 'Jungla', file: './data/jungle.json', sheet: 'Tabla Jungla' },
  { key: 'mid', label: 'Mid', file: './data/mid.json', sheet: 'Tabla Mid' },
  { key: 'botline', label: 'Botline', file: './data/bot.json', sheet: 'Tabla Botline' },
  { key: 'support', label: 'Support', file: './data/support.json', sheet: 'Tabla Support' },
];

const ROLE_LABELS = Object.fromEntries(ROLE_SOURCES.map(({ key, label }) => [key, label]));
const ROLE_ORDER = ROLE_SOURCES.map(({ key }) => key);
const DEFAULT_SELECTED = { top: null, jungle: null, mid: null, botline: null, support: null };
const SAVED_DRAFT = loadDraft();

const state = {
  activeRole: normalizeRole(SAVED_DRAFT.activeRole) || 'top',
  search: '',
  data: {},
  selected: { ...DEFAULT_SELECTED },
  dataLoaded: false,
  loading: false,
  dataSource: 'excel',
  pickerOpen: false,
  favorites: loadFavorites(),
  savedDraft: SAVED_DRAFT,
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
  els.refreshBtn = document.getElementById('refreshBtn');
  els.clearBtn = document.getElementById('clearBtn');
  els.compositionGrid = document.getElementById('compositionGrid');
  els.analysisSummary = document.getElementById('analysisSummary');
  els.recommendations = document.getElementById('recommendations');
  els.pickerBackdrop = document.getElementById('pickerBackdrop');
  els.pickerRoleLabel = document.getElementById('pickerRoleLabel');
  els.pickerTitle = document.getElementById('pickerTitle');
  els.closePickerBtn = document.getElementById('closePickerBtn');
  els.searchInput = document.getElementById('searchInput');
  els.favoriteList = document.getElementById('favoriteList');
  els.championList = document.getElementById('championList');
  els.pickerHint = document.getElementById('pickerHint');
}

function bindEvents() {
  els.refreshBtn.addEventListener('click', async () => {
    await loadData(true);
    renderAll();
  });

  els.clearBtn.addEventListener('click', () => {
    state.selected = { ...DEFAULT_SELECTED };
    state.activeRole = 'top';
    state.search = '';
    state.pickerOpen = false;
    saveDraft();
    closePicker();
    renderAll();
  });

  els.closePickerBtn.addEventListener('click', closePicker);

  els.pickerBackdrop.addEventListener('click', (event) => {
    if (event.target === els.pickerBackdrop) closePicker();
  });

  els.searchInput.addEventListener('input', (event) => {
    state.search = event.target.value.trim().toLowerCase();
    renderChampionLists();
  });

  els.compositionGrid.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-role]');
    if (!button) return;
    openPicker(button.dataset.role);
  });

  const handlePickerClick = (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;

    const { action, champion, role } = button.dataset;
    if (action === 'favorite' && champion) {
      toggleFavorite(champion);
      renderChampionLists();
      return;
    }
    if (action === 'select' && champion) {
      selectChampion(role || state.activeRole, champion);
    }
  };

  els.favoriteList.addEventListener('click', handlePickerClick);
  els.championList.addEventListener('click', handlePickerClick);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && state.pickerOpen) closePicker();
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
      restoreDraftFromStorage();
      setStatus('Datos JSON listos');
      return;
    }

    state.data = await loadWorkbookDataset(force);
    state.dataLoaded = true;
    state.dataSource = 'excel';
    restoreDraftFromStorage();
    setStatus('Datos del Excel listos');
  } catch (error) {
    console.error(error);
    setStatus('Error al cargar');
    els.analysisSummary.innerHTML = '<p class="warning">No se pudieron cargar los datos. Revisa el Excel o la carpeta <code>data/</code>.</p>';
  } finally {
    state.loading = false;
  }
}

async function loadJsonDataset(force = false) {
  try {
    const manifestResponse = await fetch(DATA_MANIFEST_URL, { cache: force ? 'reload' : 'default' });
    if (!manifestResponse.ok) return null;

    const manifest = await manifestResponse.json();
    if (!Array.isArray(manifest?.files) || !manifest.files.length) return null;

    const loaded = await Promise.all(
      ROLE_SOURCES.map(async ({ key, file }) => {
        const response = await fetch(file, { cache: force ? 'reload' : 'default' });
        if (!response.ok) throw new Error(`No se pudo leer ${file}`);
        return [key, await response.json()];
      })
    );

    return Object.fromEntries(loaded);
  } catch {
    return null;
  }
}

async function loadWorkbookDataset(force = false) {
  if (!window.XLSX) throw new Error('XLSX no está disponible');

  const response = await fetch(WORKBOOK_URL, { cache: force ? 'reload' : 'default' });
  if (!response.ok) throw new Error(`No se pudo leer ${WORKBOOK_URL}`);

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

function renderAll() {
  renderCompositionGrid();
  renderSummary();
  renderModal();
  syncStatusBadge();
}

function renderCompositionGrid() {
  els.compositionGrid.innerHTML = '';

  ROLE_SOURCES.forEach(({ key, label }) => {
    const champion = state.selected[key];
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.role = key;
    button.className = `slot ${champion ? 'filled' : 'empty'}`;
    button.innerHTML = champion
      ? `<span class="slot-label">${label}</span><strong>${escapeHtml(champion.champion)}</strong><small>${escapeHtml(champion.identity)}</small><span class="slot-hint">Cambiar</span>`
      : `<span class="slot-label">${label}</span><strong>Vacío</strong><small>Toca para elegir</small><span class="slot-hint">Abrir selector</span>`;
    els.compositionGrid.appendChild(button);
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
      ${chips.map((chip) => `<span class="summary-chip ${chip.tone}">${escapeHtml(chip.text)}</span>`).join('')}
    </div>
  `;

  els.recommendations.innerHTML = `
    <h3>Qué haría ahora</h3>
    <ul>
      ${analysis.recommendations.slice(0, 3).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
    </ul>
  `;
}

function renderModal() {
  const isOpen = state.pickerOpen;
  els.pickerBackdrop.classList.toggle('is-hidden', !isOpen);
  els.pickerBackdrop.setAttribute('aria-hidden', String(!isOpen));
  if (!isOpen) return;

  els.pickerRoleLabel.textContent = ROLE_LABELS[state.activeRole] || '';
  els.pickerTitle.textContent = state.selected[state.activeRole]?.champion
    ? `Cambiar ${ROLE_LABELS[state.activeRole]}`
    : `Elegir ${ROLE_LABELS[state.activeRole]}`;
  els.pickerHint.textContent = 'Los campeones ya usados en otros roles se ocultan automáticamente.';
  renderChampionLists();

  window.requestAnimationFrame(() => {
    els.searchInput.focus();
    els.searchInput.select();
  });
}

function renderChampionLists() {
  const role = state.activeRole;
  const currentChampion = state.selected[role]?.champion || null;
  const usedElsewhere = new Set(
    Object.entries(state.selected)
      .filter(([selectedRole, champion]) => selectedRole !== role && champion)
      .map(([, champion]) => champion.champion.toLowerCase())
  );

  const pool = (state.data[role] || [])
    .filter((champion) => matchesSearch(champion, state.search))
    .filter((champion) => {
      const normalized = champion.champion.toLowerCase();
      return normalized === currentChampion?.toLowerCase() || !usedElsewhere.has(normalized);
    })
    .sort((a, b) => a.champion.localeCompare(b.champion, 'es'));

  const favorites = pool.filter((champion) => isFavorite(champion.champion));
  const regular = pool.filter((champion) => !isFavorite(champion.champion));

  renderFavoriteList(favorites, currentChampion);
  renderChampionList(regular, currentChampion, role);
}

function renderFavoriteList(champions, currentChampion) {
  if (!champions.length) {
    els.favoriteList.innerHTML = '<p class="picker-empty">Marca estrellas para moverlos aquí.</p>';
    return;
  }

  els.favoriteList.innerHTML = champions
    .map((champion) => {
      const isCurrent = currentChampion === champion.champion;
      return `<button type="button" class="favorite-chip ${isCurrent ? 'is-current' : ''}" data-action="select" data-champion="${escapeHtml(champion.champion)}">${escapeHtml(champion.champion)}</button>`;
    })
    .join('');
}

function renderChampionList(champions, currentChampion, role) {
  els.championList.innerHTML = '';

  if (!champions.length) {
    els.championList.innerHTML = '<p class="picker-empty">No hay campeones disponibles.</p>';
    return;
  }

  champions.forEach((champion) => {
    const isSelected = currentChampion === champion.champion;
    const isFav = isFavorite(champion.champion);

    const row = document.createElement('div');
    row.className = 'champion-row';
    row.innerHTML = `
      <button
        type="button"
        class="champion-item ${isSelected ? 'is-selected' : ''}"
        data-action="select"
        data-role="${role}"
        data-champion="${escapeHtml(champion.champion)}"
        aria-pressed="${String(isSelected)}"
      >
        <span class="champion-avatar">${escapeHtml(getChampionInitials(champion.champion))}</span>
        <span class="champion-content">
          <span class="champion-head">
            <strong>${escapeHtml(champion.champion)}</strong>
            <span class="champion-pill">${escapeHtml(champion.tempo)}</span>
          </span>
          <span class="champion-subline">${escapeHtml(champion.identity)} · ${escapeHtml(champion.function)}</span>
        </span>
      </button>
      <button
        type="button"
        class="favorite-toggle ${isFav ? 'is-favorite' : ''}"
        data-action="favorite"
        data-champion="${escapeHtml(champion.champion)}"
        aria-label="${isFav ? 'Quitar favorito' : 'Añadir favorito'}"
        title="${isFav ? 'Quitar favorito' : 'Añadir favorito'}"
      >${isFav ? '★' : '☆'}</button>
    `;
    els.championList.appendChild(row);
  });
}

function openPicker(role) {
  state.activeRole = normalizeRole(role);
  state.search = '';
  els.searchInput.value = '';
  state.pickerOpen = true;
  document.body.classList.add('modal-open');
  saveDraft();
  renderAll();
}

function closePicker() {
  if (!state.pickerOpen) return;
  state.pickerOpen = false;
  state.search = '';
  els.searchInput.value = '';
  document.body.classList.remove('modal-open');
  renderAll();
}

function selectChampion(role, championName) {
  const roleKey = normalizeRole(role);
  const champion = (state.data[roleKey] || []).find((item) => item.champion === championName);
  if (!champion || !isSelectable(roleKey, championName)) return;

  state.selected[roleKey] = champion;
  const nextRole = getNextEmptyRole(roleKey);
  state.activeRole = nextRole || roleKey;
  state.search = '';
  els.searchInput.value = '';
  saveDraft();

  if (nextRole) {
    state.pickerOpen = true;
    document.body.classList.add('modal-open');
    renderAll();
    return;
  }

  closePicker();
  renderAll();
}

function getNextEmptyRole(currentRole) {
  const startIndex = ROLE_ORDER.indexOf(normalizeRole(currentRole));
  if (startIndex < 0) return null;

  for (let i = startIndex + 1; i < ROLE_ORDER.length; i += 1) {
    const role = ROLE_ORDER[i];
    if (!state.selected[role]) return role;
  }

  for (let i = 0; i < startIndex; i += 1) {
    const role = ROLE_ORDER[i];
    if (!state.selected[role]) return role;
  }

  return null;
}

function isSelectable(role, championName) {
  const currentChampion = state.selected[role]?.champion;
  if (currentChampion === championName) return true;

  return !Object.entries(state.selected).some(
    ([selectedRole, selectedChampion]) => selectedRole !== role && selectedChampion?.champion === championName
  );
}

function toggleFavorite(championName) {
  const normalized = String(championName).trim();
  if (!normalized) return;

  const exists = state.favorites.some((item) => item.toLowerCase() === normalized.toLowerCase());
  state.favorites = exists
    ? state.favorites.filter((item) => item.toLowerCase() !== normalized.toLowerCase())
    : [...state.favorites, normalized].sort((a, b) => a.localeCompare(b, 'es'));

  saveFavorites(state.favorites);
}

function isFavorite(championName) {
  const target = String(championName).toLowerCase();
  return state.favorites.some((item) => String(item).toLowerCase() === target);
}

function loadFavorites() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.favorites);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => String(item).trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function saveFavorites(favorites) {
  try {
    localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(favorites));
  } catch {
    // ignore storage errors
  }
}

function loadDraft() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.draft);
    if (!raw) return { activeRole: 'top', selected: {} };

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { activeRole: 'top', selected: {} };

    return {
      activeRole: normalizeRole(parsed.activeRole) || 'top',
      selected: parsed.selected && typeof parsed.selected === 'object' ? parsed.selected : {},
    };
  } catch {
    return { activeRole: 'top', selected: {} };
  }
}

function restoreDraftFromStorage() {
  const saved = state.savedDraft || { activeRole: 'top', selected: {} };
  state.activeRole = normalizeRole(saved.activeRole) || state.activeRole;

  const restored = {};
  ROLE_ORDER.forEach((role) => {
    const savedChampion = saved.selected?.[role];
    if (!savedChampion) {
      restored[role] = null;
      return;
    }

    const champion = (state.data[role] || []).find(
      (item) => item.champion.toLowerCase() === String(savedChampion).toLowerCase()
    );
    restored[role] = champion || null;
  });

  state.selected = restored;
}

function saveDraft() {
  try {
    const payload = {
      activeRole: state.activeRole,
      selected: Object.fromEntries(
        ROLE_ORDER.map((role) => [role, state.selected[role]?.champion || null])
      ),
    };
    localStorage.setItem(STORAGE_KEYS.draft, JSON.stringify(payload));
    state.savedDraft = payload;
  } catch {
    // ignore storage errors
  }
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

  if (selectedCount < 5) chips.push({ text: `Faltan ${5 - selectedCount} picks`, tone: 'warn' });
  if (analysis.metrics.find((metric) => metric.key === 'engage')?.score >= 7) chips.push({ text: 'Engage alto', tone: 'good' });

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

function getSelectedChampions() {
  return ROLE_ORDER.filter((role) => state.selected[role]).map((role) => ({ role, ...state.selected[role] }));
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
  const selectedCount = getSelectedChampions().length;
  setStatus(`${state.dataSource.toUpperCase()} · ${selectedCount}/5 picks`);
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
