const BACKDROP_SELECTOR = '#pickerBackdrop';
const CHAMPION_SELECTOR = '#championList .champion-item';

function blurActiveElementIfInsideBackdrop() {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement)) return;

  const backdrop = document.querySelector(BACKDROP_SELECTOR);
  if (!backdrop || !backdrop.contains(active)) return;

  active.blur();
}

function handlePotentialClose(event) {
  const target = event.target instanceof Element ? event.target.closest(CHAMPION_SELECTOR) : null;
  if (!target) return;
  blurActiveElementIfInsideBackdrop();
}

document.addEventListener('pointerdown', handlePotentialClose, true);
document.addEventListener('click', handlePotentialClose, true);
