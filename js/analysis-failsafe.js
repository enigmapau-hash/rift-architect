import { runAnalysis } from './analysis/analysis-engine.js?v=115';
import { buildLastPickRecommendations } from './analysis/last-pick-engine.js?v=115';
import { loadComparisonSnapshots } from './analysis/comparison-store.js?v=115';
import { renderComparisonEmptyState, renderComparisonState } from './analysis/comparison-renderer.js?v=115';
import { buildAnalysisStory } from './analysis/story-engine.js?v=115';
import {
  renderAnalysisEmptyState,
  renderAnalysisStory,
  renderLastPickEmptyState,
  renderLastPickState,
} from './analysis/renderer-report.js?v=116';
import { compareCompositions } from './engine/comparisonEngine.js?v=115';

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
  snapshotKey: '',
  report: null,
  story: null,
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
  if (state.observer) state.observer.disconnect();
  state.observer = new MutationObserver(() => scheduleRender());
  state.observer.observe(node, { subtree: true, childList: true, attributes: true });
}

function handleCompositionChanged(event) {
  if (event?.detail?.selectedChampions) state.selectedChampions = event.detail.selectedChampions;
  if (event?.detail?.rolePools) state.rolePools = event.detail.rolePools;
  scheduleRender();
}

function scheduleRender() {
  if (state.scheduled) return;
  state.scheduled = true;
  requestAnimationFrame(() => {
    state.scheduled = false;
    renderStory();
  });
}

function renderStory() {
  const snapshot = captureCompositionSnapshot();
  if (!snapshot.length) {
    state.snapshotKey = '';
    state.report = null;
    state.story = null;
    renderAnalysisEmptyState(state.root);
    renderComparisonEmptyState(state.comparisonRoot);
    return;
  }

  const snapshotKey = buildSnapshotKey(snapshot);
  let report = state.snapshotKey === snapshotKey ? state.report : null;
  let story = state.snapshotKey === snapshotKey ? state.story : null;

  if (!report || !story) {
    report = runAnalysis(snapshot);
    story = buildAnalysisStory(report);
    state.snapshotKey = snapshotKey;
    state.report = report;
    state.story = story;
  }

  renderAnalysisStory(state.root, story);
  renderSecondaryPanel(snapshot, report, story);
}

function renderSecondaryPanel(snapshot, report, story) {
  const saved = loadComparisonSnapshots();
  const hasSavedComparison = Boolean(saved?.a?.champions?.length || saved?.b?.champions?.length);

  if (hasSavedComparison) {
    const comparison = compareCompositions(snapshot, saved.a?.champions || [], saved.b?.champions || []);
    if (comparison) {
      renderComparisonState(state.comparisonRoot, comparison);
      return;
    }
  }

  if (snapshot.length === 4) {
    const recommendations = buildLastPickRecommendations({ report, story, comparison: null, snapshot });
    if (recommendations?.bestPick) {
      renderLastPickState(state.comparisonRoot, recommendations);
      return;
    }
    renderLastPickEmptyState(state.comparisonRoot, recommendations || {});
    return;
  }

  renderComparisonEmptyState(state.comparisonRoot);
}

function captureCompositionSnapshot() {
  const slots = Array.from(document.querySelectorAll(SLOT_SELECTOR));
  const selected = slots
    .map((slot) => extractChampionFromSlot(slot))
    .filter(Boolean)
    .sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role));

  if (selected.length) {
    state.selectedChampions = selected;
    return selected;
  }

  if (Array.isArray(state.selectedChampions) && state.selectedChampions.length) {
    return state.selectedChampions;
  }

  return [];
}

function buildSnapshotKey(snapshot = []) {
  return snapshot
    .map((item) => [
      item.role,
      item.champion,
      item.identity,
      item.function,
      item.tempo,
      Array.isArray(item.strengths) ? item.strengths.join('|') : '',
      Array.isArray(item.weaknesses) ? item.weaknesses.join('|') : '',
    ].join('::'))
    .join('||');
}

function extractChampionFromSlot(slot) {
  const role = String(slot?.dataset?.role || slot?.dataset?.slot || '').trim();
  const champion = String(slot?.dataset?.champion || slot?.dataset?.name || slot?.querySelector('.slot__name')?.textContent || '').trim();
  if (!role || !champion) return null;

  return {
    role,
    champion,
    identity: String(slot?.dataset?.identity || '').trim(),
    function: String(slot?.dataset?.function || '').trim(),
    tempo: String(slot?.dataset?.tempo || '').trim(),
    strengths: safeList(slot?.dataset?.strengths),
    weaknesses: safeList(slot?.dataset?.weaknesses),
  };
}

function safeList(value) {
  return String(value || '')
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean);
}