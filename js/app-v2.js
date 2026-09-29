import { analyzeComposition, matchesCategory, normalizeText } from './analyzer.js';

const WORKBOOK_URL = './Draft%20Pool.xlsx';
const DATA_MANIFEST_URL = './data/index.json';
const STORAGE_KEYS = { draft: 'rift-architect:draft-v2' };

const DRAGON_VERSIONS_URL = 'https://ddragon.leagueoflegends.com/api/versions.json';
const DEFAULT_DRAGON_VERSION = '15.16.1';
const DRAGON_CHAMPION_URL = (version) => `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`;
const DRAGON_ICON_URL = (version, id) => `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${id}.png`;

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

const CHAMPION_ICON_ALIASES = {
  shacoad: 'Shaco',
  shacoap: 'Shaco',
  varusonhit: 'Varus',
  varuslethality: 'Varus',
  varusap: 'Varus',
  kaynrhaast: 'Kayn',
  kaynassassin: 'Kayn',
  kaynblue: 'Kayn',
  kaynred: 'Kayn',
  nunuwillump: 'Nunu & Willump',
  nunuandwillump: 'Nunu & Willump',
};

const REASON_LABELS = {
  frontline: 'añade frontline',
  engage: 'facilita engage',
  control: 'mejora control',
  scaling: 'mejora el escalado',
  objective: 'ayuda en objetivos',
  poke: 'da más asedio',
  splitpush: 'mejor side lane',
  pick: 'da más picks',
  mobility: 'da más movilidad',
  damage_ap: 'cubre daño AP',
  damage_ad: 'cubre daño AD',
  teamfight: 'mejora teamfight',
  general: 'encaja con el draft',
};

const DAMAGE_AP_TERMS = ['mage', 'battlemage', 'artillery', 'enchanter', 'burst', 'magic', 'ap'];
const DAMAGE_AD_TERMS = ['marksman', 'fighter', 'bruiser', 'assassin', 'duelist', 'ad'];

const METRIC_META = {
  frontline: { icon: '🛡', hint: 'Aguanta la pelea' },
  engage: { icon: '⚔', hint: 'Inicia o caza' },
  damage: { icon: '💥', hint: 'Aporta daño' },
  scaling: { icon: '📈', hint: 'Rinde con el tiempo' },
  objective: { icon: '🎯', hint: 'Ayuda en objetivos' },
  control: { icon: '🧠', hint: 'Control y utilidad' },
  teamfight: { icon: '🤝', hint: 'Pelea agrupada' },
  poke: { icon: '🏹', hint: 'Daño a distancia' },
  mobility: { icon: '🌀', hint: 'Reposicionamiento' },
  pick: { icon: '🪝', hint: 'Castiga errores' },
  splitpush: { icon: '🛣', hint: 'Presión lateral' },
};

const state = {
  data: null,
  loading: false,
  dataSource: 'excel',
  selected: { ...DEFAULT_SELECTED },
  activeRole: SAVED_DRAFT.activeRole && ROLE_ORDER.includes(SAVED_DRAFT.activeRole) ? SAVED_DRAFT.activeRole : 'top',
  search: '',
  pickerOpen: false,
  savedDraft: SAVED_DRAFT,
  iconCatalog: null,
};

const els = {};

init().catch((error) => console.error(error));

async function init() {
  cacheElements();
  bindEvents();

  await Promise.allSettled([loadData(), loadChampionCatalog()]);
  restoreDraftFromStorage();
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
    closePicker();
    saveDraft();
    renderAll();
  });

  els.closePickerBtn.addEventListener('click', closePicker);

  els.pickerBackdrop.addEventListener('click', (event) => {
    if (event.target === els.pickerBackdrop) closePicker();
  });

  els.searchInput.addEventListener('input', (event) => {
    state.search = event.target.value.trim().toLowerCase();
    renderChampionList();
  });

  els.compositionGrid.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-role]');
    if (!button) return;
    openPicker(button.dataset.role);
  });

  els.championList.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action="select"]');
    if (!button) return;
    const { role, champion } = button.dataset;
    if (!role || !champion) return;
    selectChampion(role, champion);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && state.pickerOpen) closePicker();
  });
}

