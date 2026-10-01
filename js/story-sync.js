const DRAFT_KEY = 'rift-architect:draft-v2';
let lastSignature = '';

function getSignature() {
  try {
    return localStorage.getItem(DRAFT_KEY) || '';
  } catch {
    return '';
  }
}

function triggerRender() {
  if (typeof globalThis.renderAnalysisStory !== 'function') return;
  try {
    globalThis.renderAnalysisStory();
  } catch (error) {
    console.error(error);
  }
}

function syncStory() {
  const signature = getSignature();
  if (signature === lastSignature) return;
  lastSignature = signature;
  triggerRender();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', syncStory, { once: true });
} else {
  syncStory();
}

window.addEventListener('storage', syncStory);
setInterval(syncStory, 250);
