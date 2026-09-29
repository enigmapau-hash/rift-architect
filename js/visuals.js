import './recommendations.js';

const ROLE_ACCENTS = {
  top: 'rgba(124, 140, 255, 0.28)',
  jungle: 'rgba(70, 211, 161, 0.28)',
  mid: 'rgba(255, 209, 138, 0.28)',
  botline: 'rgba(255, 122, 122, 0.28)',
  support: 'rgba(198, 155, 255, 0.28)',
};

let refreshScheduled = false;
let observerStarted = false;

function scheduleRefresh() {
  if (refreshScheduled) return;
  refreshScheduled = true;
  window.requestAnimationFrame(() => {
    refreshScheduled = false;
    enhancePage();
  });
}

function enhancePage() {
  enhanceSlots();
  enhanceChampionItems();
}

function enhanceSlots() {
  document.querySelectorAll('#compositionGrid .slot').forEach((button) => {
    if (button.dataset.visualEnhanced === '1') return;

    const name = button.querySelector('strong')?.textContent?.trim();
    if (!name || name.toLowerCase() === 'vacío') return;

    const role = normalizeRole(button.dataset.role);
    const portrait = createPortrait(name, role, 'slot');
    const existing = button.querySelector('.slot-portrait');
    if (!existing) {
      button.insertBefore(portrait, button.firstChild);
      button.classList.add('has-portrait');
      button.dataset.visualEnhanced = '1';
    }
  });
}

function enhanceChampionItems() {
  document.querySelectorAll('#championList .champion-item').forEach((button) => {
    const avatar = button.querySelector('.champion-avatar');
    const name = button.querySelector('strong')?.textContent?.trim();
    if (!avatar || !name || avatar.dataset.visualEnhanced === '1') return;

    avatar.textContent = '';
    avatar.appendChild(createPortrait(name, normalizeRole(button.dataset.role), 'avatar'));
    avatar.dataset.visualEnhanced = '1';
  });
}

function createPortrait(championName, role, variant) {
  const wrapper = document.createElement('span');
  wrapper.className = `champion-portrait champion-portrait--${variant}`;
  wrapper.style.setProperty('--portrait-accent', ROLE_ACCENTS[role] || 'rgba(124, 140, 255, 0.28)');

  const img = document.createElement('img');
  img.alt = '';
  img.decoding = 'async';
  img.loading = 'lazy';
  img.src = getChampionIconPath(championName);

  const fallback = document.createElement('span');
  fallback.className = 'champion-portrait-fallback';
  fallback.textContent = getChampionInitials(championName);

  img.addEventListener('load', () => {
    wrapper.classList.add('has-image');
  });

  img.addEventListener('error', () => {
    img.remove();
    wrapper.classList.remove('has-image');
  });

  wrapper.append(img, fallback);
  return wrapper;
}

function getChampionIconPath(championName) {
  return `./assets/champions/${slugifyChampionName(championName)}.webp`;
}

function slugifyChampionName(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getChampionInitials(name) {
  return String(name)
    .split(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || '?';
}

function normalizeRole(role) {
  const allowed = ['top', 'jungle', 'mid', 'botline', 'support'];
  return allowed.includes(role) ? role : 'top';
}

function startObserver() {
  if (observerStarted) return;
  observerStarted = true;

  const observer = new MutationObserver(() => {
    scheduleRefresh();
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    enhancePage();
    startObserver();
  });
} else {
  enhancePage();
  startObserver();
}
