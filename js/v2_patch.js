const ROLE_FILES = [
  { key: 'top', label: 'Top', file: './data/top.json' },
  { key: 'jungle', label: 'Jungla', file: './data/jungle.json' },
  { key: 'mid', label: 'Mid', file: './data/mid.json' },
  { key: 'botline', label: 'Botline', file: './data/bot.json' },
  { key: 'support', label: 'Support', file: './data/support.json' },
];

const roleData = new Map();
let patchScheduled = false;

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function getIdentityForChampion(roleKey, championName) {
  const roleRows = roleData.get(roleKey) || [];
  const normalizedName = normalizeText(championName);
  const row = roleRows.find((item) => normalizeText(item.champion) === normalizedName);
  return row
    ? {
        identity: String(row.identity || '').trim() || 'Sin definir',
        function: String(row.function || '').trim() || 'Sin definir',
      }
    : { identity: 'Sin definir', function: 'Sin definir' };
}

function getRoleKeyFromLabel(label) {
  const row = ROLE_FILES.find((entry) => entry.label === String(label || '').trim());
  return row?.key || 'top';
}

async function loadRoleData() {
  await Promise.all(
    ROLE_FILES.map(async ({ key, file }) => {
      try {
        const response = await fetch(file, { cache: 'reload' });
        if (!response.ok) {
          roleData.set(key, []);
          return;
        }

        const rows = await response.json();
        roleData.set(key, Array.isArray(rows) ? rows : []);
      } catch {
        roleData.set(key, []);
      }
    })
  );
}

function patchChampionList() {
  const list = document.getElementById('championList');
  const roleLabel = document.getElementById('pickerRoleLabel')?.textContent?.trim();
  const roleKey = getRoleKeyFromLabel(roleLabel);
  if (!list || !roleData.size) return;

  list.querySelectorAll('.champion-item').forEach((item) => {
    const title = item.querySelector('.champion-item__head strong')?.textContent?.trim();
    const body = item.querySelector('.champion-item__body');
    if (!title || !body) return;

    const { identity, function: champFunction } = getIdentityForChampion(roleKey, title);
    body.innerHTML = `
      <span class="champion-item__head">
        <strong>${escapeHtml(title)}</strong>
        ${item.querySelector('.champion-pill') ? `<span class="champion-pill">${escapeHtml(item.querySelector('.champion-pill').textContent.trim())}</span>` : ''}
      </span>
      <span class="champion-item__identity">${escapeHtml(identity)}</span>
      <span class="champion-item__function">${escapeHtml(champFunction)}</span>
    `;
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

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
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
