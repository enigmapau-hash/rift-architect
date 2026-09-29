const ROLE_FILES = [
  './data/top.json',
  './data/jungle.json',
  './data/mid.json',
  './data/bot.json',
  './data/support.json',
];

const identityMap = new Map();
let patchScheduled = false;

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function getIdentityForName(name) {
  const normalized = normalizeText(name);
  return identityMap.get(normalized) || null;
}

async function loadIdentities() {
  const responses = await Promise.all(
    ROLE_FILES.map(async (file) => {
      try {
        const response = await fetch(file, { cache: 'reload' });
        if (!response.ok) return [];
        return await response.json();
      } catch {
        return [];
      }
    })
  );

  responses.flat().forEach((champion) => {
    const name = String(champion?.champion || '').trim();
    const identity = String(champion?.identity || '').trim();
    if (!name || !identity) return;

    identityMap.set(normalizeText(name), identity);
    identityMap.set(normalizeText(name.replace(/\s+/g, '')), identity);
  });
}

function patchChampionList() {
  const list = document.getElementById('championList');
  if (!list || !identityMap.size) return;

  list.querySelectorAll('.champion-item').forEach((item) => {
    const title = item.querySelector('.champion-item__head strong')?.textContent?.trim();
    const sub = item.querySelector('.champion-item__sub');
    if (!title || !sub) return;

    const identity = getIdentityForName(title);
    if (identity) {
      sub.textContent = identity;
      sub.classList.add('champion-item__sub--identity');
    }
  });
}

function patchCompositionGrid() {
  const grid = document.getElementById('compositionGrid');
  if (!grid || !identityMap.size) return;

  grid.querySelectorAll('.slot.is-filled').forEach((slot) => {
    const title = slot.querySelector('.slot__name')?.textContent?.trim();
    const meta = slot.querySelector('.slot__meta');
    if (!title || !meta) return;

    const identity = getIdentityForName(title);
    if (identity) {
      meta.textContent = identity;
      meta.classList.add('slot__meta--identity');
    }
  });
}

function removeRecommendationsBlock() {
  const el = document.getElementById('recommendations');
  if (el) {
    el.remove();
  }
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
  await loadIdentities();
  schedulePatch();
  observeNode('championList');
  observeNode('compositionGrid');
  observeNode('analysisSummary');
  window.setInterval(schedulePatch, 1000);
}

init().catch(() => {});
