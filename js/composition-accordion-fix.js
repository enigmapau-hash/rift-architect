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

  storyView.addEventListener('click', handleClick, true);
  storyView.addEventListener('keydown', handleKeydown, true);
  normalizeCards(storyView);

  mutationObserver = new MutationObserver(() => normalizeCards(storyView));
  mutationObserver.observe(storyView, { childList: true, subtree: true });
}

function handleClick(event) {
  const summary = event.target.closest(`${CARD_SELECTOR} > summary`);
  if (!summary) return;

  const card = summary.parentElement;
  if (!(card instanceof HTMLDetailsElement)) return;

  event.preventDefault();
  toggleCard(card);
}

function handleKeydown(event) {
  if (event.key !== 'Enter' && event.key !== ' ') return;

  const summary = event.target.closest(`${CARD_SELECTOR} > summary`);
  if (!summary) return;

  const card = summary.parentElement;
  if (!(card instanceof HTMLDetailsElement)) return;

  event.preventDefault();
  toggleCard(card);
}

function toggleCard(card) {
  const storyView = card.closest(STORY_VIEW_SELECTOR);
  if (!storyView) return;

  const cards = [...storyView.querySelectorAll(CARD_SELECTOR)];
  const shouldOpen = !card.open;

  cards.forEach((other) => {
    other.open = other === card && shouldOpen;
  });

  normalizeCards(storyView);
}

function normalizeCards(storyView) {
  const cards = [...storyView.querySelectorAll(CARD_SELECTOR)];
  let openFound = false;

  cards.forEach((card) => {
    const summary = card.querySelector(':scope > summary');
    if (!summary) return;

    summary.setAttribute('role', 'button');
    summary.setAttribute('tabindex', '0');
    summary.setAttribute('aria-expanded', String(card.open));

    if (!card.open) return;

    if (!openFound) {
      openFound = true;
      return;
    }

    card.open = false;
    summary.setAttribute('aria-expanded', 'false');
  });
}
