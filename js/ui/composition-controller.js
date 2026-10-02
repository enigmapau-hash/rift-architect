import { normalizeText } from '../analyzer.js';
import {
  ICON_ALIASES,
  ROLE_LABELS,
  ROLE_ORDER,
  ROLE_SHEETS,
  getSelectedChampions,
  normalizeRole,
  saveDraft,
} from '../core/draft-state.js';
import { syncAnalysisStory } from '../analysis/story-sync.js';

export function createCompositionController({ state } = {}) {
  if (!state) throw new Error('Composition controller requires state');

  const els = {};

  function cacheElements() {
    els.buildBadge = document.getElementById('buildBadge');
    els.refreshBtn = document.getElementById('refreshBtn');
    els.clearBtn = document.getElementById('clearBtn');
    els.compositionGrid = document.getElementById('compositionGrid');
    els.pickerBackdrop = document.getElementById('pickerBackdrop');
    els.pickerRoleLabel = document.getElementById('pickerRoleLabel');
    els.pickerTitle = document.getElementById('pickerTitle');
    els.closePickerBtn = document.getElementById('closePickerBtn');
    els.searchInput = document.getElementById('searchInput');
    els.championList = document.getElementById('championList');
    els.pickerHint = document.getElementById('pickerHint');
  }

  function bindEvents({ onRefreshData } = {}) {
    els.refreshBtn?.addEventListener('click', async () => {
      if (typeof onRefreshData === 'function') {
        await onRefreshData();
      }
      renderAll();
    });

    els.clearBtn?.addEventListener('click', () => {
      clearSelection();
    });

    els.closePickerBtn?.addEventListener('click', closePicker);

    els.pickerBackdrop?.addEventListener('click', (event) => {
      if (event.target === els.pickerBackdrop) closePicker();
    });

    els.searchInput?.addEventListener('input', (event) => {
      state.search = String(event.target.value || '').trim().toLowerCase();
      renderChampionList();
    });

    els.compositionGrid?.addEventListener('click', (event) => {
      const button = event.target instanceof Element ? event.target.closest('button[data-role]') : null;
      if (!button) return;
      openPicker(button.dataset.role);
    });

    els.championList?.addEventListener('click', (event) => {
      const button = event.target instanceof Element ? event.target.closest('button[data-action="select"]') : null;
      if (!button) return;
      const { role, champion } = button.dataset;
      if (!role || !champion) return;
      selectChampion(role, champion);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && state.pickerOpen) closePicker();
    });
  }

  function renderAll() {
    renderCompositionGrid();
    renderModal();
    syncStory();
  }

  function clearSelection() {
    state.selected = Object.fromEntries(ROLE_ORDER.map((role) => [role, null]));
    state.activeRole = 'top';
    state.search = '';
    closePicker(false);
    persistDraft();
    renderAll();
  }

  function openPicker(role) {
    state.activeRole = normalizeRole(role);
    state.search = '';
    if (els.searchInput) els.searchInput.value = '';
    state.pickerOpen = true;
    persistDraft();
    renderAll();
  }

  function closePicker(skipRender = true) {
    state.pickerOpen = false;
    state.search = '';
    if (els.searchInput) els.searchInput.value = '';
    if (skipRender) renderAll();
  }

  function selectChampion(role, championName) {
    const roleKey = normalizeRole(role);
    const champion = (state.data?.[roleKey] || []).find((item) => item.champion === championName);
    if (!champion) return;

    state.selected[roleKey] = champion;
    state.activeRole = roleKey;
    state.search = '';
    persistDraft();
    closePicker(false);
    renderAll();
  }

  function renderCompositionGrid() {
    if (!els.compositionGrid) return;

    els.compositionGrid.innerHTML = '';

    ROLE_SHEETS.forEach(({ key, label }) => {
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

  function renderModal() {
    const isOpen = state.pickerOpen;
    els.pickerBackdrop?.classList.toggle('is-hidden', !isOpen);
    els.pickerBackdrop?.setAttribute('aria-hidden', String(!isOpen));
    document.body.classList.toggle('modal-open', isOpen);
    if (!isOpen) return;

    if (els.pickerRoleLabel) els.pickerRoleLabel.textContent = ROLE_LABELS[state.activeRole] || '';
    if (els.pickerTitle) {
      els.pickerTitle.textContent = state.selected[state.activeRole]?.champion
        ? `Cambiar ${ROLE_LABELS[state.activeRole]}`
        : `Seleccionar ${ROLE_LABELS[state.activeRole]}`;
    }
    if (els.pickerHint) els.pickerHint.textContent = 'Busca y elige. Cierra con ESC o tocando fuera.';

    renderChampionList();

    window.requestAnimationFrame(() => {
      els.searchInput?.focus();
      els.searchInput?.select();
    });
  }

  function renderChampionList() {
    if (!els.championList) return;

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

  function syncStory() {
    syncAnalysisStory({
      selectedChampions: getSelectedChampions(state),
      activeRole: state.activeRole,
    });
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

  function renderAvatarMarkup(name, size = 'avatar--md') {
    const iconUrl = getChampionIconUrl(name);
    const initials = escapeHtml(getChampionInitials(name));

    if (!iconUrl) {
      return `<span class="avatar ${size} avatar--fallback">${initials}</span>`;
    }

    return `
      <span class="avatar ${size}" data-loaded="0">
        <img src="${escapeHtml(iconUrl)}" alt="" loading="lazy" onload="this.parentElement.dataset.loaded='1'" onerror="this.remove(); this.parentElement.dataset.error='1'" />
        <span class="avatar__fallback">${initials}</span>
      </span>
    `;
  }

  function getChampionIconUrl(name) {
    const iconId = getChampionIconId(name);
    if (!iconId || !state.iconCatalog?.version) return null;
    return `https://ddragon.leagueoflegends.com/cdn/${state.iconCatalog.version}/img/champion/${iconId}.png`;
  }

  function getChampionIconId(name) {
    const normalizedName = normalizeText(name);
    const canonicalName = ICON_ALIASES[normalizedName] || name;
    const normalizedCanonical = normalizeText(canonicalName);
    return state.iconCatalog?.map?.[normalizedCanonical] || state.iconCatalog?.map?.[normalizedName] || null;
  }

  function getChampionInitials(name) {
    return (
      String(name)
        .split(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join('') || '?'
    );
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  return {
    cacheElements,
    bindEvents,
    renderAll,
    clearSelection,
    openPicker,
    closePicker,
    selectChampion,
    renderCompositionGrid,
    renderModal,
    renderChampionList,
  };
}
