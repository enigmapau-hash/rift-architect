import { runAnalysis } from './analysis/analysis-engine.js';
import { buildLastPickRecommendations } from './analysis/last-pick-engine.js';
import { buildAnalysisStory } from './analysis/story-engine.js';
import {
  renderAnalysisEmptyState,
  renderAnalysisStory,
  renderLastPickEmptyState,
  renderLastPickState,
} from './analysis/renderer.js';

const ROOT_ID = 'analysisHubExecutiveSummary';
const ROLE_ORDER = ['top', 'jungle', 'mid', 'botline', 'support'];
const SLOT_SELECTOR = '#compositionGrid .slot.is-filled';

const state = {
  root: null,
  observer: null,
  scheduled: false,
  selectedChampions: [],
  rolePools: {},
};

globalThis.renderAnalysisStory = renderStory;

init().catch((error) => console.error(error));

async function init() {
  const storyView = document.getElementById('storyView');
  const compositionGrid = document.getElementById('compositionGrid');
  if (!storyView || !compositionGrid) return;

  mountRoot(storyView);
  observeComposition(compositionGrid);

  window.addEventListener('rift-architect:composition-changed', handleCompositionChanged);
  window.addEventListener('storage', scheduleRender);
  window.addEventListener('resize', scheduleRender, { passive: true });

  renderStory();
}

function mountRoot(storyView) {
  const existing = document.getElementById(ROOT_ID);
  if (existing) {
    state.root = existing;
    return;
  }

  const root = document.createElement('section');
  root.id = ROOT_ID;
  root.className = 'analysis-hub analysis-hub--cards analysis-hub--main-story';
  root.setAttribute('aria-live', 'polite');
  storyView.replaceChildren(root);
  state.root = root;
}

function observeComposition(node) {
  if (state.observer) return;

  state.observer = new MutationObserver(scheduleRender);
  state.observer.observe(node, { childList: true, subtree: true, characterData: true });
}

function handleCompositionChanged(event) {
  const selectedChampions = Array.isArray(event?.detail?.selectedChampions) ? event.detail.selectedChampions : [];
  state.selectedChampions = selectedChampions;
  state.rolePools = event?.detail?.rolePools || state.rolePools || globalThis.__RIFT_ARCHITECT_ROLE_POOLS__ || {};
  scheduleRender();
}

function scheduleRender() {
  if (state.scheduled) return;
  state.scheduled = true;

  window.requestAnimationFrame(() => {
    state.scheduled = false;
    renderStory();
  });
}

function renderStory() {
  if (!state.root) return;

  const selectedChampions = getSelectedChampions();
  const rolePools = state.rolePools || globalThis.__RIFT_ARCHITECT_ROLE_POOLS__ || {};
  state.selectedChampions = selectedChampions;

  if (selectedChampions.length < 4) {
    renderAnalysisEmptyState(state.root);
    return;
  }

  const analysis = runAnalysis(selectedChampions);
  const story = buildAnalysisStory(analysis);

  if (selectedChampions.length === 4) {
    const recommendation = buildLastPickRecommendations({
      ...analysis,
      selectedChampions,
    }, rolePools);

    if (!recommendation) {
      renderLastPickEmptyState(state.root, story);
      return;
    }

    renderLastPickState(state.root, {
      ...story,
      ...recommendation,
    });
    return;
  }

  renderAnalysisStory(state.root, story);
}

function getSelectedChampions() {
  if (Array.isArray(state.selectedChampions) && state.selectedChampions.length) {
    return state.selectedChampions;
  }

  if (Array.isArray(globalThis.__RIFT_ARCHITECT_SELECTED__) && globalThis.__RIFT_ARCHITECT_SELECTED__.length) {
    return globalThis.__RIFT_ARCHITECT_SELECTED__;
  }

  return [...document.querySelectorAll(SLOT_SELECTOR)]
    .map((slot, index) => {
      const champion = slot.querySelector('.slot__name')?.textContent?.trim() || '';
      if (!champion) return null;

      return {
        role: String(slot.dataset.role || ROLE_ORDER[index] || 'top'),
        champion,
        identity: slot.querySelector('.slot__meta')?.textContent?.trim() || '',
        function: '',
        tempo: '',
        strengths: [],
        weaknesses: [],
      };
    })
    .filter(Boolean);
}