async function loadChampionCatalog() {
  try {
    const versionsResponse = await fetch(DRAGON_VERSIONS_URL, { cache: 'reload' });
    const versions = versionsResponse.ok ? await versionsResponse.json() : [];
    const version = Array.isArray(versions) && versions.length ? versions[0] : DEFAULT_DRAGON_VERSION;

    const response = await fetch(DRAGON_CHAMPION_URL(version), { cache: 'reload' });
    if (!response.ok) throw new Error('No se pudo leer el catálogo de iconos');

    const payload = await response.json();
    const map = {};
    Object.values(payload?.data || {}).forEach((champion) => {
      const key = normalizeText(champion.name || '');
      const id = String(champion.id || '').trim();
      if (key && id) map[key] = id;
      const normalizedId = normalizeText(id);
      if (normalizedId && id) map[normalizedId] = id;
    });

    state.iconCatalog = { version, map };
  } catch {
    state.iconCatalog = null;
  }
}

async function loadData(force = false) {
  if (state.loading) return;
  if (state.data && !force) return;

  try {
    state.loading = true;
    setStatus('Cargando datos…');

    const jsonDataset = await loadJsonDataset(force);
    if (jsonDataset) {
      state.data = jsonDataset;
      state.dataSource = 'json';
      restoreDraftFromStorage();
      setStatus('Datos JSON listos');
      return;
    }

    state.data = await loadWorkbookDataset(force);
    state.dataSource = 'excel';
    restoreDraftFromStorage();
    setStatus('Datos del Excel listos');
  } catch (error) {
    console.error(error);
    setStatus('Error al cargar');
    els.analysisSummary.innerHTML = '<p class="analysis-note">No se pudieron cargar los datos. Revisa el Excel o la carpeta <code>data/</code>.</p>';
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
  renderRecommendations();
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
    button.className = `slot ${champion ? 'is-filled' : 'is-empty'}`;
    button.innerHTML = champion
      ? `
        <span class="slot__role">${label}</span>
        ${renderAvatarMarkup(champion.champion, 'avatar--lg')}
        <strong class="slot__name">${escapeHtml(champion.champion)}</strong>
        <span class="slot__meta">Cambiar</span>
      `
      : `
        <span class="slot__role">${label}</span>
        <span class="avatar avatar--lg avatar--empty" aria-hidden="true">+</span>
        <strong class="slot__name">Vacío</strong>
        <span class="slot__meta">Seleccionar</span>
      `;
    els.compositionGrid.appendChild(button);
  });
}

function renderSummary() {
  const selectedChampions = getSelectedChampions();
  if (!selectedChampions.length) {
    els.analysisSummary.innerHTML = '<p class="analysis-note">Selecciona campeones para ver un resumen compacto.</p>';
    return;
  }

  const analysis = analyzeComposition(selectedChampions);
  const strongest = [...analysis.metrics].sort((a, b) => b.score - a.score)[0] || { label: 'Sin datos', score: 0 };
  const weakest = [...analysis.metrics].sort((a, b) => a.score - b.score)[0] || { label: 'Sin datos', score: 0 };
  const winCondition = getWinCondition(analysis.metrics);
  const strongMetrics = [...analysis.metrics].sort((a, b) => b.score - a.score).filter((metric) => metric.score >= 6).slice(0, 3);
  const weakMetrics = [...analysis.metrics].sort((a, b) => a.score - b.score).filter((metric) => metric.score < 5).slice(0, 2);

  els.analysisSummary.innerHTML = `
    <div class="summary-overview">
      <div class="summary-overview__main">
        <p class="eyebrow">Resumen</p>
        <h3>${escapeHtml(winCondition)}</h3>
        <p>${escapeHtml(analysis.summaryText)}</p>
      </div>
      <div class="summary-overview__mini">
        <div class="mini-card">
          <span>Fuerte</span>
          <strong>${escapeHtml(strongest.label)}</strong>
          <small>${escapeHtml(getLevelLabel(strongest.score))}</small>
        </div>
        <div class="mini-card">
          <span>Débil</span>
          <strong>${escapeHtml(weakest.label)}</strong>
          <small>${escapeHtml(getLevelLabel(weakest.score))}</small>
        </div>
        <div class="mini-card">
          <span>Estado</span>
          <strong>${selectedChampions.length}/5</strong>
          <small>${escapeHtml(selectedChampions.length === 5 ? 'Composición completa' : `Faltan ${5 - selectedChampions.length}`)}</small>
        </div>
      </div>
    </div>

    <div class="metric-groups">
      ${renderMetricGroup('Fortalezas', strongMetrics, analysis, 'high')}
      ${renderMetricGroup('Carencias', weakMetrics, analysis, 'warn')}
    </div>
  `;
}

