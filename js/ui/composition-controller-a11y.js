import { ROLE_LABELS, normalizeRole } from '../core/draft-state.js?v=112';
import { createCompositionController as createBaseCompositionController } from './composition-controller.js?v=112';

export function createCompositionController(options = {}) {
  const base = createBaseCompositionController(options);
  const state = options.state || {};

  let listenersBound = false;
  let lastPickerTrigger = null;
  let modalWasOpen = false;
  let rafId = 0;
  let observer = null;

  function cacheElements() {
    base.cacheElements();
    scheduleAccessibilitySync();
  }

  function bindEvents(handlers = {}) {
    base.bindEvents(handlers);

    if (listenersBound) return;
    listenersBound = true;

    document.addEventListener('click', capturePickerTrigger, true);
    document.addEventListener('keydown', handleDocumentKeydown, true);
    window.addEventListener('resize', scheduleAccessibilitySync, { passive: true });

    const compositionGrid = document.getElementById('compositionGrid');
    const pickerBackdrop = document.getElementById('pickerBackdrop');
    observer = new MutationObserver(scheduleAccessibilitySync);

    if (compositionGrid) {
      observer.observe(compositionGrid, { subtree: true, childList: true, attributes: true });
    }

    if (pickerBackdrop) {
      observer.observe(pickerBackdrop, { subtree: true, childList: true, attributes: true });
    }

    scheduleAccessibilitySync();
  }

  function renderAll() {
    base.renderAll();
    scheduleAccessibilitySync();
  }

  function renderCompositionGrid() {
    base.renderCompositionGrid();
    scheduleAccessibilitySync();
  }

  function renderModal() {
    base.renderModal();
    scheduleAccessibilitySync();
  }

  function renderChampionList() {
    base.renderChampionList();
    scheduleAccessibilitySync();
  }

  function openPicker(role) {
    base.openPicker(role);
    scheduleAccessibilitySync();
  }

  function closePicker(skipRender = true) {
    base.closePicker(skipRender);
    scheduleAccessibilitySync();
  }

  function selectChampion(role, championName) {
    base.selectChampion(role, championName);
    scheduleAccessibilitySync();
  }

  function clearSelection(options = {}) {
    base.clearSelection(options);
    scheduleAccessibilitySync();
  }

  function scheduleAccessibilitySync() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      rafId = 0;
      applyAccessibilityAnnotations();
      syncModalFocusState();
    });
  }

  function applyAccessibilityAnnotations() {
    annotateCompositionSlots();
    annotatePicker();
    annotateChampionRows();
  }

  function annotateCompositionSlots() {
    const buttons = document.querySelectorAll('#compositionGrid button[data-role]');

    buttons.forEach((button) => {
      const role = normalizeRole(button.dataset.role || '');
      const roleLabel = ROLE_LABELS[role] || role;
      const championName = cleanText(button.querySelector('.slot__name')?.textContent || '');
      const slotSummary = cleanText(button.querySelector('.slot__submeta')?.textContent || button.querySelector('.slot__meta')?.textContent || '');
      const isFilled = button.classList.contains('is-filled') && championName && championName !== 'Vacío';
      const label = isFilled
        ? `Cambiar ${roleLabel}: ${championName}. ${slotSummary || 'Abrir selector de campeones.'}`
        : `Seleccionar ${roleLabel}. Slot vacío.`;

      button.setAttribute('aria-haspopup', 'dialog');
      button.setAttribute('aria-controls', 'pickerBackdrop');
      button.setAttribute('aria-expanded', String(Boolean(state?.pickerOpen && state.activeRole === role)));
      button.setAttribute('aria-label', label);
      button.setAttribute('title', label);
    });
  }

  function annotatePicker() {
    const backdrop = document.getElementById('pickerBackdrop');
    const hint = document.getElementById('pickerHint');
    const closeBtn = document.getElementById('closePickerBtn');
    const searchInput = document.getElementById('searchInput');
    const championList = document.getElementById('championList');

    if (backdrop) {
      backdrop.setAttribute('aria-modal', 'true');
      backdrop.setAttribute('aria-describedby', 'pickerHint');
      backdrop.setAttribute('aria-hidden', String(!state.pickerOpen));
    }

    if (hint) {
      hint.setAttribute('aria-live', 'polite');
      hint.setAttribute('aria-atomic', 'true');
    }

    if (closeBtn) {
      closeBtn.setAttribute('aria-label', 'Cerrar selector de campeones');
    }

    if (searchInput) {
      searchInput.setAttribute('aria-label', 'Buscar campeón');
      searchInput.setAttribute('aria-controls', 'championList');
    }

    if (championList) {
      championList.setAttribute('aria-label', 'Listado de campeones disponibles');
    }
  }

  function annotateChampionRows() {
    const rows = document.querySelectorAll('#championList button[data-action="select"]');

    rows.forEach((button) => {
      const championName = cleanText(button.dataset.champion || button.querySelector('.champion-item__head strong')?.textContent || '');
      const subline = cleanText(button.querySelector('.champion-item__sub')?.textContent || '');
      const pressed = button.getAttribute('aria-pressed') === 'true';
      const label = pressed
        ? `Seleccionado ${championName}. ${subline || 'Elemento activo.'}`
        : `Elegir ${championName}. ${subline || 'Opción disponible.'}`;

      button.setAttribute('aria-label', label);
      button.setAttribute('title', label);
      button.setAttribute('aria-keyshortcuts', 'Enter Space ArrowUp ArrowDown Home End');
    });
  }

  function syncModalFocusState() {
    const isOpen = Boolean(state.pickerOpen);

    if (isOpen && !modalWasOpen) {
      focusModalStart();
    } else if (!isOpen && modalWasOpen) {
      restorePickerTriggerFocus();
    }

    modalWasOpen = isOpen;
  }

  function focusModalStart() {
    const searchInput = document.getElementById('searchInput');
    const firstRow = getChampionRows()[0] || document.getElementById('closePickerBtn');

    if (searchInput) {
      searchInput.focus({ preventScroll: true });
      if (typeof searchInput.select === 'function') {
        searchInput.select();
      }
      return;
    }

    firstRow?.focus?.({ preventScroll: true });
  }

  function restorePickerTriggerFocus() {
    if (lastPickerTrigger && document.contains(lastPickerTrigger)) {
      lastPickerTrigger.focus({ preventScroll: true });
      return;
    }

    const firstSlot = document.querySelector('#compositionGrid button[data-role]');
    firstSlot?.focus?.({ preventScroll: true });
  }

  function capturePickerTrigger(event) {
    const trigger = event.target instanceof Element ? event.target.closest('button[data-role]') : null;
    if (trigger) {
      lastPickerTrigger = trigger;
    }
  }

  function handleDocumentKeydown(event) {
    if (!state.pickerOpen) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      base.closePicker();
      return;
    }

    if (event.key === 'Tab') {
      trapFocus(event);
      return;
    }

    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      handleChampionNavigation(event);
    }
  }

  function trapFocus(event) {
    const backdrop = document.getElementById('pickerBackdrop');
    if (!backdrop) return;

    const focusable = getFocusableElements(backdrop);
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus({ preventScroll: true });
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus({ preventScroll: true });
    }
  }

  function handleChampionNavigation(event) {
    const rows = getChampionRows();
    if (!rows.length) return;

    const searchInput = document.getElementById('searchInput');
    const active = document.activeElement;
    const index = rows.indexOf(active instanceof HTMLButtonElement ? active : null);

    if (active === searchInput) {
      if (event.key === 'ArrowDown' || event.key === 'End') {
        event.preventDefault();
        rows[0].focus({ preventScroll: true });
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        rows[rows.length - 1].focus({ preventScroll: true });
      }
      return;
    }

    if (index < 0) return;

    let nextIndex = index;
    if (event.key === 'ArrowDown') nextIndex = Math.min(rows.length - 1, index + 1);
    if (event.key === 'ArrowUp') nextIndex = Math.max(0, index - 1);
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = rows.length - 1;

    if (nextIndex !== index) {
      event.preventDefault();
      rows[nextIndex].focus({ preventScroll: true });
    }
  }

  function getChampionRows() {
    return Array.from(document.querySelectorAll('#championList button[data-action="select"]'));
  }

  function getFocusableElements(root) {
    return Array.from(
      root.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      )
    ).filter((element) => element instanceof HTMLElement && element.offsetParent !== null);
  }

  function cleanText(value) {
    return String(value ?? '').trim().replace(/\s+/g, ' ');
  }

  return {
    ...base,
    cacheElements,
    bindEvents,
    renderAll,
    renderCompositionGrid,
    renderModal,
    renderChampionList,
    openPicker,
    closePicker,
    selectChampion,
    clearSelection,
  };
}
