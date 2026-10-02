import { runAnalysis } from './analysis/analysis-engine.js';
import { buildLastPickRecommendations } from './analysis/last-pick-engine.js';
import { loadComparisonSnapshots } from './analysis/comparison-store.js';
import { renderComparisonEmptyState, renderComparisonState } from './analysis/comparison-renderer.js';
import { buildAnalysisStory } from './analysis/story-engine.js';
import {
  renderAnalysisEmptyState,
  renderAnalysisStory,
  renderLastPickEmptyState,
  renderLastPickState,
} from './analysis/renderer.js?v=83';
import { compareCompositions } from './engine/comparisonEngine.js';

const ROOT_ID = 'analysisHubExecutiveSummary';
const COMPARISON_ROOT_ID = 'analysisHubComparison';
const ROLE_ORDER = ['top', 'jungle', 'mid', 'botline', 'support'];
const SLOT_SELECTOR = '#compositionGrid .slot.is-filled';

const state = {
  root: null,
  comparisonRoot: null,
  observer: null,
  scheduled: false,
  selectedChampions: [],
  rolePools: {},
};

globalThis.renderAnalysisStory = renderStory;

init().catch((error) => console.error(error));

async function init() {
  const storyView = document.getElementById('storyView');
  const comparisonView = document.getElementById('comparisonView');
  const compositionGrid = document.getElementById('compositionGrid');
  if (!storyView || !comparisonView || !compositionGrid) return;

  mountRoot(storyView);
  mountComparisonRoot(comparisonView);
  observeComposition(compositionGrid);

  window.addEventListener('rift-architect:composition-changed', handleCompositionChanged);
  window.addEventListener('rift-architect:comparison-changed', scheduleRender);
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

function mountComparisonRoot(comparisonView) {
  const existing = document.getElementById(COMPARISON_ROOT_ID);
  if (existing) {
    state.comparisonRoot = existing;
    return;
  }

  const root = document.createElement('section');
  root.id = COMPARISON_ROOT_ID;
  root.className = 'analysis-hub analysis-hub--cards analysis-hub--comparison';
  root.setAttribute('aria-live', 'polite');
  comparisonView.replaceChildren(root);
  state.comparisonRoot = root;
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
  } else {
    const analysis = runAnalysis(selectedChampions);
    const story = buildAnalysisStory(analysis);

    if (selectedChampions.length === 4) {
      const recommendation = buildLastPickRecommendations(
        {
          ...analysis,
          selectedChampions,
        },
        rolePools
      );

      if (!recommendation) {
        renderLastPickEmptyState(state.root, story);
      } else {
        renderLastPickState(state.root, {
          ...story,
          ...recommendation,
        });
      }
    } else {
      renderAnalysisStory(state.root, story);
    }
  }

  renderComparisonPanel();
}

function renderComparisonPanel() {
  if (!state.comparisonRoot) return;

  const snapshots = loadComparisonSnapshots();
  if (!snapshots.a || !snapshots.b) {
    renderComparisonEmptyState(state.comparisonRoot, snapshots);
    return;
  }

  const comparison = compareCompositions(snapshots.a.selectedChampions || [], snapshots.b.selectedChampions || []);
  renderComparisonState(state.comparisonRoot, {
    left: snapshots.a,
    right: snapshots.b,
    comparison,
  });
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
