const WORKBOOK_URL = './Draft%20Pool.xlsx';
const DRAGON_VERSIONS_URL = 'https://ddragon.leagueoflegends.com/api/versions.json';
const DEFAULT_DRAGON_VERSION = '15.16.1';
const DRAGON_CHAMPION_URL = (version) => `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`;
const DRAGON_ICON_URL = (version, id) => `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${id}.png`;

const ROLE_SHEETS = [
  { key: 'top', label: 'Top', sheet: 'Tabla Top' },
  { key: 'jungle', label: 'Jungla', sheet: 'Tabla Jungla' },
  { key: 'mid', label: 'Mid', sheet: 'Tabla Mid' },
  { key: 'botline', label: 'Botline', sheet: 'Tabla Botline' },
  { key: 'support', label: 'Support', sheet: 'Tabla Support' },
];

const ICON_ALIASES = {
  shacoad: 'Shaco',
  shacoap: 'Shaco',
  varusonhit: 'Varus',
  varuslethality: 'Varus',
  varusap: 'Varus',
  kaynblue: 'Kayn',
  kaynred: 'Kayn',
  kaynrhaast: 'Kayn',
  kaynassassin: 'Kayn',
  kaynazul: 'Kayn',
  kaynrojo: 'Kayn',
  nunuwillump: 'Nunu & Willump',
  nunuandwillump: 'Nunu & Willump',
};

const roleData = new Map();
let iconCatalog = null;
let patchScheduled = false;
let dataLoaded = false;

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function getRoleKeyFromLabel(label) {
  const row = ROLE_SHEETS.find((entry) => entry.label === String(label || '').trim());
  return row?.key || 'top';
}

function parseRows(worksheet) {
  if (!worksheet || !window.XLSX) return [];

  const rows = window.XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    blankrows: false,
    defval: '',
  });

  return rows
    .slice(1)
    .filter((row) => row[0])
    .map((row) => ({
      champion: String(row[0] || '').trim(),
      identity: String(row[1] || '').trim() || 'Sin definir',
      function: String(row[2] || '').trim() || 'Sin definir',
      tempo: String(row[3] || '').trim() || 'Sin definir',
    }));
}

async function loadRoleData() {
  if (dataLoaded || !window.XLSX) return;
  dataLoaded = true;

  try {
    const response = await fetch(WORKBOOK_URL, { cache: 'reload' });
    if (!response.ok) return;

    const workbook = window.XLSX.read(await response.arrayBuffer(), { type: 'array' });
    ROLE_SHEETS.forEach(({ key, sheet }) => {
      roleData.set(key, parseRows(workbook.Sheets[sheet]));
    });
  } catch {
    ROLE_SHEETS.forEach(({ key }) => roleData.set(key, []));
  }
}

async function loadIconCatalog() {
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

    iconCatalog = { version, map };
  } catch {
    iconCatalog = null;
  }
}

