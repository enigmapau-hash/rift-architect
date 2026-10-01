const STORY_VIEW_SELECTOR = '#storyView';
const CARD_SELECTOR = 'details[data-accordion-card]';

let initialized = false;
let mutationObserver = null;

init();

function init() {
  const storyView = document.querySelector(STORY_VIEW_SELECTOR);
  if (!storyView) {
    window.requestAnimationFrame(init);
    return;
  }

  if (initialized) return;
  initialized = true;

  storyView.addEventListener('toggle', handleToggle, true);
  normalizeCards(storyView);

  mutationObserver = new MutationObserver(() => normalizeCards(storyView));
  mutationObserver.observe(storyView, { childList: true, subtree: true });
}

function handleToggle(event) {
  const card = event.target;
  if (!(card instanceof HTMLDetailsElement) || !card.matches(CARD_SELECTOR)) return;

  const storyView = card.closest(STORY_VIEW_SELECTOR);
  if (!storyView) return;

  if (card.open) {
    [...storyView.querySelectorAll(CARD_SELECTOR)].forEach((other) => {
      if (other !== card) other.open = false;
    });
  }

  normalizeCards(storyView);
}

function normalizeCards(storyView) {
  const cards = [...storyView.querySelectorAll(CARD_SELECTOR)];
  let openFound = false;

  cards.forEach((card) => {
    const summary = card.querySelector(':scope > summary');
    if (summary) {
      summary.setAttribute('aria-expanded', String(card.open));
    }

    if (!card.open) return;

    if (!openFound) {
      openFound = true;
      return;
    }

    card.open = false;
    if (summary) summary.setAttribute('aria-expanded', 'false');
  });
}
