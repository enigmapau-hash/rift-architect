const WORKBOOK_URL = './Draft%20Pool.xlsx';

const ROLE_SHEETS = [
  { key: 'top', label: 'Top', sheet: 'Tabla Top' },
  { key: 'jungle', label: 'Jungla', sheet: 'Tabla Jungla' },
  { key: 'mid', label: 'Mid', sheet: 'Tabla Mid' },
  { key: 'botline', label: 'Botline', sheet: 'Tabla Botline' },
  { key: 'support', label: 'Support', sheet: 'Tabla Support' },
];

const roleData = new Map();
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

function patchChampionList() {
  const list = document.getElementById('championList');
  const roleLabel = document.getElementById('pickerRoleLabel')?.textContent?.trim();
  const roleKey = getRoleKeyFromLabel(roleLabel);
  if (!list) return;

  list.querySelectorAll('.champion-item').forEach((item) => {
    const title = item.querySelector('.champion-item__head strong')?.textContent?.trim();
    if (!title) return;

    const row = findChampion(roleKey, title);
    const identity = row?.identity || 'Sin definir';
    const champFunction = row?.function || 'Sin definir';
    const tempo = row?.tempo || item.querySelector('.champion-pill')?.textContent?.trim() || '';
    const avatar = item.querySelector('.avatar')?.outerHTML || '';

    item.innerHTML = `
      ${avatar}
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
    const avatar = slot.querySelector('.avatar')?.outerHTML || '';

    slot.innerHTML = `
      <span class="slot__role">${escapeHtml(role)}</span>
      ${avatar}
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

async function init() {
  await loadRoleData();
  schedulePatch();
  observeNode('championList');
  observeNode('compositionGrid');
  observeNode('analysisSummary');
  window.setInterval(schedulePatch, 1000);
}

init().catch(() => {});