function findChampion(roleKey, championName) {
  const normalizedName = normalizeText(championName);
  const rows = roleData.get(roleKey) || [];
  return rows.find((item) => normalizeText(item.champion) === normalizedName) || null;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function removeRecommendationsBlock() {
  const el = document.getElementById('recommendations');
  if (el) el.remove();
}

function canonicalIconName(name) {
  const normalized = normalizeText(name);
  const alias = ICON_ALIASES[normalized];
  if (alias) return alias;
  if (normalized.includes('kayn')) return 'Kayn';
  if (normalized.includes('shaco')) return 'Shaco';
  if (normalized.includes('varus')) return 'Varus';
  if (normalized.includes('nunu')) return 'Nunu & Willump';
  return name;
}

function getIconUrl(name) {
  if (!iconCatalog?.version) return null;
  const candidates = [name, canonicalIconName(name)];

  for (const candidate of candidates) {
    const normalized = normalizeText(candidate);
    const id = iconCatalog.map?.[normalized] || iconCatalog.map?.[normalizeText(String(candidate).replace(/\s+/g, ''))];
    if (id) return DRAGON_ICON_URL(iconCatalog.version, id);
  }

  return null;
}

function renderAvatarMarkup(name, size = 'avatar--sm') {
  const iconUrl = getIconUrl(name);
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

function patchChampionList() {
  const list = document.getElementById('championList');
  const roleLabel = document.getElementById('pickerRoleLabel')?.textContent?.trim();
  const roleKey = getRoleKeyFromLabel(roleLabel);
  if (!list || !roleData.size) return;

  list.querySelectorAll('.champion-item').forEach((item) => {
    const title = item.querySelector('.champion-item__head strong')?.textContent?.trim();
    if (!title) return;

    const row = findChampion(roleKey, title);
    const identity = row?.identity || 'Sin definir';
    const champFunction = row?.function || 'Sin definir';
    const tempo = row?.tempo || item.querySelector('.champion-pill')?.textContent?.trim() || '';

    item.innerHTML = `
      ${renderAvatarMarkup(title, 'avatar--sm')}
      <span class="champion-item__body">
        <span class="champion-item__title-row">
          <strong>${escapeHtml(title)}</strong>
          ${tempo ? `<span class="champion-pill">${escapeHtml(tempo)}</span>` : ''}
        </span>
        <span class="champion-item__identity">${escapeHtml(identity)}</span>
        <span class="champion-item__function">${escapeHtml(champFunction)}</span>
      </span>
    `;
  });
}

function patchCompositionGrid() {
  const grid = document.getElementById('compositionGrid');
  if (!grid) return;

  grid.querySelectorAll('.slot').forEach((slot) => {
    const role = slot.querySelector('.slot__role')?.textContent?.trim() || '';
    const isFilled = slot.classList.contains('is-filled');
    const title = slot.querySelector('.slot__name')?.textContent?.trim() || '';

    if (!isFilled) {
      slot.innerHTML = `
        <span class="slot__role">${escapeHtml(role)}</span>
        <span class="avatar avatar--lg avatar--empty" aria-hidden="true">+</span>
        <strong class="slot__name">Seleccionar campeón</strong>
        <span class="slot__cta">Toca para elegir</span>
      `;
      return;
    }

    const roleKey = String(slot.dataset.role || 'top');
    const row = findChampion(roleKey, title);
    const identity = row?.identity || 'Sin definir';
    const champFunction = row?.function || 'Sin definir';
    const tempo = row?.tempo || '';

    slot.innerHTML = `
      <span class="slot__role">${escapeHtml(role)}</span>
      ${renderAvatarMarkup(title, 'avatar--lg')}
      <strong class="slot__name">${escapeHtml(title)}</strong>
      <span class="slot__identity">${escapeHtml(identity)}</span>
      <span class="slot__function">${escapeHtml(champFunction)}</span>
      ${tempo ? `<span class="slot__tempo">${escapeHtml(tempo)}</span>` : ''}
    `;
  });
}

function schedulePatch() {
  if (patchScheduled) return;
  patchScheduled = true;
  window.requestAnimationFrame(() => {
    patchScheduled = false;
    removeRecommendationsBlock();
    patchChampionList();
    patchCompositionGrid();
  });
}

function observeNode(id) {
  const node = document.getElementById(id);
  if (!node) {
    window.requestAnimationFrame(() => observeNode(id));
    return;
  }

  const observer = new MutationObserver(schedulePatch);
  observer.observe(node, { childList: true, subtree: true, characterData: true });
}

function getChampionInitials(name) {
  return String(name)
    .split(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || '?';
}

async function init() {
  await Promise.allSettled([loadRoleData(), loadIconCatalog()]);
  schedulePatch();
  observeNode('championList');
  observeNode('compositionGrid');
  observeNode('analysisSummary');
  window.setInterval(schedulePatch, 1000);
}

init().catch(() => {});
