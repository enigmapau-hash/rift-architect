const MODAL_BACKDROP_SELECTOR = '#pickerBackdrop';
const MODAL_BUTTON_SELECTORS = [
  '#closePickerBtn',
  '#championList .champion-item[data-action="select"]',
  '#compositionGrid .slot[data-role]',
];

function isElement(value) {
  return value instanceof Element;
}

function isPickerOpen() {
  const backdrop = document.querySelector(MODAL_BACKDROP_SELECTOR);
  return Boolean(backdrop && !backdrop.classList.contains('is-hidden'));
}

function findActionableElementFromPoint(x, y) {
  const stack = document.elementsFromPoint(x, y);
  for (const node of stack) {
    if (!isElement(node)) continue;

    for (const selector of MODAL_BUTTON_SELECTORS) {
      if (node.matches(selector)) return node;
      const match = node.closest(selector);
      if (match) return match;
    }
  }

  return null;
}

function handleDocumentClick(event) {
  if (!event.isTrusted || !isPickerOpen()) return;

  const backdrop = document.querySelector(MODAL_BACKDROP_SELECTOR);
  if (!backdrop) return;

  const target = isElement(event.target) ? event.target : null;
  const insidePicker = Boolean(target && (target === backdrop || target.closest(MODAL_BACKDROP_SELECTOR)));
  if (!insidePicker) return;

  const actionable = findActionableElementFromPoint(event.clientX, event.clientY);
  if (!actionable) return;

  const button = actionable.closest('button') || actionable;
  if (!button || typeof button.click !== 'function') return;

  event.preventDefault();
  event.stopPropagation();
  button.click();
}

function initModalFix() {
  document.addEventListener('click', handleDocumentClick, true);
}

initModalFix();
