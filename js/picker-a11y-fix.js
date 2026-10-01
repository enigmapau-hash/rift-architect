const PICKER_SELECTORS = ['#closePickerBtn', '#pickerBackdrop'];

function blurActiveElement() {
  const active = document.activeElement;
  if (active instanceof HTMLElement && active !== document.body) {
    active.blur();
  }
}

document.addEventListener(
  'click',
  (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    if (PICKER_SELECTORS.some((selector) => target.closest(selector))) {
      blurActiveElement();
    }
  },
  true,
);

document.addEventListener(
  'keydown',
  (event) => {
    if (event.key === 'Escape') {
      blurActiveElement();
    }
  },
  true,
);