function renderMetricGroup(title, metrics, analysis, tone) {
  const rows = metrics.length
    ? metrics.map((metric) => renderMetricRow(metric, analysis, tone)).join('')
    : '<p class="analysis-note">Sin datos claros.</p>';

  return `
    <section class="metric-group">
      <div class="metric-group__head">
        <span class="metric-group__title">${escapeHtml(title)}</span>
      </div>
      <div class="metric-group__rows">
        ${rows}
      </div>
    </section>
  `;
}

function renderMetricRow(metric, analysis, tone) {
  const meta = METRIC_META[metric.key] || { icon: '•', hint: 'Aporte general' };
  const level = getLevelLabel(metric.score);
  const contributors = getContributors(metric.key, analysis).slice(0, 2);

  return `
    <article class="metric-row metric-row--${tone}">
      <div class="metric-row__icon" aria-hidden="true">${meta.icon}</div>
      <div class="metric-row__body">
        <div class="metric-row__head">
          <strong>${escapeHtml(metric.label)}</strong>
          <span>${escapeHtml(level)}</span>
        </div>
        <div class="metric-row__sub">
          ${contributors.length ? escapeHtml(contributors.join(' · ')) : escapeHtml(meta.hint)}
        </div>
      </div>
    </article>
  `;
}

function renderRecommendations() {
  const selectedChampions = getSelectedChampions();
  if (!selectedChampions.length || !state.data) {
    els.recommendations.innerHTML = '';
    return;
  }

  const analysis = analyzeComposition(selectedChampions);
  const targetRole = getTargetRole();
  const roleLabel = ROLE_LABELS[targetRole] || 'el próximo rol';
  const picks = recommendPicks(targetRole, selectedChampions, analysis).slice(0, 3);

  if (!picks.length) {
    els.recommendations.innerHTML = `
      <h3>Recomendación para ${escapeHtml(roleLabel)}</h3>
      <p class="analysis-note">No he encontrado una opción clara para este hueco.</p>
    `;
    return;
  }

  const [main, ...alternatives] = picks;
  const mainReasons = main.reasons.slice(0, 2).map((reason) => REASON_LABELS[reason] || reason).filter(Boolean);

  els.recommendations.innerHTML = `
    <h3>Recomendación para ${escapeHtml(roleLabel)}</h3>
    <div class="recommendation-card">
      <div class="recommendation-card__main">
        <p class="eyebrow">Principal</p>
        <h4>${escapeHtml(main.champion)}</h4>
        <p class="recommendation-card__summary">${escapeHtml(main.summary)}</p>
        <div class="recommendation-chip-list">
          ${mainReasons.map((reason) => `<span class="recommendation-chip">${escapeHtml(reason)}</span>`).join('')}
        </div>
      </div>
      ${alternatives.length ? `
        <div class="recommendation-card__alt">
          <p class="recommendation-card__label">Alternativas</p>
          <div class="recommendation-alt-list">
            ${alternatives
              .map((pick) => {
                const reason = pick.summary || REASON_LABELS[pick.reasons[0]] || 'encaja con el draft';
                return `<div class="recommendation-alt"><strong>${escapeHtml(pick.champion)}</strong><span>${escapeHtml(reason)}</span></div>`;
              })
              .join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

function recommendPicks(targetRole, selectedChampions, analysis) {
  const pool = state.data?.[targetRole] || [];
  const selectedNames = new Set(selectedChampions.map((champion) => champion.champion.toLowerCase()));
  const weakMetrics = [...analysis.metrics].filter((metric) => metric.score < 5).sort((a, b) => a.score - b.score);
  const needsAP = analysis.damageSplit.ap === 0 && analysis.damageSplit.hybrid === 0;
  const needsAD = analysis.damageSplit.ad === 0 && analysis.damageSplit.hybrid === 0;

  return pool
    .filter((candidate) => !selectedNames.has(candidate.champion.toLowerCase()))
    .map((candidate) => scoreCandidate(candidate, weakMetrics, needsAP, needsAD))
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || a.champion.localeCompare(b.champion, 'es'));
}

function scoreCandidate(candidate, weakMetrics, needsAP, needsAD) {
  const text = buildCandidateText(candidate);
  const reasons = [];
  let score = 0;

  for (const metric of weakMetrics) {
    const matchesMetric = [candidate.strengths || [], candidate.weaknesses || []].flat().some((tag) => matchesCategory(tag, metric.key));
    if (matchesMetric) {
      score += Math.max(1, 6 - metric.score) * 10;
      reasons.push(metric.key);
    }
  }

  if (needsAP && DAMAGE_AP_TERMS.some((term) => text.includes(term))) {
    score += 12;
    reasons.push('damage_ap');
  }

  if (needsAD && DAMAGE_AD_TERMS.some((term) => text.includes(term))) {
    score += 12;
    reasons.push('damage_ad');
  }

  if (!reasons.length && /flex|utility|teamfight|front-to-back|peel|engage|control/i.test(text)) {
    score += 2;
    reasons.push('general');
  }

  const uniqueReasons = [...new Set(reasons)];
  return {
    champion: candidate.champion,
    score,
    reasons: uniqueReasons,
    summary: formatReasonSummary(uniqueReasons),
  };
}

function formatReasonSummary(reasons) {
  if (!reasons.length) return 'encaja con el draft';
  const phrases = reasons.slice(0, 2).map((reason) => REASON_LABELS[reason] || reason).filter(Boolean);
  return phrases.length ? phrases.join(' · ') : 'encaja con el draft';
}

function buildCandidateText(candidate) {
  return [
    candidate.champion,
    candidate.identity,
    candidate.function,
    candidate.tempo,
    ...(candidate.strengths || []),
    ...(candidate.weaknesses || []),
  ]
    .join(' ')
    .toLowerCase();
}

function renderModal() {
  const isOpen = state.pickerOpen;
  els.pickerBackdrop.classList.toggle('is-hidden', !isOpen);
  els.pickerBackdrop.setAttribute('aria-hidden', String(!isOpen));
  document.body.classList.toggle('modal-open', isOpen);
  if (!isOpen) return;

  els.pickerRoleLabel.textContent = ROLE_LABELS[state.activeRole] || '';
  els.pickerTitle.textContent = state.selected[state.activeRole]?.champion
    ? `Cambiar ${ROLE_LABELS[state.activeRole]}`
    : `Seleccionar ${ROLE_LABELS[state.activeRole]}`;
  els.pickerHint.textContent = 'Busca y elige. Cierra con ESC o tocando fuera.';
  renderChampionList();

  window.requestAnimationFrame(() => {
    els.searchInput.focus();
    els.searchInput.select();
  });
}

function renderChampionList() {
  const role = state.activeRole;
  const currentChampion = state.selected[role]?.champion || null;
  const usedElsewhere = new Set(
    Object.entries(state.selected)
      .filter(([selectedRole, champion]) => selectedRole !== role && champion)
      .map(([, champion]) => champion.champion.toLowerCase())
  );

  const pool = (state.data?.[role] || [])
    .filter((champion) => matchesSearch(champion, state.search))
    .filter((champion) => {
      const normalized = champion.champion.toLowerCase();
      return normalized === currentChampion?.toLowerCase() || !usedElsewhere.has(normalized);
    })
    .sort((a, b) => a.champion.localeCompare(b.champion, 'es'));

  els.championList.innerHTML = '';

  if (!pool.length) {
    els.championList.innerHTML = '<p class="picker-empty">No hay campeones disponibles.</p>';
    return;
  }

  pool.forEach((champion) => {
    const isSelected = currentChampion === champion.champion;
    const row = document.createElement('button');
    row.type = 'button';
    row.className = `champion-item ${isSelected ? 'is-selected' : ''}`;
    row.dataset.action = 'select';
    row.dataset.role = role;
    row.dataset.champion = champion.champion;
    row.setAttribute('aria-pressed', String(isSelected));
    row.innerHTML = `
      ${renderAvatarMarkup(champion.champion, 'avatar--sm')}
      <span class="champion-item__body">
        <span class="champion-item__head">
          <strong>${escapeHtml(champion.champion)}</strong>
          <span class="champion-pill">${escapeHtml(champion.tempo)}</span>
        </span>
        <span class="champion-item__sub">${escapeHtml(champion.function)}</span>
      </span>
    `;
    els.championList.appendChild(row);
  });
}

function openPicker(role) {
  state.activeRole = normalizeRole(role);
  state.search = '';
  els.searchInput.value = '';
  state.pickerOpen = true;
  saveDraft();
  renderAll();
}

function closePicker() {
  state.pickerOpen = false;
  state.search = '';
  els.searchInput.value = '';
  renderAll();
}

function selectChampion(role, championName) {
  const roleKey = normalizeRole(role);
  const champion = (state.data?.[roleKey] || []).find((item) => item.champion === championName);
  if (!champion) return;

  state.selected[roleKey] = champion;
  state.activeRole = roleKey;
  state.search = '';
  saveDraft();
  closePicker();
  renderAll();
}

function getSelectedChampions() {
  return ROLE_ORDER.filter((role) => state.selected[role]).map((role) => ({ role, ...state.selected[role] }));
}

function getTargetRole() {
  if (state.pickerOpen) return state.activeRole;
  const emptyRole = ROLE_ORDER.find((role) => !state.selected[role]);
  return emptyRole || state.activeRole || 'top';
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

function getLevelLabel(score) {
  if (score >= 7) return 'Alto';
  if (score >= 4) return 'Medio';
  return 'Bajo';
}

function renderAvatarMarkup(name, size = 'avatar--md') {
  const iconUrl = getChampionIconUrl(name);
  const fallback = escapeHtml(getChampionInitials(name));

  if (!iconUrl) {
    return `<span class="avatar ${size} avatar--fallback">${fallback}</span>`;
  }

  return `
    <span class="avatar ${size}" data-loaded="0">
      <img src="${escapeHtml(iconUrl)}" alt="" loading="lazy" onload="this.parentElement.dataset.loaded='1'" onerror="this.remove(); this.parentElement.dataset.error='1'" />
      <span class="avatar__fallback">${fallback}</span>
    </span>
  `;
}

function getChampionIconUrl(name) {
  const iconId = getChampionIconId(name);
  if (!iconId || !state.iconCatalog?.version) return null;
  return DRAGON_ICON_URL(state.iconCatalog.version, iconId);
}

function getChampionIconId(name) {
  const normalizedName = normalizeText(name);
  const canonicalName = CHAMPION_ICON_ALIASES[normalizedName] || name;
  const normalizedCanonical = normalizeText(canonicalName);
  return state.iconCatalog?.map?.[normalizedCanonical] || state.iconCatalog?.map?.[normalizedName] || null;
}

function getChampionInitials(name) {
  return String(name)
    .split(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || '?';
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

function normalizeRole(role) {
  return ROLE_ORDER.includes(role) ? role : 'top';
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

    const champion = (state.data?.[role] || []).find(
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
      selected: Object.fromEntries(ROLE_ORDER.map((role) => [role, state.selected[role]?.champion || null])),
    };
    localStorage.setItem(STORAGE_KEYS.draft, JSON.stringify(payload));
    state.savedDraft = payload;
  } catch {
    // ignore storage errors
  }
}

function setStatus(text) {
  if (els.statusBadge) els.statusBadge.textContent = text;
}

function syncStatusBadge() {
  if (!state.data) return;
  const selectedCount = getSelectedChampions().length;
  setStatus(`${state.dataSource.toUpperCase()} · ${selectedCount}/5`);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
