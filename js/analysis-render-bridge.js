const GRID_SELECTOR = '#compositionGrid';
let observer = null;
let rafId = null;

function renderAnalysis() {
  if (typeof globalThis.renderAnalysisStory !== 'function') return;

  try {
    globalThis.renderAnalysisStory();
  } catch (error) {
    console.error(error);
  }
}

function scheduleRender() {
  if (rafId) return;
  rafId = window.requestAnimationFrame(() => {
    rafId = null;
    renderAnalysis();
  });
}

function observeGrid() {
  const grid = document.querySelector(GRID_SELECTOR);
  if (!grid) {
    window.requestAnimationFrame(observeGrid);
    return;
  }

  if (!observer) {
    observer = new MutationObserver(scheduleRender);
    observer.observe(grid, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  scheduleRender();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', observeGrid, { once: true });
} else {
  observeGrid();
}

window.addEventListener('storage', scheduleRender);
setInterval(scheduleRender, 500);
