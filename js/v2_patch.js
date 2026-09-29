const ROLE_FILES = [
  './data/top.json',
  './data/jungle.json',
  './data/mid.json',
  './data/bot.json',
  './data/support.json',
];

const recommendationEl = document.getElementById('recommendations');
if (recommendationEl) {
  recommendationEl.style.display = 'none';
}

const identityMap = new Map();
let patchScheduled = false;

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
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

    const identity = identityMap.get(normalizeText(title));
    if (identity) {
      sub.textContent = identity;
    }
  });
}

function patchRecommendationsVisibility() {
  const el = document.getElementById('recommendations');
  if (el) {
    el.style.display = 'none';
  }
}

function schedulePatch() {
  if (patchScheduled) return;
  patchScheduled = true;
  window.requestAnimationFrame(() => {
    patchScheduled = false;
    patchRecommendationsVisibility();
    patchChampionList();
  });
}

function observeChampionList() {
  const list = document.getElementById('championList');
  if (!list) {
    window.requestAnimationFrame(observeChampionList);
    return;
  }

  const observer = new MutationObserver(schedulePatch);
  observer.observe(list, { childList: true, subtree: true, characterData: true });
}

async function init() {
  await loadIdentities();
  schedulePatch();
  observeChampionList();
  window.setInterval(schedulePatch, 1000);
}

init().catch(() => {});
