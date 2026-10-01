const STORY_ROOT_SELECTOR = '#storyView';
const LIMITS = {
  summary: 72,
  label: 22,
  value: 28,
  meta: 34,
  pill: 18,
};

let observer = null;
let rafId = null;

function getStoryRoot() {
  return document.querySelector(STORY_ROOT_SELECTOR);
}

function scheduleCompact() {
  if (rafId) return;
  rafId = window.requestAnimationFrame(() => {
    rafId = null;
    compactStory();
  });
}

function compactStory() {
  const root = getStoryRoot();
  if (!root) return;

  root.querySelectorAll('.composition-story__summary-copy').forEach((element) => {
    compactNodeText(element, LIMITS.summary, { preserveEllipsis: true });
  });

  root.querySelectorAll('.composition-story__summary-meta .story-pill').forEach((element) => {
    compactNodeText(element, LIMITS.pill);
  });

  root.querySelectorAll('.design-system-flow__label').forEach((element) => {
    compactNodeText(element, LIMITS.label);
  });

  root.querySelectorAll('.design-system-flow__value').forEach((element) => {
    compactNodeText(element, LIMITS.value, { preserveEllipsis: true });
  });

  root.querySelectorAll('.design-system-flow__meta').forEach((element) => {
    compactNodeText(element, LIMITS.meta, { preserveEllipsis: true });
  });

  root.querySelectorAll('.composition-story__mini-bar').forEach((element) => {
    compactBar(element);
  });
}

function compactNodeText(element, maxLength, options = {}) {
  if (!element) return;

  const fullText = element.dataset.fullText || element.textContent.trim();
  if (!element.dataset.fullText) {
    element.dataset.fullText = fullText;
  }

  const compactText = shortenText(fullText, maxLength, options);
  if (element.textContent.trim() !== compactText) {
    element.textContent = compactText;
  }

  if (fullText) {
    element.title = fullText;
  }
}

function compactBar(element) {
  if (!element) return;

  const fullText = element.dataset.fullText || element.textContent.trim();
  if (!element.dataset.fullText) {
    element.dataset.fullText = fullText;
  }

  const compactText = shortenBar(fullText);
  if (element.textContent.trim() !== compactText) {
    element.textContent = compactText;
  }

  if (fullText) {
    element.title = fullText;
  }
}

function shortenText(value, maxLength, options = {}) {
  const text = compactFragments(String(value || '').trim());
  if (!text) return '';
  if (text.length <= maxLength) return text;

  const sliceLength = Math.max(8, maxLength - 1);
  const trimmed = text.slice(0, sliceLength).trimEnd();
  return `${trimmed}${options.preserveEllipsis === false ? '' : '…'}`;
}

function compactFragments(value) {
  const fragments = String(value)
    .split(/\s*·\s*/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (fragments.length <= 1) {
    return String(value).replace(/\s+/g, ' ').trim();
  }

  return fragments.slice(0, 2).join(' · ');
}

function shortenBar(value) {
  const match = String(value || '').match(/([█░]+)\s+(\d+)%/);
  if (!match) return String(value || '').trim();

  const score = Number(match[2]) || 0;
  const filled = Math.round(Math.min(100, Math.max(0, score)) / 20);
  const empty = 5 - filled;
  return `${'█'.repeat(filled)}${'░'.repeat(empty)} ${score}%`;
}

function ensureObserver() {
  const root = getStoryRoot();
  if (!root || observer) return;

  observer = new MutationObserver(() => {
    scheduleCompact();
  });

  observer.observe(root, {
    childList: true,
    subtree: true,
  });
}

function init() {
  compactStory();
  ensureObserver();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      compactStory();
      ensureObserver();
    }, { once: true });
  }
}

init();

export {};
